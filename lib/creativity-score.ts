/**
 * 크리에이티브 발굴 점수 (Creativity Score)
 *
 * 7 Sub-Factors:
 *   F1 발견 가치          (0.15) — 시드와 다른 형태의 실제 검색 키워드인가
 *   F2 니치 잠재력        (0.25) — 낮은 경쟁 + 높은 구체성 (핵심 factor)
 *   F3 수식어 독창성      (0.12) — 뻔하지 않은 수식어 사용 여부
 *   F4 사용 시나리오 다양성 (0.08) — 시드와 다른 사용 상황
 *   F5 성장 신호          (0.05) — 트렌드 상승세
 *   F6 이커머스 유효성     (0.10) — 구매 가능한 키워드인가
 *   F7 대체재/스펙 가치   (0.25) — 브랜드, 스펙, 모델명 등 구매 결정 키워드
 */

import { classifyKeyword, wuPalmerSim } from "./ontology";
import { classifyKeywordIntent } from "./intent-classifier";
import { findUseCases, isCreativeModifier, isCommonModifier } from "./ontology/use-case-bridges";
import type { Platform } from "./ontology/types";

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function logNorm(value: number, scale: number): number {
  if (value <= 0) return 0;
  return Math.min(100, (Math.log10(value + 1) / Math.log10(scale + 1)) * 100);
}

export interface CreativitySubFactor {
  key: string;
  label: string;
  score: number;
  weight: number;
}

export interface CreativityResult {
  keyword: string;
  score: number;
  subfactors: CreativitySubFactor[];
  topFactor: string;
  source: string;
}

interface ScoreInput {
  seedKeyword: string;
  candidateKeyword: string;
  platform: Platform;
  monthlyVolume?: number;
  competitionLevel?: string;
  trendSlope?: number;
  source: string;
}

// ── F1: 발견 가치 (Discovery Value) ──
// "LG그램"처럼 시드("노트북")와 형태가 완전히 다르지만 관련 있는 키워드일수록 높음
// 실제 검색 데이터(자동완성/Ad API)에서 온 키워드는 발견 가치가 높음

function calcDiscoveryValue(seedKeyword: string, candidateKeyword: string, platform: Platform, source: string): number {
  const seedTokens = seedKeyword.split(/\s+/);
  const candTokens = candidateKeyword.split(/\s+/);

  // 시드 토큰을 포함하지 않는 완전히 다른 형태의 키워드 = 높은 발견 가치
  const containsSeed = seedTokens.every((t) => candidateKeyword.includes(t));
  const isRealData = source === "autocomplete" || source === "deepAutocomplete" || source === "adRelated" || source === "brandExtract";

  if (!containsSeed && isRealData) {
    // "노트북" → "LG그램" — 실제 데이터에서 온 완전히 다른 형태 = 최고 발견 가치
    return 95;
  }

  if (!containsSeed) {
    // 실제 데이터 아닌데 시드 미포함 = 관련성 불확실
    return 40;
  }

  // 시드를 포함하지만 추가 토큰이 있는 경우
  const extraTokens = candTokens.filter((t) => !seedTokens.includes(t));
  if (extraTokens.length === 0) return 10; // 시드와 동일

  // 온톨로지 분류 차이
  const seedClass = classifyKeyword(seedKeyword, platform);
  const candClass = classifyKeyword(candidateKeyword, platform);

  if (seedClass && candClass) {
    const sim = wuPalmerSim(seedClass.path, candClass.path);
    // 같은 카테고리지만 수식어가 다른 경우
    return clamp(30 + (1.0 - sim) * 40 + extraTokens.length * 5);
  }

  // 한쪽 미분류
  return clamp(50 + extraTokens.length * 5);
}

// ── F2: 니치 잠재력 (핵심 Factor, 가중치 0.30) ──

function calcNichePotential(
  candidateKeyword: string,
  monthlyVolume?: number,
  competitionLevel?: string,
): number {
  const intent = classifyKeywordIntent(candidateKeyword);

  let volumeNiche: number;
  if (monthlyVolume !== undefined && monthlyVolume > 0) {
    volumeNiche = clamp(100 - logNorm(monthlyVolume, 100000) * 1.2);
  } else {
    volumeNiche = 60;
  }

  const compMap: Record<string, number> = { "낮음": 90, "보통": 55, "높음": 25, "매우 높음": 5 };
  const compNiche = compMap[competitionLevel ?? ""] ?? 60;

  const score =
    volumeNiche * 0.30 +
    intent.specificityScore * 0.35 +
    compNiche * 0.25 +
    (intent.isLongTail ? 80 : 30) * 0.10;

  return clamp(score);
}

// ── F3: 수식어 독창성 ──

function calcModifierUniqueness(seedKeyword: string, candidateKeyword: string): number {
  const seedTokens = new Set(seedKeyword.split(/\s+/));
  const candTokens = candidateKeyword.split(/\s+/);
  const modifierTokens = candTokens.filter((t) => !seedTokens.has(t) && t.length >= 2);

  if (modifierTokens.length === 0) return 30;

  let creativeHits = 0;
  let commonHits = 0;

  for (const token of modifierTokens) {
    if (isCreativeModifier(token)) creativeHits++;
    if (isCommonModifier(token)) commonHits++;
  }

  const score = 30 + creativeHits * 25 - commonHits * 15 + (modifierTokens.length >= 2 ? 10 : 0);
  return clamp(score);
}

// ── F4: 사용 시나리오 다양성 ──

function calcUseCaseDiversity(seedKeyword: string, candidateKeyword: string): number {
  const seedCases = findUseCases(seedKeyword);
  const candCases = findUseCases(candidateKeyword);

  const union = new Set([...seedCases, ...candCases]);
  const intersection = seedCases.filter((c) => candCases.includes(c));

  if (union.size === 0) return 50;

  const jaccardDist = 1.0 - intersection.length / union.size;
  return clamp(jaccardDist * 80 + 20);
}

// ── F5: 성장 신호 ──

function calcGrowthSignal(trendSlope?: number): number {
  if (trendSlope === undefined) return 50;
  return clamp(50 + trendSlope * 0.5);
}

// ── F6: 이커머스 유효성 ──

function calcEcommerceValidity(candidateKeyword: string): number {
  const intent = classifyKeywordIntent(candidateKeyword);
  const tokens = candidateKeyword.split(/\s+/);
  const tokenCount = tokens.length;

  const intentPenalty = intent.type === "informational" ? -20 : 0;
  const lengthScore = tokenCount >= 2 && tokenCount <= 5 ? 80 : tokenCount === 1 ? 50 : 30;
  const hasSubstance = tokens.some((t) => t.length >= 2);

  const score =
    lengthScore * 0.50 +
    (intent.intentScore * 0.5 + 25) * 0.30 +
    (hasSubstance ? 80 : 0) * 0.20 +
    intentPenalty;

  return clamp(score);
}

// ── F7: 대체재/스펙 가치 ──
// 브랜드명, 모델명, 스펙(인치, GB 등)이 포함된 키워드는 구매 결정에 가까움

function calcAlternativeValue(seedKeyword: string, candidateKeyword: string, source: string): number {
  const seedTokens = new Set(seedKeyword.split(/\s+/));
  const candTokens = candidateKeyword.split(/\s+/);
  const extraTokens = candTokens.filter((t) => !seedTokens.has(t));

  if (extraTokens.length === 0) return 20;

  let score = 30;

  // 실제 검색 데이터에서 왔고 시드와 다른 형태 = 대체재/경쟁제품 가능성
  const containsSeed = seedTokens.size > 0 &&
    Array.from(seedTokens).every((t) => candidateKeyword.includes(t));
  const isRealData = source === "autocomplete" || source === "deepAutocomplete" || source === "adRelated" || source === "brandExtract";

  if (!containsSeed && isRealData) {
    score += 40; // 대체재/경쟁제품 높은 확률
  }

  // 스펙 키워드 패턴 (숫자+단위)
  const specPattern = /\d+(인치|gb|tb|kg|ml|l|cm|mm|w|hz)/i;
  const hasSpec = extraTokens.some((t) => specPattern.test(t));
  if (hasSpec) score += 20;

  // 영문 브랜드/모델명 패턴
  const brandPattern = /^[A-Za-z]/;
  const hasBrand = extraTokens.some((t) => brandPattern.test(t) && t.length >= 2);
  if (hasBrand) score += 15;

  return clamp(score);
}

// ── 메인 ──

export function calcCreativityScore(input: ScoreInput): CreativityResult {
  const { seedKeyword, candidateKeyword, platform, monthlyVolume, competitionLevel, trendSlope, source } = input;

  const f1 = calcDiscoveryValue(seedKeyword, candidateKeyword, platform, source);
  const f2 = calcNichePotential(candidateKeyword, monthlyVolume, competitionLevel);
  const f3 = calcModifierUniqueness(seedKeyword, candidateKeyword);
  const f4 = calcUseCaseDiversity(seedKeyword, candidateKeyword);
  const f5 = calcGrowthSignal(trendSlope);
  const f6 = calcEcommerceValidity(candidateKeyword);
  const f7 = calcAlternativeValue(seedKeyword, candidateKeyword, source);

  const subfactors: CreativitySubFactor[] = [
    { key: "discoveryValue",      label: "발견 가치",      score: f1, weight: 0.15 },
    { key: "nichePotential",      label: "니치 마켓",      score: f2, weight: 0.25 },
    { key: "modifierUniqueness",  label: "독창적 수식어",   score: f3, weight: 0.12 },
    { key: "useCaseDiversity",    label: "새로운 사용법",   score: f4, weight: 0.08 },
    { key: "growthSignal",        label: "트렌드 상승",    score: f5, weight: 0.05 },
    { key: "ecommerceValidity",   label: "구매 유효성",    score: f6, weight: 0.10 },
    { key: "alternativeValue",    label: "대체재 발견",    score: f7, weight: 0.25 },
  ];

  const raw =
    f1 * 0.15 +
    f2 * 0.25 +
    f3 * 0.12 +
    f4 * 0.08 +
    f5 * 0.05 +
    f6 * 0.10 +
    f7 * 0.25;

  // 실제 검색 데이터 소스 보너스 (검증된 키워드)
  const isRealData = source === "autocomplete" || source === "deepAutocomplete" || source === "adRelated" || source === "brandExtract";
  const sourceBonus = isRealData ? 10 : 0;

  const validityGate = f6 < 30 && !isRealData ? 0.5 : 1.0;
  const score = clamp((raw + sourceBonus) * validityGate);

  const topSub = subfactors.reduce((a, b) => (a.score * a.weight > b.score * b.weight ? a : b));

  return {
    keyword: candidateKeyword,
    score,
    subfactors,
    topFactor: topSub.label,
    source,
  };
}

/**
 * 기회 분석 전용 Creativity Chance Score
 * 대체재/스펙(F7)이 최대 가중치, 니치 마켓(F2) 그 다음
 * F3~F5 제거, F1/F6 최소화
 */
export function calcCreativityChanceScore(input: ScoreInput): number {
  const { seedKeyword, candidateKeyword, platform, monthlyVolume, competitionLevel, trendSlope, source } = input;

  const f1 = calcDiscoveryValue(seedKeyword, candidateKeyword, platform, source);
  const f2 = calcNichePotential(candidateKeyword, monthlyVolume, competitionLevel);
  const f6 = calcEcommerceValidity(candidateKeyword);
  const f7 = calcAlternativeValue(seedKeyword, candidateKeyword, source);

  // 대체재/스펙 0.45 (최대) + 니치 마켓 0.30 (그 다음) + 발견 가치 0.15 + 구매 유효성 0.10
  const raw = f7 * 0.45 + f2 * 0.30 + f1 * 0.15 + f6 * 0.10;

  const isRealData = source === "autocomplete" || source === "deepAutocomplete" || source === "adRelated" || source === "brandExtract";
  const sourceBonus = isRealData ? 10 : 0;
  const validityGate = f6 < 30 && !isRealData ? 0.5 : 1.0;

  return clamp((raw + sourceBonus) * validityGate);
}
