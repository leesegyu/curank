/**
 * 수식어 카테고리 맞춤 필터 + LLM 자연스러움 검증
 *
 * 2단계 파이프라인:
 *   1) 규칙 기반: L4 카테고리 유형별 허용 수식어 풀 (비용 0)
 *   2) LLM 기반: GPT-4o-mini 배치 1회로 자연스러움 검증 (~$0.001)
 *
 * 결과는 L2 캐시 24시간 저장 → 재방문 시 LLM 0콜
 */

import OpenAI from "openai";
import NodeCache from "node-cache";
import { getTitleType, type TitleType } from "./title-builder";
import { classifyKeywordV2 } from "./ontology";
import { getL2Cache, setL2Cache } from "./cache-db";
import { trackApiCall } from "./api-monitor";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── 단계 1: 카테고리별 유효 수식어 풀 ────────────────────────────

const BASE_MODIFIERS = ["추천", "인기", "가성비", "최저가", "할인", "특가", "세일", "비교", "후기", "리뷰"];

const MODIFIER_POOLS: Record<TitleType, Set<string>> = {
  brand_model: new Set([
    ...BASE_MODIFIERS,
    "남성용", "여성용", "사무용", "가정용",
    "무선", "유선", "대용량", "미니", "프로", "신형", "신제품",
    "저소음", "무소음", "방수", "충전식", "휴대용",
  ]),
  origin_quality: new Set([
    ...BASE_MODIFIERS,
    "구이용", "수육용", "보쌈용", "캠핑용", "선물용", "가정용", "업소용",
    "대용량", "프리미엄", "유기농", "무농약", "국내산",
    "냉장", "냉동", "산지직송", "당일발송",
  ]),
  brand_qty: new Set([
    ...BASE_MODIFIERS,
    "대용량", "미니", "세트", "벌크",
    "선물용", "가정용", "업소용",
  ]),
  target_style: new Set([
    ...BASE_MODIFIERS,
    "남성용", "여성용", "남성", "여성", "남자", "여자", "아동용", "키즈",
    "빅사이즈", "봄", "여름", "가을", "겨울",
    "오버핏", "슬림핏", "루즈핏", "와이드",
  ]),
  function_use: new Set([
    ...BASE_MODIFIERS,
    "가정용", "사무용", "업소용",
    "대용량", "미니", "접이식", "휴대용",
    "저소음", "무소음", "무선", "충전식",
  ]),
};

/** 카테고리 유형에 맞는 수식어 풀 반환 */
export function getModifierPool(nodePath: string): Set<string> {
  const type = getTitleType(nodePath);
  return MODIFIER_POOLS[type];
}

/** 규칙 기반 1차 필터: 카테고리에 맞는 수식어인지 */
export function isValidModifierForCategory(keyword: string, seed: string, nodePath?: string): boolean {
  const kwTokens = keyword.trim().toLowerCase().split(/\s+/);
  const seedTokens = seed.trim().toLowerCase().split(/\s+/);

  if (seedTokens.length === 0 || kwTokens.length === 0) return false;
  if (!seedTokens.every((st) => kwTokens.includes(st))) return false;

  const seedSet = new Set(seedTokens);
  const extras = kwTokens.filter((t) => !seedSet.has(t));
  if (extras.length === 0) return false;

  // 카테고리 풀 체크
  const pool = nodePath ? getModifierPool(nodePath) : new Set(BASE_MODIFIERS);
  return extras.every((e) => pool.has(e));
}

// ── 단계 2: LLM 자연스러움 검증 ─────────────────────────────────

const filterCache = new NodeCache({ stdTTL: 60 * 60 * 6, maxKeys: 500 });
const LLM_CACHE_TYPE = "modifier_natural_v1";

const SYSTEM_PROMPT = `당신은 한국 이커머스 키워드 전문가입니다.
상품 키워드와 수식어의 조합이 실제 네이버 쇼핑/쿠팡에서 자연스러운지 판별합니다.
소비자가 실제로 검색할 만한 자연스러운 조합만 남기고, 어색하거나 엉뚱한 조합은 제거합니다.
반드시 JSON 배열로만 응답하세요.`;

/**
 * LLM으로 자연스러운 수식어 조합만 필터링
 * @returns 자연스러운 키워드 목록 (입력의 서브셋)
 */
export async function filterNaturalModifiers(
  seed: string,
  candidates: string[],
  categoryName: string,
): Promise<string[]> {
  if (candidates.length === 0) return [];

  // L1 캐시 체크
  const cacheKey = `mod_nat:${seed}:${candidates.length}`;
  const l1 = filterCache.get<string[]>(cacheKey);
  if (l1) return l1;

  // L2 캐시 체크
  const l2 = await getL2Cache<string[]>(seed, LLM_CACHE_TYPE);
  if (l2) {
    filterCache.set(cacheKey, l2);
    return l2;
  }

  // API 한도 체크
  if (!trackApiCall("openai")) return candidates; // 한도 초과 시 필터 없이 통과

  try {
    const numbered = candidates.map((c, i) => `${i + 1}. ${c}`).join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `카테고리: ${categoryName}\n시드 키워드: "${seed}"\n\n아래 수식어 조합 중 실제 "${categoryName}" 카테고리에서 소비자가 검색할 만한 자연스러운 것의 번호만 골라주세요.\n\n${numbered}\n\n자연스러운 번호만 JSON 배열로 응답: [1,3,5,...]`,
        },
      ],
      temperature: 0,
      max_tokens: 200,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return candidates;

    const parsed = JSON.parse(content);
    // { "natural": [1,3,5] } 또는 [1,3,5] 형태 모두 처리
    const indices: number[] = Array.isArray(parsed) ? parsed : (parsed.natural ?? parsed.result ?? parsed.numbers ?? []);

    const result = indices
      .filter((i) => typeof i === "number" && i >= 1 && i <= candidates.length)
      .map((i) => candidates[i - 1]);

    // 결과가 비어있으면 LLM이 잘못 응답한 것 → 원본 반환
    if (result.length === 0 && candidates.length > 0) return candidates;

    // 캐시 저장
    filterCache.set(cacheKey, result);
    setL2Cache(seed, LLM_CACHE_TYPE, result).catch(() => {});

    return result;
  } catch {
    // LLM 실패 시 필터 없이 통과
    return candidates;
  }
}

/**
 * 전체 파이프라인: 규칙 1차 + LLM 2차
 */
export async function filterModifiersForCategory(
  seed: string,
  candidates: string[],
  platform: "naver" | "coupang" = "naver",
): Promise<string[]> {
  // 온톨로지 분류
  const cls = classifyKeywordV2(seed, platform === "naver" ? "smartstore" : "coupang");
  const nodePath = cls?.path ?? "";
  const pool = getModifierPool(nodePath);

  // 단계 1: 규칙 기반 필터
  const seedTokens = seed.trim().toLowerCase().split(/\s+/);
  const seedSet = new Set(seedTokens);

  const passed = candidates.filter((c) => {
    const kwTokens = c.trim().toLowerCase().split(/\s+/);
    const extras = kwTokens.filter((t) => !seedSet.has(t));
    return extras.length > 0 && extras.every((e) => pool.has(e));
  });

  if (passed.length === 0) return [];

  // 카테고리 이름 추출
  const { getNodesV2 } = await import("./ontology");
  const nodes = getNodesV2(cls?.platform ?? "smartstore");
  const l2Id = nodePath.split(".").slice(0, 3).join(".");
  const l2Node = nodes.find((n) => n.id === l2Id);
  const categoryName = l2Node?.name ?? "일반";

  // 단계 2: LLM 자연스러움 검증
  return filterNaturalModifiers(seed, passed, categoryName);
}
