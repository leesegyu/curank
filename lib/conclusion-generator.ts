/**
 * STEP 5 결론 생성기
 * 6 Factor 점수 + 추천 키워드를 GPT-4o mini에 넘겨
 * 플랫폼별 상품 제목 + 태그 조합 2~6개를 생성
 */

import OpenAI from "openai";
import type { FactorScoreSet } from "./factor-model";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface TitleTagCombo {
  strategy: string;        // "상위 노출 집중", "수익성 집중" 등
  title: string;           // 플랫폼 규격에 맞는 상품 제목
  tags: string[];          // 태그 10개
  reasoning: string;       // 한줄 해석 (6 Factor 강점 기반)
  highlightFactor: string; // 가장 강한 factor key
}

export interface ConclusionResult {
  combinations: TitleTagCombo[];
}

interface ConclusionInput {
  keyword: string;
  platform: "naver" | "coupang";
  factorScores: FactorScoreSet;
  recommendedKeywords: { keyword: string; score: number }[];
  opportunityKeywords?: { keyword: string; scoreChance: number }[]; // 기회분석 상위 키워드
  creativeKeyword?: string; // 크리에이티브 발굴 top1 키워드 (마지막 안에 포함)
  // ── STEP 4 최종 후보 비교 Top (종합점수 1위) ──
  topAggregatedKeyword?: {
    keyword: string;
    overallScore: number;
    topFactorKey: string;   // ranking, conversion 등
    topFactorScore: number;
  };
  // ── 세부 유형(합성어) Top1 ──
  topVariantKeyword?: string;
}

/**
 * 플랫폼 규칙 — OpenAI 프롬프트 캐싱을 위해 system 메시지로 분리
 * (고정된 내용 → 캐시 히트율 극대화)
 */
const PLATFORM_RULES: Record<string, string> = {
  naver: `당신은 스마트스토어 상품 등록 전문가입니다.
[스마트스토어 규칙]
- 상품 제목: 50자 이내 (공백 포함)
- 앞 25자 안에 핵심 키워드를 반드시 배치 (검색 가중치 높음)
- 태그: 10개 (각 태그는 검색 키워드 역할)
- 제목에 특수문자 남용 금지, 자연스러운 상품명
[출력 규약]
- 반드시 JSON만 출력 (다른 텍스트 금지)
- highlightFactor는 반드시 다음 중 하나: ranking, conversion, growth, profitability, entryBarrier, crossPlatform
- 제목/태그에 쓰는 모든 키워드는 시드 키워드와 의미적으로 자연스럽게 어울려야 함 (어색한 수식어 조합 금지)`,

  coupang: `당신은 쿠팡 상품 등록 전문가입니다.
[쿠팡 규칙]
- 상품 제목: 100자 이내 (공백 포함)
- 핵심 키워드를 앞부분에 배치
- 태그: 10개 (검색어 태그)
- 로켓배송/로켓그로스 상품은 제목에 용량/수량 명시 권장
[출력 규약]
- 반드시 JSON만 출력 (다른 텍스트 금지)
- highlightFactor는 반드시 다음 중 하나: ranking, conversion, growth, profitability, entryBarrier, crossPlatform
- 제목/태그에 쓰는 모든 키워드는 시드 키워드와 의미적으로 자연스럽게 어울려야 함 (어색한 수식어 조합 금지)`,
};

const FACTOR_LABELS: Record<string, { name: string; highDesc: string; lowDesc: string }> = {
  ranking:       { name: "상위 노출",   highDesc: "상위 페이지 노출 가능성이 높습니다",               lowDesc: "상위 노출 경쟁이 치열합니다" },
  conversion:    { name: "구매전환율",   highDesc: "검색한 사람이 구매로 이어질 확률이 높습니다",       lowDesc: "구매 전환이 쉽지 않은 키워드입니다" },
  growth:        { name: "시장 성장성",  highDesc: "시장이 성장 중이라 지금 진입하면 유리합니다",       lowDesc: "시장 성장세가 둔화되고 있습니다" },
  profitability: { name: "수익성",       highDesc: "마진율이 좋아 수익을 내기 좋은 구조입니다",         lowDesc: "가격 경쟁으로 마진 확보가 어렵습니다" },
  entryBarrier:  { name: "진입 난이도",  highDesc: "진입 장벽이 높아 신규 셀러에게 불리합니다",         lowDesc: "진입 장벽이 낮아 신규 셀러도 시작하기 좋습니다" },
  crossPlatform: { name: "크로스 플랫폼", highDesc: "이 플랫폼에서 특히 강세인 키워드입니다",          lowDesc: "상대 플랫폼이 더 강세입니다" },
};

function buildUserPrompt(input: ConclusionInput): string {
  const { keyword, platform, factorScores, recommendedKeywords, topAggregatedKeyword, topVariantKeyword } = input;
  const platformName = platform === "naver" ? "스마트스토어" : "쿠팡";

  // 시드 키워드의 가장 강한 factor (세부 유형 전략에서 사용)
  const seedTopFactor = [...factorScores.factors].sort((a, b) => b.score - a.score)[0];
  const seedTopFactorName = FACTOR_LABELS[seedTopFactor?.key]?.name ?? seedTopFactor?.label ?? "";

  const aggLine = topAggregatedKeyword
    ? `[최종 후보 Top] "${topAggregatedKeyword.keyword}" (종합 ${topAggregatedKeyword.overallScore}점, 강점 ${FACTOR_LABELS[topAggregatedKeyword.topFactorKey]?.name ?? topAggregatedKeyword.topFactorKey} ${topAggregatedKeyword.topFactorScore})`
    : "";
  const varLine = topVariantKeyword
    ? `[세부 유형 Top] "${topVariantKeyword}" (시드 강점: ${seedTopFactorName})`
    : "";

  const factorSummary = factorScores.factors.map((f) => {
    const label = FACTOR_LABELS[f.key];
    const level = f.key === "entryBarrier"
      ? (f.score <= 40 ? "좋음(진입 쉬움)" : f.score <= 60 ? "보통" : "어려움")
      : (f.score >= 65 ? "높음" : f.score >= 40 ? "보통" : "낮음");
    return `- ${label?.name ?? f.label}: ${f.score}점/100 (${level})`;
  }).join("\n");

  // 프롬프트 길이 축소: 추천 15→8, 기회 10→5
  const kwList = recommendedKeywords.slice(0, 8).map(
    (k) => `  "${k.keyword}" (${k.score})`
  ).join("\n");

  const oppList = (input.opportunityKeywords ?? []).slice(0, 5).map(
    (k) => `  "${k.keyword}" (${k.scoreChance})`
  ).join("\n");

  const extraCount = (topAggregatedKeyword ? 1 : 0) + (topVariantKeyword ? 1 : 0);
  const totalMin = 3 + extraCount;
  const totalMax = 4 + extraCount;

  return `셀러가 "${keyword}" 관련 상품을 ${platformName}에 등록하려 합니다.
아래 데이터를 바탕으로 전략이 서로 다른 상품 제목+태그 조합을 ${totalMin}~${totalMax}개 만들어주세요.

[6 Factor 분석]
${factorSummary}

[추천 키워드 종합점수순]
${kwList}
${oppList ? `
[기회 분석 키워드 — 경쟁이 적은 틈새]
${oppList}
` : ""}${aggLine ? `${aggLine}\n` : ""}${varLine ? `${varLine}\n` : ""}${input.creativeKeyword ? `
[크리에이티브 키워드] "${input.creativeKeyword}" — 남들이 아직 안 쓰는 차별화 키워드
` : ""}
[요청]
1. 각 조합은 서로 다른 전략 (예: "상위 노출 집중", "구매전환 극대화", "기회 분석 기반 진입")
2. 반드시 하나는 "기회 분석 기반 진입" 전략 — 위 기회 분석 키워드 중 점수 높은 것 활용
3. 제목에는 추천 키워드 중 적합한 것을 자연스럽게 조합
4. 태그 10개는 제목에 없는 보조 키워드도 활용
5. reasoning은 6 Factor 강점 기반 한줄 설명${input.creativeKeyword ? `
6. 반드시 하나는 "크리에이티브 전략"이라는 이름으로, "${input.creativeKeyword}"를 제목/태그에 포함` : ""}${topAggregatedKeyword ? `
7. 반드시 하나는 "최종 후보 Top 전략" — "${topAggregatedKeyword.keyword}"를 제목 앞부분에, highlightFactor="${topAggregatedKeyword.topFactorKey}"` : ""}${topVariantKeyword ? `
8. 반드시 하나는 "세부 유형 특화" — "${topVariantKeyword}"를 제목 맨 앞 주어로, highlightFactor="${seedTopFactor?.key ?? "ranking"}"` : ""}

반드시 아래 JSON 형식으로만 응답:
{"combinations":[{"strategy":"전략명","title":"상품 제목","tags":["태그1",...],"reasoning":"한줄 해석","highlightFactor":"factor_key"}]}`;
}

export async function generateConclusion(input: ConclusionInput): Promise<ConclusionResult> {
  const { trackApiCall } = await import("./api-monitor");
  if (!trackApiCall("openai")) {
    throw new Error("OpenAI 일일 한도 초과");
  }

  const userPrompt = buildUserPrompt(input);
  const systemPrompt = PLATFORM_RULES[input.platform] ?? PLATFORM_RULES.naver;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0,
    max_tokens: 1500,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("GPT 응답 없음");

  const parsed = JSON.parse(content) as ConclusionResult;

  if (!parsed.combinations || !Array.isArray(parsed.combinations)) {
    throw new Error("GPT 응답 형식 오류");
  }

  return parsed;
}

export { FACTOR_LABELS };
