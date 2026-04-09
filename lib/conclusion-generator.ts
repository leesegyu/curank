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
}

const PLATFORM_RULES: Record<string, string> = {
  naver: `[스마트스토어 규칙]
- 상품 제목: 50자 이내 (공백 포함)
- 앞 25자 안에 핵심 키워드를 반드시 배치 (검색 가중치 높음)
- 태그: 10개 (각 태그는 검색 키워드 역할)
- 제목에 특수문자 남용 금지, 자연스러운 상품명`,

  coupang: `[쿠팡 규칙]
- 상품 제목: 100자 이내 (공백 포함)
- 핵심 키워드를 앞부분에 배치
- 태그: 10개 (검색어 태그)
- 로켓배송/로켓그로스 상품은 제목에 용량/수량 명시 권장`,
};

const FACTOR_LABELS: Record<string, { name: string; highDesc: string; lowDesc: string }> = {
  ranking:       { name: "상위 노출",   highDesc: "상위 페이지 노출 가능성이 높습니다",               lowDesc: "상위 노출 경쟁이 치열합니다" },
  conversion:    { name: "구매전환율",   highDesc: "검색한 사람이 구매로 이어질 확률이 높습니다",       lowDesc: "구매 전환이 쉽지 않은 키워드입니다" },
  growth:        { name: "시장 성장성",  highDesc: "시장이 성장 중이라 지금 진입하면 유리합니다",       lowDesc: "시장 성장세가 둔화되고 있습니다" },
  profitability: { name: "수익성",       highDesc: "마진율이 좋아 수익을 내기 좋은 구조입니다",         lowDesc: "가격 경쟁으로 마진 확보가 어렵습니다" },
  entryBarrier:  { name: "진입 난이도",  highDesc: "진입 장벽이 높아 신규 셀러에게 불리합니다",         lowDesc: "진입 장벽이 낮아 신규 셀러도 시작하기 좋습니다" },
  crossPlatform: { name: "크로스 플랫폼", highDesc: "이 플랫폼에서 특히 강세인 키워드입니다",          lowDesc: "상대 플랫폼이 더 강세입니다" },
};

function buildPrompt(input: ConclusionInput): string {
  const { keyword, platform, factorScores, recommendedKeywords } = input;
  const platformName = platform === "naver" ? "스마트스토어" : "쿠팡";

  const factorSummary = factorScores.factors.map((f) => {
    const label = FACTOR_LABELS[f.key];
    const level = f.key === "entryBarrier"
      ? (f.score <= 40 ? "좋음(진입 쉬움)" : f.score <= 60 ? "보통" : "어려움")
      : (f.score >= 65 ? "높음" : f.score >= 40 ? "보통" : "낮음");
    return `- ${label?.name ?? f.label}: ${f.score}점/100 (${level})`;
  }).join("\n");

  const kwList = recommendedKeywords.slice(0, 15).map(
    (k) => `  "${k.keyword}" (점수: ${k.score})`
  ).join("\n");

  const oppList = (input.opportunityKeywords ?? []).slice(0, 10).map(
    (k) => `  "${k.keyword}" (기회발굴 점수: ${k.scoreChance})`
  ).join("\n");

  return `당신은 ${platformName} 상품 등록 전문가입니다.

셀러가 "${keyword}" 관련 상품을 ${platformName}에 등록하려 합니다.
아래 분석 데이터를 바탕으로, 전략이 서로 다른 상품 제목+태그 조합을 3~4개 만들어주세요.

[6 Factor 분석 결과]
${factorSummary}

[AI 심층 비교 추천 키워드 (종합점수순)]
${kwList}
${oppList ? `
[기회 분석 추천 키워드 (기회발굴 점수순)]
${oppList}
— 기회 분석은 셀러가 진입할 수 있는 틈새 키워드를 찾는 것입니다. 경쟁이 적으면서 구매 의도가 높은 키워드입니다.
` : ""}
${PLATFORM_RULES[platform]}

${input.creativeKeyword ? `[크리에이티브 키워드]
"${input.creativeKeyword}" — 다른 셀러들이 아직 사용하지 않는 창의적 키워드입니다.
` : ""}[요청]
1. 각 조합은 서로 다른 전략을 가져야 합니다 (예: "상위 노출 집중", "구매전환 극대화", "기회 분석 기반 진입" 등)
2. 반드시 하나의 조합은 "기회 분석 기반 진입" 전략으로, 위 기회 분석 추천 키워드 중 기회발굴 점수가 높은 키워드를 활용하여 경쟁이 적은 틈새 시장에 진입하는 전략을 만드세요
3. 제목에는 위 추천 키워드 중 적합한 것들을 자연스럽게 조합하세요
4. 태그 10개는 제목에 포함되지 않은 보조 키워드도 활용하세요
5. 각 조합에 대해 6 Factor 중 어떤 강점 때문에 이 전략을 추천하는지 한줄로 설명하세요
6. highlightFactor는 6개 중 가장 핵심인 factor의 key값입니다: ranking, conversion, growth, profitability, entryBarrier, crossPlatform${input.creativeKeyword ? `
7. 반드시 마지막 조합은 "크리에이티브 전략"이라는 이름으로, 위 크리에이티브 키워드 "${input.creativeKeyword}"를 제목과 태그에 자연스럽게 포함시키세요. 이 조합은 남들과 차별화된 틈새 시장 공략 전략입니다.` : ""}

[중요] 제목과 태그에 사용하는 키워드 조합이 의미적으로 자연스러운지 반드시 검증하세요.
- "${keyword}"와 어울리지 않는 수식어 조합은 절대 사용하지 마세요 (예: 식품에 "접이식", "무선", "충전식" 등 물리적 속성 수식어)
- 실제로 소비자가 검색할 법한 자연스러운 키워드 조합만 사용하세요
- 어색하거나 엉뚱한 조합이 포함되면 해당 키워드를 제외하고 더 적합한 키워드로 대체하세요

반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{"combinations":[{"strategy":"전략명","title":"상품 제목","tags":["태그1","태그2",...],"reasoning":"한줄 해석","highlightFactor":"factor_key"}]}`;
}

export async function generateConclusion(input: ConclusionInput): Promise<ConclusionResult> {
  const { trackApiCall } = await import("./api-monitor");
  if (!trackApiCall("openai")) {
    throw new Error("OpenAI 일일 한도 초과");
  }

  const prompt = buildPrompt(input);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 2000,
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
