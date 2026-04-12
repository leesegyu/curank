/**
 * 규칙 기반 상품 제목 + 태그 생성기 (카테고리 특화)
 *
 * L4 카테고리별 5가지 제목 유형을 실제 상위 상품 패턴에서 도출:
 *   A) 브랜드+모델 선행 (디지털, 뷰티)
 *   B) 원산지+품질 선행 (식품 농축수산)
 *   C) 브랜드+용량 선행 (식품 가공, 육아, 반려동물)
 *   D) 타겟+스타일 선행 (패션, 잡화)
 *   E) 기능+용도 나열 (생활, 가구, 스포츠)
 *
 * 후킹 정확히 1개 필수. LLM 미사용, API 비용 0.
 */

import type { FactorScoreSet } from "./factor-model";
import type { TitleMinedKeyword } from "./title-miner";
import type { OntologyNode } from "./ontology/types";
import type { CategoryPoolKeyword } from "./category-pool";
import { FACTOR_LABELS, type ConclusionResult, type TitleTagCombo } from "./conclusion-generator";

// ── 타입 ─────────────────────────────────────────────────────────

export type TitleType = "brand_model" | "origin_quality" | "brand_qty" | "target_style" | "function_use";

export interface TitleBuilderInput {
  keyword: string;
  platform: "naver" | "coupang";
  factorScores: FactorScoreSet;
  recommendedKeywords: { keyword: string; score: number }[];
  opportunityKeywords?: { keyword: string; scoreChance: number }[];
  creativeKeyword?: string;
  topAggregatedKeyword?: {
    keyword: string;
    overallScore: number;
    topFactorKey: string;
    topFactorScore: number;
  };
  topVariantKeyword?: string;
  titleMinedKeywords: TitleMinedKeyword[];
  ontologyNode?: OntologyNode | null;
  categoryPoolKeywords?: CategoryPoolKeyword[];
  topBrands?: string[]; // 상위 상품에서 추출한 브랜드 top 5
}

// ── 카테고리 → 제목 유형 매핑 ────────────────────────────────────

const L1_TYPE_MAP: Record<string, TitleType> = {
  "ss.digital": "brand_model",
  "ss.beauty":  "brand_model",
  "cp.digital": "brand_model",
  "cp.beauty":  "brand_model",
  "ss.fashion":    "target_style",
  "ss.accessory":  "target_style",
  "cp.fashion":    "target_style",
  "cp.accessory":  "target_style",
  "ss.furniture": "function_use",
  "ss.health":    "function_use",
  "ss.sports":    "function_use",
  "ss.leisure":   "function_use",
  "cp.furniture": "function_use",
  "cp.health":    "function_use",
  "cp.sports":    "function_use",
  "ss.baby": "brand_qty",
  "ss.pet":  "brand_qty",
  "cp.baby": "brand_qty",
  "cp.pet":  "brand_qty",
};

// 식품은 L2로 세분화
const FOOD_L2_TYPE: Record<string, TitleType> = {
  "ss.food.meat":     "origin_quality",
  "ss.food.seafood":  "origin_quality",
  "ss.food.fruit":    "origin_quality",
  "ss.food.vegetable":"origin_quality",
  "ss.food.grain":    "origin_quality",
  "ss.food.kimjang":  "origin_quality",
  "ss.food.seasonal_summer": "origin_quality",
  // 나머지 식품은 브랜드+용량형
  "ss.food.processed":"brand_qty",
  "ss.food.drink":    "brand_qty",
  "ss.food.health":   "brand_qty",
  "ss.food.snack":    "brand_qty",
  "ss.food.sauce":    "brand_qty",
  "ss.food.dairy":    "brand_qty",
  "ss.food.nuts":     "brand_qty",
  "ss.food.gift":     "brand_qty",
  "ss.food.side":     "origin_quality",
};

export function getTitleType(nodePath: string): TitleType {
  // L2 매칭 시도 (식품 세분화)
  const l2 = nodePath.split(".").slice(0, 3).join(".");
  if (FOOD_L2_TYPE[l2]) return FOOD_L2_TYPE[l2];

  // L1 매칭
  const l1 = nodePath.split(".").slice(0, 2).join(".");
  return L1_TYPE_MAP[l1] ?? "function_use";
}

// ── 타입별 후킹 풀 (실제 상위 제목에서 관찰된 것) ──────────────

const HOOKS: Record<TitleType, string[]> = {
  brand_model:    ["NEW", "2026년형", "신형", "최신형", "정품"],
  origin_quality: ["프리미엄", "고당도", "무농약", "유기농", "1등급", "특품", "최상급", "산지직송"],
  brand_qty:      ["대용량", "1+1", "기획세트", "특가", "가성비"],
  target_style:   ["봄신상", "26SS", "빅사이즈", "NEW", "신상"],
  function_use:   ["프리미엄", "저소음", "무소음", "대용량", "1+1", "고급형"],
};

// ── 슬롯 분류 사전 ──────────────────────────────────────────────

const ORIGIN_WORDS = new Set([
  "국내산", "제주", "논산", "고창", "함안", "성주", "충북", "전남", "강원",
  "수입", "미국산", "호주산", "베트남", "일본", "노르웨이", "뉴질랜드",
  "산지직송", "농장직송", "당일수확", "산청", "보성", "횡성", "한돈",
]);

const QUALITY_WORDS = new Set([
  "프리미엄", "고당도", "저소음", "무소음", "유기농", "무농약", "친환경",
  "1등급", "특품", "최상급", "고급", "순면", "천연", "무첨가",
  "냉장", "냉동", "생", "신선", "숙성", "훈제", "무방부제",
]);

const TARGET_WORDS = new Set([
  "남성", "여성", "남자", "여자", "아기", "신생아", "아동", "키즈", "유아",
  "공용", "커플", "임산부", "시니어", "빅사이즈",
]);

const USE_WORDS = new Set([
  "구이용", "수육용", "보쌈용", "캠핑", "사무실", "가정용", "거실", "원룸",
  "운동", "러닝", "등산", "여행", "선물용", "업소용", "가정용", "사무용",
  "인덕션", "오븐", "에어프라이어", "겨울", "여름", "봄", "가을", "사계절",
]);

const QTY_RE = /^\d+(?:\.\d+)?(?:g|kg|ml|L|cm|mm|인치|매|개입|팩|봉|캡슐|포|T)$/i;
const SIZE_RE = /^\d+(?:\.\d+)?(?:cm|mm|인치)$/i;

// ── 유틸 ─────────────────────────────────────────────────────────

function norm(t: string): string {
  return t.replace(/\s+/g, "").toLowerCase();
}

function isDup(token: string, used: Set<string>): boolean {
  const n = norm(token);
  if (used.has(n)) return true;
  for (const u of used) {
    if (n.length >= 3 && u.length >= 3 && (n.includes(u) || u.includes(n))) return true;
  }
  return false;
}

function selectHook(type: TitleType, seed: number): string {
  const pool = HOOKS[type];
  return pool[seed % pool.length];
}

/** 토큰을 슬롯 분류 */
function classifyToken(t: string): "origin" | "quality" | "target" | "use" | "qty" | "size" | "general" {
  if (ORIGIN_WORDS.has(t)) return "origin";
  if (QUALITY_WORDS.has(t)) return "quality";
  if (TARGET_WORDS.has(t)) return "target";
  if (USE_WORDS.has(t)) return "use";
  if (QTY_RE.test(t)) return "qty";
  if (SIZE_RE.test(t)) return "size";
  return "general";
}

/** greedy 토큰 채우기 (중복/글자수 제한) */
function fillTokens(
  parts: string[],
  candidates: string[],
  maxChars: number,
  used: Set<string>,
): string[] {
  let len = parts.join(" ").length;
  for (const t of candidates) {
    if (!t || t.length < 2) continue;
    if (isDup(t, used)) continue;
    if (len + 1 + t.length > maxChars) continue;
    parts.push(t);
    used.add(norm(t));
    len += 1 + t.length;
  }
  return parts;
}

/** 제목에 안 쓴 키워드로 태그 10개 */
function buildTags(allTokens: string[], title: string, count: number): string[] {
  const titleWords = new Set(title.split(" ").map(norm));
  const tags: string[] = [];
  const used = new Set<string>();
  for (const t of allTokens) {
    if (tags.length >= count) break;
    if (!t || t.length < 2) continue;
    const n = norm(t);
    if (used.has(n)) continue;
    if (titleWords.has(n)) continue;
    // 제목 단어와 부분 겹침 스킵
    let skip = false;
    for (const tw of titleWords) {
      if (n.length >= 3 && tw.length >= 3 && (n.includes(tw) || tw.includes(n))) { skip = true; break; }
    }
    if (skip) continue;
    tags.push(t);
    used.add(n);
  }
  return tags;
}

function reasoning(key: string, fs: FactorScoreSet): string {
  const f = fs.factors.find((x) => x.key === key);
  const l = FACTOR_LABELS[key];
  if (!f || !l) return "데이터 기반 키워드 조합";
  const d = f.key === "entryBarrier"
    ? (f.score <= 40 ? l.lowDesc : l.highDesc)
    : (f.score >= 60 ? l.highDesc : l.lowDesc);
  return `${l.name} ${f.score}점 — ${d}`;
}

// ── 타입별 제목 조립 ─────────────────────────────────────────────

function buildTypeA(
  keyword: string, hook: string, tokens: string[], brands: string[], maxChars: number,
): string {
  // [후킹] [브랜드] [제품명] [기능 나열] [스펙/용량]
  const parts: string[] = [hook];
  const used = new Set([norm(hook)]);
  // 브랜드 삽입
  const brand = brands[0];
  if (brand && !isDup(brand, used)) { parts.push(brand); used.add(norm(brand)); }
  // 핵심 키워드
  if (!isDup(keyword, used)) { parts.push(keyword); used.add(norm(keyword)); }
  // 기능 토큰 (품질/일반 우선, 용량은 뒤로)
  const general = tokens.filter((t) => classifyToken(t) === "general" && !isDup(t, used));
  const qty = tokens.filter((t) => classifyToken(t) === "qty");
  fillTokens(parts, general, maxChars - (qty[0]?.length ?? 0) - 1, used);
  // 용량은 마지막
  if (qty[0] && !isDup(qty[0], used) && parts.join(" ").length + 1 + qty[0].length <= maxChars) {
    parts.push(qty[0]); used.add(norm(qty[0]));
  }
  return parts.join(" ");
}

function buildTypeB(
  keyword: string, hook: string, tokens: string[], maxChars: number,
): string {
  // [후킹(품질)] [원산지] [품종] [제품명] [변형나열] [중량]
  const parts: string[] = [hook];
  const used = new Set([norm(hook)]);
  // 원산지
  const origins = tokens.filter((t) => classifyToken(t) === "origin");
  if (origins[0] && !isDup(origins[0], used)) { parts.push(origins[0]); used.add(norm(origins[0])); }
  // 핵심 키워드
  if (!isDup(keyword, used)) { parts.push(keyword); used.add(norm(keyword)); }
  // 일반 토큰 (변형/품종)
  const general = tokens.filter((t) => classifyToken(t) === "general");
  const qty = tokens.filter((t) => classifyToken(t) === "qty");
  const quality = tokens.filter((t) => classifyToken(t) === "quality" && !isDup(t, used));
  fillTokens(parts, quality, maxChars - (qty[0]?.length ?? 0) - 1, used);
  fillTokens(parts, general, maxChars - (qty[0]?.length ?? 0) - 1, used);
  // 중량 마지막
  if (qty[0] && !isDup(qty[0], used) && parts.join(" ").length + 1 + qty[0].length <= maxChars) {
    parts.push(qty[0]);
  }
  return parts.join(" ");
}

function buildTypeC(
  keyword: string, hook: string, tokens: string[], brands: string[], maxChars: number,
): string {
  // [후킹] [브랜드] [제품명] [라인/맛] [용량] [수량]
  const parts: string[] = [hook];
  const used = new Set([norm(hook)]);
  const brand = brands[0];
  if (brand && !isDup(brand, used)) { parts.push(brand); used.add(norm(brand)); }
  if (!isDup(keyword, used)) { parts.push(keyword); used.add(norm(keyword)); }
  const general = tokens.filter((t) => classifyToken(t) === "general");
  const qty = tokens.filter((t) => classifyToken(t) === "qty");
  fillTokens(parts, general, maxChars - (qty[0]?.length ?? 0) - 1, used);
  if (qty[0] && !isDup(qty[0], used) && parts.join(" ").length + 1 + qty[0].length <= maxChars) {
    parts.push(qty[0]);
  }
  return parts.join(" ");
}

function buildTypeD(
  keyword: string, hook: string, tokens: string[], brands: string[], maxChars: number,
): string {
  // [후킹] [브랜드?] [타겟] [스타일] [아이템] [디테일] [시즌]
  const parts: string[] = [hook];
  const used = new Set([norm(hook)]);
  // 브랜드 (패션은 있으면 선행, 없으면 생략)
  const brand = brands[0];
  if (brand && !isDup(brand, used)) { parts.push(brand); used.add(norm(brand)); }
  // 타겟
  const targets = tokens.filter((t) => classifyToken(t) === "target");
  if (targets[0] && !isDup(targets[0], used)) { parts.push(targets[0]); used.add(norm(targets[0])); }
  // 핵심 키워드
  if (!isDup(keyword, used)) { parts.push(keyword); used.add(norm(keyword)); }
  // 나머지
  const general = tokens.filter((t) => classifyToken(t) === "general");
  const uses = tokens.filter((t) => classifyToken(t) === "use");
  fillTokens(parts, general, maxChars, used);
  fillTokens(parts, uses, maxChars, used);
  return parts.join(" ");
}

function buildTypeE(
  keyword: string, hook: string, tokens: string[], brands: string[], maxChars: number,
): string {
  // [후킹] [브랜드?] [소재/기능] [제품명] [용도나열] [사이즈]
  const parts: string[] = [hook];
  const used = new Set([norm(hook)]);
  const brand = brands[0];
  if (brand && !isDup(brand, used)) { parts.push(brand); used.add(norm(brand)); }
  // 품질/기능 먼저
  const quality = tokens.filter((t) => classifyToken(t) === "quality");
  for (const q of quality.slice(0, 2)) {
    if (!isDup(q, used)) { parts.push(q); used.add(norm(q)); }
  }
  if (!isDup(keyword, used)) { parts.push(keyword); used.add(norm(keyword)); }
  // 용도 나열
  const uses = tokens.filter((t) => classifyToken(t) === "use");
  fillTokens(parts, uses, maxChars, used);
  // 일반
  const general = tokens.filter((t) => classifyToken(t) === "general");
  fillTokens(parts, general, maxChars, used);
  // 사이즈 마지막
  const sizes = tokens.filter((t) => classifyToken(t) === "size");
  if (sizes[0] && !isDup(sizes[0], used) && parts.join(" ").length + 1 + sizes[0].length <= maxChars) {
    parts.push(sizes[0]);
  }
  return parts.join(" ");
}

// ── 타입별 빌더 디스패치 ─────────────────────────────────────────

function buildTypedTitle(
  type: TitleType, keyword: string, hook: string,
  tokens: string[], brands: string[], maxChars: number,
): string {
  switch (type) {
    case "brand_model":    return buildTypeA(keyword, hook, tokens, brands, maxChars);
    case "origin_quality": return buildTypeB(keyword, hook, tokens, maxChars);
    case "brand_qty":      return buildTypeC(keyword, hook, tokens, brands, maxChars);
    case "target_style":   return buildTypeD(keyword, hook, tokens, brands, maxChars);
    case "function_use":   return buildTypeE(keyword, hook, tokens, brands, maxChars);
  }
}

// ── 메인 ─────────────────────────────────────────────────────────

export function buildTitlesRuleBased(input: TitleBuilderInput): ConclusionResult {
  const {
    keyword, platform, factorScores,
    recommendedKeywords, opportunityKeywords,
    creativeKeyword, topAggregatedKeyword, topVariantKeyword,
    titleMinedKeywords, ontologyNode, categoryPoolKeywords,
    topBrands,
  } = input;

  const maxChars = platform === "naver" ? 50 : 100;
  const hookSeed = Math.floor(Date.now() / 1000);
  const nodePath = ontologyNode?.id ?? "";
  const titleType = getTitleType(nodePath);
  const brands = topBrands ?? [];

  // ── 토큰 풀 (마이닝 키워드 우선) ──
  const minedTokens = titleMinedKeywords.map((t) => t.keyword);
  const variantTokens = ontologyNode?.variantKeywords ?? [];
  const seedTokens = (ontologyNode?.seedKeywords ?? []).flatMap((s) => s.split(/\s+/));
  const poolTokens = (categoryPoolKeywords ?? []).filter((p) => p.monthlyTotal > 100).map((p) => p.keyword);
  const recTokens = recommendedKeywords.map((k) => k.keyword);
  const oppTokens = (opportunityKeywords ?? []).map((k) => k.keyword);

  const allTokens = [...minedTokens, ...variantTokens, ...seedTokens, ...poolTokens, ...recTokens, ...oppTokens];
  const combos: TitleTagCombo[] = [];

  // ── 전략 1: 상위 노출 집중 ──
  {
    const hook = selectHook(titleType, hookSeed);
    const title = buildTypedTitle(titleType, keyword, hook, [...minedTokens, ...seedTokens, ...poolTokens], brands, maxChars);
    combos.push({
      strategy: "상위 노출 집중",
      title,
      tags: buildTags(allTokens, title, 10),
      reasoning: reasoning("ranking", factorScores),
      highlightFactor: "ranking",
    });
  }

  // ── 전략 2: 구체 니즈 타겟 ──
  {
    const variantKw = topVariantKeyword ?? variantTokens[0] ?? oppTokens[0];
    if (variantKw) {
      const hook = selectHook(titleType, hookSeed + 1);
      const filtered = [...minedTokens, ...seedTokens, ...poolTokens].filter((t) => norm(t) !== norm(variantKw));
      const title = buildTypedTitle(titleType, variantKw, hook, filtered, brands, maxChars);
      const topF = factorScores.factors.reduce((a, b) => {
        const aS = a.key === "entryBarrier" ? 100 - a.score : a.score;
        const bS = b.key === "entryBarrier" ? 100 - b.score : b.score;
        return bS > aS ? b : a;
      });
      combos.push({
        strategy: "구체 니즈 타겟",
        title,
        tags: buildTags(allTokens, title, 10),
        reasoning: `"${variantKw}" 구체 변형 → 니즈 매칭 전환율 상승`,
        highlightFactor: topF.key,
      });
    }
  }

  // ── 전략 3: 기회 분석 진입 ──
  if (oppTokens[0]) {
    const hook = selectHook(titleType, hookSeed + 2);
    const filtered = [...minedTokens, ...seedTokens, ...poolTokens].filter((t) => norm(t) !== norm(oppTokens[0]));
    const title = buildTypedTitle(titleType, oppTokens[0], hook, filtered, brands, maxChars);
    combos.push({
      strategy: "기회 분석 진입",
      title,
      tags: buildTags(allTokens, title, 10),
      reasoning: reasoning("growth", factorScores),
      highlightFactor: "growth",
    });
  }

  // ── 전략 4: 최종 후보 Top ──
  if (topAggregatedKeyword) {
    const hook = selectHook(titleType, hookSeed + 3);
    const filtered = [...minedTokens, ...seedTokens, ...poolTokens].filter((t) => norm(t) !== norm(topAggregatedKeyword.keyword));
    const title = buildTypedTitle(titleType, topAggregatedKeyword.keyword, hook, filtered, brands, maxChars);
    combos.push({
      strategy: "최종 후보 Top",
      title,
      tags: buildTags(allTokens, title, 10),
      reasoning: `종합 ${topAggregatedKeyword.overallScore}점 1위 — ${reasoning(topAggregatedKeyword.topFactorKey, factorScores)}`,
      highlightFactor: topAggregatedKeyword.topFactorKey,
    });
  }

  // ── 전략 5: 세부 유형 특화 (variantKeywords 기반) ──
  // 전략 2와 다른 variant를 사용. variant가 1개뿐이어도 전략 2와 다른 키워드면 생성.
  {
    // 전략 2에서 사용한 키워드 제외
    const usedVariant = topVariantKeyword ?? variantTokens[0] ?? "";
    const altVariant = variantTokens.find((v) => norm(v) !== norm(usedVariant) && norm(v) !== norm(keyword));
    // altVariant 없으면 topVariantKeyword 자체 사용 (전략 2에서 oppTokens를 쓴 경우)
    const variantForS5 = altVariant ?? (topVariantKeyword && norm(topVariantKeyword) !== norm(usedVariant) ? topVariantKeyword : null);
    // 마지막 폴백: variantTokens 첫 번째 (전략 2가 oppTokens를 쓴 경우 variant 미사용이므로)
    const finalVariant = variantForS5 ?? (variantTokens.length > 0 && !combos.some((c) => c.strategy === "구체 니즈 타겟" && c.title.includes(variantTokens[0])) ? variantTokens[0] : null);

    if (finalVariant) {
      const hook = selectHook(titleType, hookSeed + 4);
      const title = buildTypedTitle(titleType, finalVariant, hook, [...minedTokens, ...poolTokens, ...seedTokens], brands, maxChars);
      combos.push({
        strategy: "세부 유형 특화",
        title,
        tags: buildTags(allTokens, title, 10),
        reasoning: `"${finalVariant}" 세부 유형으로 틈새 시장 진입`,
        highlightFactor: factorScores.factors[0]?.key ?? "ranking",
      });
    }
  }

  // ── 전략 6: 크리에이티브 ──
  if (creativeKeyword) {
    const hook = selectHook(titleType, hookSeed + 5);
    const filtered = [...minedTokens, ...seedTokens, ...poolTokens].filter((t) => norm(t) !== norm(creativeKeyword));
    const title = buildTypedTitle(titleType, creativeKeyword, hook, filtered, brands, maxChars);
    combos.push({
      strategy: "크리에이티브",
      title,
      tags: buildTags(allTokens, title, 10),
      reasoning: `"${creativeKeyword}" 차별화 키워드 경쟁 회피`,
      highlightFactor: "growth",
    });
  }

  // 최소 3개 보장
  if (combos.length < 3) {
    const hook = selectHook(titleType, hookSeed + 6);
    const title = buildTypedTitle(titleType, keyword, hook, [...poolTokens, ...minedTokens], brands, maxChars);
    combos.push({
      strategy: "검색량 기반 노출",
      title,
      tags: buildTags(allTokens, title, 10),
      reasoning: reasoning("profitability", factorScores),
      highlightFactor: "profitability",
    });
  }

  return { combinations: combos };
}
