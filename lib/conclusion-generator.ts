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
 *
 * ⚠️ 상품 제목 포맷 핵심:
 * 실제 상위 노출 스마트스토어/쿠팡 상품 제목은 **문장이 아니라 "단어+단어+단어..."**
 * 공백으로 구분된 검색 키워드 나열 형태. 조사·어미·동사 금지.
 *
 * 좋은 예:
 *   "국내산 수박 10kg 꿀수박 당도선별 산지직송 여름과일"
 *   "무선 이어폰 블루투스 5.3 노이즈캔슬링 게이밍 방수"
 *   "쿠션파운데이션 커버력 21호 23호 수분 리필포함"
 * 나쁜 예 (문장형):
 *   "신선하고 달콤한 여름 수박을 맛보세요"
 *   "피부톤에 맞는 파운데이션입니다"
 *
 * 📈 매출 심리 인사이트(반드시 활용):
 * 시드 단독("수박")보다 구체적 변형("씨없는수박", "납작복숭아")이 훨씬 잘 팔림.
 * 이유: 셀러가 특정 "구매 불편/욕구"를 해결한 변형을 제시하면
 *  - 구매자가 본인 니즈와 정확히 매칭되어 전환율 상승
 *  - 경쟁이 덜해 상위 노출 쉬움
 *  - 광고비 대비 효율 ↑
 * 따라서 반드시 하나 이상의 제안은 "구체 변형 키워드(세부 유형/기회 분석 top)"를
 * 제목 맨 앞에 두어 구매자의 구체적 니즈를 타겟하는 전략이어야 함.
 */
const PLATFORM_RULES: Record<string, string> = {
  naver: `당신은 스마트스토어 상품 등록 전문가입니다.
[스마트스토어 규칙]
- 상품 제목: 50자 이내 (공백 포함)
- 앞 25자 안에 핵심 키워드를 반드시 배치 (검색 가중치 높음)
- 태그: 10개 (각 태그는 검색 키워드 역할)
[상품 제목 포맷 — 필수 준수]
- 형태: "핵심키워드 + 부가키워드 + 부가키워드 ..." 공백으로 구분된 키워드 나열
- 절대 금지: 문장, 조사(~을/를/~이/가/~의/~은/는), 어미(~입니다/~요/~해요/~하세요), 동사, 형용어미
- 좋은 예: "국내산 수박 10kg 꿀수박 당도선별 산지직송"
- 나쁜 예: "달콤한 여름 수박을 맛보세요" (문장이라 검색 노출에 불리)
- 각 키워드는 스페이스로 구분, 중복 단어 금지, 특수문자 최소
[출력 규약]
- 반드시 JSON만 출력
- highlightFactor는 반드시 다음 중 하나: ranking, conversion, growth, profitability, entryBarrier, crossPlatform
- 제목/태그 키워드는 시드와 의미적으로 자연스럽게 어울려야 함`,

  coupang: `당신은 쿠팡 상품 등록 전문가입니다.
[쿠팡 규칙]
- 상품 제목: 100자 이내 (공백 포함)
- 핵심 키워드를 앞부분에 배치
- 태그: 10개 (검색어 태그)
- 로켓배송 상품은 제목에 용량/수량 명시 권장
[상품 제목 포맷 — 필수 준수]
- 형태: "핵심키워드 + 부가키워드 + 부가키워드 ..." 공백으로 구분된 키워드 나열
- 절대 금지: 문장, 조사, 어미, 동사. 반드시 키워드 나열 형태
- 좋은 예: "무선 이어폰 블루투스 5.3 노이즈캔슬링 게이밍 방수 대용량"
- 나쁜 예: "고음질 이어폰으로 생활을 바꿔보세요"
- 각 키워드는 스페이스로 구분, 중복 단어 금지
[출력 규약]
- 반드시 JSON만 출력
- highlightFactor는 반드시 다음 중 하나: ranking, conversion, growth, profitability, entryBarrier, crossPlatform
- 제목/태그 키워드는 시드와 의미적으로 자연스럽게 어울려야 함`,
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
1. 각 조합은 서로 다른 전략 (예: "상위 노출 집중", "구매전환 극대화", "구체 니즈 타겟")
2. 반드시 하나는 "구체 니즈 타겟" 전략 — "${keyword}" 단독 대신 위 [추천 키워드] 또는 [기회 분석] 중
   "${keyword}"의 구체적 변형(구매자의 특정 불편/욕구 해결)을 제목 맨 앞에 배치
   예: "수박" 시드 → "씨없는수박"(씨 발라내기 번거로움 해소), "납작복숭아"(식감 차별화)
   reasoning에 "왜 이 구체 변형이 시드 단독보다 매출이 높은지"를 30자 내외로 설명
3. 반드시 하나는 "기회 분석 기반 진입" — 위 [기회 분석] 키워드 중 점수 높은 것 활용
4. 제목은 반드시 "단어 단어 단어..." 나열형 (문장/조사/어미 금지)
5. 태그 10개는 제목에 없는 보조 키워드 활용, 중복 금지
6. reasoning은 6 Factor 강점 또는 구매 심리 기반 한줄${input.creativeKeyword ? `
7. 반드시 하나는 "크리에이티브 전략" — "${input.creativeKeyword}"를 제목/태그에 포함` : ""}${topAggregatedKeyword ? `
8. 반드시 하나는 "최종 후보 Top 전략" — "${topAggregatedKeyword.keyword}"를 제목 앞부분, highlightFactor="${topAggregatedKeyword.topFactorKey}"` : ""}${topVariantKeyword ? `
9. 반드시 하나는 "세부 유형 특화" — "${topVariantKeyword}"를 제목 맨 앞, highlightFactor="${seedTopFactor?.key ?? "ranking"}"` : ""}

반드시 아래 JSON 형식으로만 응답:
{"combinations":[{"strategy":"전략명","title":"단어 단어 단어 나열","tags":["태그1",...],"reasoning":"한줄 해석","highlightFactor":"factor_key"}]}`;
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
