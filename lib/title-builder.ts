/**
 * 규칙 기반 상품 제목 + 태그 생성기
 *
 * 실제 상위 상품 제목에서 마이닝한 키워드를 조립하여
 * LLM 없이 "단어+단어+단어" 나열형 제목을 생성.
 * 후킹 정확히 1개 필수 포함.
 *
 * API 비용: 0 (OpenAI 미사용)
 */

import type { FactorScoreSet } from "./factor-model";
import type { TitleMinedKeyword } from "./title-miner";
import type { OntologyNode } from "./ontology/types";
import type { CategoryPoolKeyword } from "./category-pool";
import { FACTOR_LABELS, type ConclusionResult, type TitleTagCombo } from "./conclusion-generator";

// ── 타입 ─────────────────────────────────────────────────────────

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
  // 추가 데이터 (규칙 기반용)
  titleMinedKeywords: TitleMinedKeyword[];
  ontologyNode?: OntologyNode | null;
  categoryPoolKeywords?: CategoryPoolKeyword[];
}

// ── 후킹 풀 ──────────────────────────────────────────────────────

const HOOK_POOLS: Record<string, string[]> = {
  ranking:       ["베스트", "1위", "인기", "BEST"],
  conversion:    ["후기폭발", "재구매1위", "만족도최상", "리뷰대박"],
  growth:        ["신상", "트렌드", "요즘대세", "급상승"],
  profitability: ["초특가", "파격할인", "최저가", "가격인하"],
  entryBarrier:  ["한정수량", "품절임박", "오늘만", "긴급"],
  crossPlatform: ["TV방영", "SNS대란", "인스타화제", "유튜브추천"],
};

// ── 유틸 ─────────────────────────────────────────────────────────

function getTopFactor(factorScores: FactorScoreSet): { key: string; score: number } {
  const sorted = [...factorScores.factors].sort((a, b) => {
    // entryBarrier는 낮을수록 좋음 → 반전
    const aScore = a.key === "entryBarrier" ? 100 - a.score : a.score;
    const bScore = b.key === "entryBarrier" ? 100 - b.score : b.score;
    return bScore - aScore;
  });
  return sorted[0];
}

function selectHook(factorKey: string, seed: number): string {
  const pool = HOOK_POOLS[factorKey] ?? HOOK_POOLS.ranking;
  return pool[seed % pool.length];
}

/** 단어 단위 중복 체크 (공백 제거 후 비교) */
function normalizeToken(t: string): string {
  return t.replace(/\s+/g, "").toLowerCase();
}

function hasOverlap(token: string, usedNorm: Set<string>): boolean {
  const norm = normalizeToken(token);
  if (usedNorm.has(norm)) return true;
  // 부분 포함도 체크 (예: "삼겹살" in "한돈삼겹살")
  for (const used of usedNorm) {
    if (norm.length >= 3 && used.length >= 3) {
      if (norm.includes(used) || used.includes(norm)) return true;
    }
  }
  return false;
}

/** 토큰 후보 목록에서 greedy하게 제목 조립 */
function buildTitle(
  coreKeyword: string,
  hookWord: string,
  candidateTokens: string[],
  maxChars: number,
  frontLoadChars: number,
): string {
  const parts: string[] = [hookWord, coreKeyword];
  const usedNorm = new Set([normalizeToken(hookWord), normalizeToken(coreKeyword)]);
  let currentLen = hookWord.length + 1 + coreKeyword.length;

  for (const token of candidateTokens) {
    if (!token || token.length < 2) continue;
    if (hasOverlap(token, usedNorm)) continue;
    const addLen = 1 + token.length;
    if (currentLen + addLen > maxChars) continue;

    parts.push(token);
    usedNorm.add(normalizeToken(token));
    currentLen += addLen;
  }

  const result = parts.join(" ");

  // Naver: 핵심키워드가 앞 25자 안에 있는지 확인
  if (frontLoadChars > 0) {
    const idx = result.indexOf(coreKeyword);
    if (idx > frontLoadChars) {
      // 후킹과 핵심키워드 위치 교환
      const swapped = [coreKeyword, hookWord, ...parts.slice(2)].join(" ");
      return swapped;
    }
  }

  return result;
}

/** 제목에 안 쓰인 키워드 중 상위 N개를 태그로 선택 */
function buildTags(
  allKeywords: string[],
  titleText: string,
  count: number,
): string[] {
  const titleNorm = normalizeToken(titleText);
  const tags: string[] = [];
  const usedNorm = new Set<string>();

  for (const kw of allKeywords) {
    if (tags.length >= count) break;
    if (!kw || kw.length < 2) continue;
    const norm = normalizeToken(kw);
    if (usedNorm.has(norm)) continue;
    if (titleNorm.includes(norm) || norm.includes(normalizeToken(titleText.split(" ")[1] ?? ""))) continue;
    // 제목에 포함된 단어 건너뛰기
    const titleWords = titleText.split(" ").map(normalizeToken);
    if (titleWords.some(tw => tw === norm || (norm.length >= 3 && tw.includes(norm)))) continue;

    tags.push(kw);
    usedNorm.add(norm);
  }

  return tags;
}

function generateReasoning(highlightKey: string, factorScores: FactorScoreSet): string {
  const factor = factorScores.factors.find((f) => f.key === highlightKey);
  const label = FACTOR_LABELS[highlightKey];
  if (!factor || !label) return "데이터 기반 키워드 조합 전략";
  const desc = factor.key === "entryBarrier"
    ? (factor.score <= 40 ? label.lowDesc : label.highDesc)
    : (factor.score >= 60 ? label.highDesc : label.lowDesc);
  return `${label.name} ${factor.score}점 — ${desc}`;
}

// ── 메인 ─────────────────────────────────────────────────────────

export function buildTitlesRuleBased(input: TitleBuilderInput): ConclusionResult {
  const {
    keyword, platform, factorScores,
    recommendedKeywords, opportunityKeywords,
    creativeKeyword, topAggregatedKeyword, topVariantKeyword,
    titleMinedKeywords, ontologyNode, categoryPoolKeywords,
  } = input;

  const maxChars = platform === "naver" ? 50 : 100;
  const frontLoad = platform === "naver" ? 25 : 0;

  // 후킹 선택용 시드 (재생성 시 다른 결과를 위해 초 단위)
  const hookSeed = Math.floor(Date.now() / 1000);
  const topFactor = getTopFactor(factorScores);

  // ── 토큰 풀 구성 ──
  const minedTokens = titleMinedKeywords.map((t) => t.keyword);
  const variantTokens = ontologyNode?.variantKeywords ?? [];
  const seedTokens = (ontologyNode?.seedKeywords ?? []).flatMap((s) => s.split(/\s+/));
  const poolTokens = (categoryPoolKeywords ?? [])
    .filter((p) => p.monthlyTotal > 100)
    .map((p) => p.keyword);
  const recTokens = recommendedKeywords.map((k) => k.keyword);
  const oppTokens = (opportunityKeywords ?? []).map((k) => k.keyword);

  // 통합 풀 (우선순위: mined > variant > seed > pool > rec)
  const allPool = [...minedTokens, ...variantTokens, ...seedTokens, ...poolTokens, ...recTokens, ...oppTokens];

  const combos: TitleTagCombo[] = [];

  // ── 전략 1: 상위 노출 집중 ──
  {
    const hook = selectHook("ranking", hookSeed);
    const tokens = [...minedTokens, ...seedTokens, ...poolTokens];
    const title = buildTitle(keyword, hook, tokens, maxChars, frontLoad);
    const tags = buildTags(allPool, title, 10);
    combos.push({
      strategy: "상위 노출 집중",
      title,
      tags,
      reasoning: generateReasoning("ranking", factorScores),
      highlightFactor: "ranking",
    });
  }

  // ── 전략 2: 구체 니즈 타겟 ──
  {
    const variantKw = topVariantKeyword ?? variantTokens[0] ?? oppTokens[0];
    if (variantKw) {
      const hook = selectHook(topFactor.key, hookSeed + 1);
      const tokens = [...minedTokens, ...seedTokens, ...poolTokens].filter(
        (t) => normalizeToken(t) !== normalizeToken(variantKw)
      );
      const title = buildTitle(variantKw, hook, tokens, maxChars, frontLoad);
      const tags = buildTags(allPool, title, 10);
      combos.push({
        strategy: "구체 니즈 타겟",
        title,
        tags,
        reasoning: `"${variantKw}" 구체 변형 → 니즈 매칭으로 전환율 상승`,
        highlightFactor: topFactor.key,
      });
    }
  }

  // ── 전략 3: 기회 분석 진입 ──
  {
    const oppKw = oppTokens[0];
    if (oppKw) {
      const hook = selectHook("growth", hookSeed + 2);
      const tokens = [...minedTokens, ...seedTokens, ...poolTokens].filter(
        (t) => normalizeToken(t) !== normalizeToken(oppKw)
      );
      const title = buildTitle(oppKw, hook, tokens, maxChars, frontLoad);
      const tags = buildTags(allPool, title, 10);
      combos.push({
        strategy: "기회 분석 진입",
        title,
        tags,
        reasoning: generateReasoning("growth", factorScores),
        highlightFactor: "growth",
      });
    }
  }

  // ── 전략 4: 최종 후보 Top (있을 때만) ──
  if (topAggregatedKeyword) {
    const hook = selectHook(topAggregatedKeyword.topFactorKey, hookSeed + 3);
    const tokens = [...minedTokens, ...seedTokens, ...poolTokens].filter(
      (t) => normalizeToken(t) !== normalizeToken(topAggregatedKeyword.keyword)
    );
    const title = buildTitle(topAggregatedKeyword.keyword, hook, tokens, maxChars, frontLoad);
    const tags = buildTags(allPool, title, 10);
    combos.push({
      strategy: "최종 후보 Top",
      title,
      tags,
      reasoning: `종합 ${topAggregatedKeyword.overallScore}점 1위 — ${generateReasoning(topAggregatedKeyword.topFactorKey, factorScores)}`,
      highlightFactor: topAggregatedKeyword.topFactorKey,
    });
  }

  // ── 전략 5: 세부 유형 특화 (있을 때만, 전략2와 다른 키워드) ──
  if (topVariantKeyword && variantTokens.length > 1) {
    const altVariant = variantTokens.find(
      (v) => normalizeToken(v) !== normalizeToken(topVariantKeyword)
    );
    if (altVariant) {
      const hook = selectHook(topFactor.key, hookSeed + 4);
      const tokens = [...minedTokens, ...poolTokens, ...seedTokens];
      const title = buildTitle(altVariant, hook, tokens, maxChars, frontLoad);
      const tags = buildTags(allPool, title, 10);
      combos.push({
        strategy: "세부 유형 특화",
        title,
        tags,
        reasoning: `"${altVariant}" 특화 유형으로 틈새 진입`,
        highlightFactor: topFactor.key,
      });
    }
  }

  // ── 전략 6: 크리에이티브 (있을 때만) ──
  if (creativeKeyword) {
    const hook = selectHook("growth", hookSeed + 5);
    const tokens = [...minedTokens, ...seedTokens, ...poolTokens].filter(
      (t) => normalizeToken(t) !== normalizeToken(creativeKeyword)
    );
    const title = buildTitle(creativeKeyword, hook, tokens, maxChars, frontLoad);
    const tags = buildTags(allPool, title, 10);
    combos.push({
      strategy: "크리에이티브",
      title,
      tags,
      reasoning: `"${creativeKeyword}" 차별화 키워드로 경쟁 회피`,
      highlightFactor: "growth",
    });
  }

  // 최소 3개 보장: 부족하면 pool 기반 추가
  if (combos.length < 3 && poolTokens.length > 0) {
    const hook = selectHook("profitability", hookSeed + 6);
    const title = buildTitle(keyword, hook, [...poolTokens, ...minedTokens], maxChars, frontLoad);
    const tags = buildTags(allPool, title, 10);
    combos.push({
      strategy: "검색량 기반 노출",
      title,
      tags,
      reasoning: generateReasoning("profitability", factorScores),
      highlightFactor: "profitability",
    });
  }

  return { combinations: combos };
}
