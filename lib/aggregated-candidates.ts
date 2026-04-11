/**
 * STEP 4 최종 후보 비교용 키워드 후보 수집
 *
 * 클라이언트(FactorScoreAggregated)와 서버(analyze-run SSE) 양쪽에서 공유.
 * 같은 로직으로 후보를 뽑아야 스냅샷 프리컴퓨트와 즉시 렌더가 일치한다.
 */

import { sanitizeCandidateKeyword } from "./keyword-shape";

export interface CandidateWithSource {
  keyword: string;
  source: string;
}

export interface CandidateSources {
  v2?: unknown[] | null;
  creative?: unknown[] | null;
  graph?: unknown[] | null;
  sos?: unknown[] | null;
  variant?: unknown | null;
  modifiers?: Array<{ keyword: string }> | null;
}

const MAX_CANDIDATES = 100;

/**
 * 각 카드 상위 키워드 수집 후 어순 무관 중복 제거 (시드 우선 유지)
 * 최대 100개
 */
export function collectAggregatedCandidates(
  seedKeyword: string,
  sources: CandidateSources,
): CandidateWithSource[] {
  const candidates: CandidateWithSource[] = [];
  const push = (keyword: string | undefined, source: string) => {
    if (!keyword) return;
    const sanitized = sanitizeCandidateKeyword(keyword);
    if (!sanitized) return;
    candidates.push({ keyword: sanitized, source });
  };

  // 1) 시드 (원문 그대로 — 분석 대상 자체이므로 sanitize 우회)
  candidates.push({ keyword: seedKeyword, source: "seed" });

  // 2) V2 상위 25개
  if (Array.isArray(sources.v2)) {
    const top = sources.v2
      .map((raw) => raw as { keyword?: string; score?: number })
      .filter((kw) => kw?.keyword)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 25);
    for (const kw of top) push(kw.keyword, "기회분석");
  }

  // 3) Creative 상위 20개
  if (Array.isArray(sources.creative)) {
    const top = sources.creative
      .map((raw) => raw as { keyword?: string; score?: number })
      .filter((kw) => kw?.keyword)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 20);
    for (const kw of top) push(kw.keyword, "크리에이티브");
  }

  // 4) Graph 상위 15개
  if (Array.isArray(sources.graph)) {
    const top = sources.graph
      .map((raw) => raw as { keyword?: string; similarity?: number })
      .filter((kw) => kw?.keyword)
      .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
      .slice(0, 15);
    for (const kw of top) push(kw.keyword, "연관");
  }

  // 5) SOS 상위 15개
  if (Array.isArray(sources.sos)) {
    const top = sources.sos
      .map((raw) => raw as { keyword?: string; sosScore?: number })
      .filter((kw) => kw?.keyword)
      .sort((a, b) => (b.sosScore ?? 0) - (a.sosScore ?? 0))
      .slice(0, 15);
    for (const kw of top) push(kw.keyword, "시즌");
  }

  // 6) Variant — 음료수·과일 같은 광범위 시드는 variant에만 풍부할 수 있음 (상위 20개)
  if (sources.variant && typeof sources.variant === "object") {
    const v = sources.variant as { keywords?: Array<{ keyword: string }> };
    if (Array.isArray(v.keywords)) {
      const top = v.keywords.slice(0, 20);
      for (const kw of top) push(kw.keyword, "세부유형");
    }
  }

  // 7) Modifiers 상위 15개
  if (Array.isArray(sources.modifiers)) {
    const top = sources.modifiers.slice(0, 15);
    for (const kw of top) push(kw.keyword, "수식어");
  }

  // 중복 제거 (어순 무관)
  const seenKeys = new Set<string>();
  const deduped: CandidateWithSource[] = [];
  for (const c of candidates) {
    const key = c.keyword.trim().toLowerCase().split(/\s+/).sort().join(" ");
    if (key && !seenKeys.has(key)) {
      seenKeys.add(key);
      deduped.push(c);
    }
  }
  return deduped.slice(0, MAX_CANDIDATES);
}
