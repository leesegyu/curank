/**
 * 크리에이티브 발굴 키워드 추천 API
 * GET /api/keywords-creative?keyword=노트북&platform=naver
 *
 * 2가지 소스:
 * 1) 실제 검색 데이터 (네이버 쇼핑 자동완성, 무료) → "LG그램", "맥북", "25인치" 등
 * 2) 창의적 수식어 조합 (정적) → "캠핑 노트북", "1인가구 노트북 세트" 등
 *
 * 기존 v2/Blue Ocean/Graph 카드와 중복되는 키워드는 제거
 */

import { NextRequest, NextResponse } from "next/server";
import {
  classifyKeyword,
  getNodes,
} from "@/lib/ontology";
import { calcOntologyRelevance } from "@/lib/ontology-relevance";
import type { Platform as OntoPlatform } from "@/lib/ontology/types";
import {
  getFilteredModifiers,
  isCommonModifier,
  isCreativeModifier,
} from "@/lib/ontology/use-case-bridges";
import { calcCreativityScore, type CreativityResult } from "@/lib/creativity-score";
import { getNaverShoppingAutocomplete } from "@/lib/naver-ad";
import { searchNaver } from "@/lib/naver";
import { getL2Cache } from "@/lib/cache-db";
import { v2Cache, V2_CACHE_TYPE, type KeywordV2 } from "@/app/api/keywords-v2/route";
import { validateKeyword } from "@/lib/keyword-validator";
import { sanitizeCandidateKeyword } from "@/lib/keyword-shape";

type Platform = "naver" | "coupang";

function ontoPlatform(p: Platform): OntoPlatform {
  return p === "coupang" ? "coupang" : "smartstore";
}

export interface CreativeKeyword {
  keyword: string;
  score: number;
  topFactor: string;
  source: string;
  subfactors: { key: string; label: string; score: number }[];
}

export async function GET(req: NextRequest) {
  const rawKeyword = req.nextUrl.searchParams.get("keyword")?.trim();
  const platform = (req.nextUrl.searchParams.get("platform") ?? "naver") as Platform;

  const validation = validateKeyword(rawKeyword);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const keyword = rawKeyword as string;

  const kw = keyword;
  const op = ontoPlatform(platform);
  const seedClass = classifyKeyword(kw, op);
  const seedPath = seedClass?.path;
  const coreTokens = kw.split(/\s+/);

  const candidates = new Set<string>();
  const candidateSources = new Map<string, string>();

  // 시드 포함 필수인 후보 추가 (수식어 조합용)
  function addTemplateCandidate(candidate: string, source: string) {
    const sanitized = sanitizeCandidateKeyword(candidate);
    if (!sanitized || sanitized === kw || candidates.has(sanitized)) return;
    if (sanitized.length < 4) return;
    if (!coreTokens.every((t) => sanitized.includes(t))) return;
    candidates.add(sanitized);
    candidateSources.set(sanitized, source);
  }

  // 실제 검색 데이터 후보 추가 (시드 미포함 허용 — 자동완성에서 온 실제 키워드)
  function addRealCandidate(candidate: string, source: string) {
    const sanitized = sanitizeCandidateKeyword(candidate);
    if (!sanitized || sanitized === kw || candidates.has(sanitized)) return;
    candidates.add(sanitized);
    candidateSources.set(sanitized, source);
  }

  // ══════════════════════════════════════════════════════════
  // 소스 1: 네이버 쇼핑 자동완성 (무료, 1회 호출)
  // ══════════════════════════════════════════════════════════
  // 소스 1-C: 네이버 쇼핑 검색에서 브랜드 추출 (1회 호출, L1 캐시)
  // ══════════════════════════════════════════════════════════
  // 두 소스를 병렬 호출 → 총 최대 2 API 콜
  const [acResult, shopResult] = await Promise.allSettled([
    getNaverShoppingAutocomplete(kw),
    searchNaver(kw, 40),
  ]);

  if (acResult.status === "fulfilled") {
    for (const ac of acResult.value) {
      addRealCandidate(ac, "autocomplete");
    }
  }
  // 2차 자동완성 제거: 시드와 무관한 키워드를 시드로 재탐색하면
  // 대부분 온톨로지 필터에서 걸러짐 (기존 측정: 2차→최종 생존율 ~12%)
  // → 3회 API 호출 절약, 결과 품질 동일

  // ══════════════════════════════════════════════════════════
  // 소스 1-B: v2 캐시에서 연관 키워드 읽기 (API 호출 0회)
  // v2가 이미 호출됐으면 L1/L2 캐시에서 읽고, 아니면 건너뜀
  // 기존: fetch("/api/keywords-v2") → v2 풀파이프라인 재실행 (~30 API 콜)
  // 개선: 캐시 읽기만 → 0 API 콜
  // ══════════════════════════════════════════════════════════
  try {
    // L1 우선 (v2와 동일 프로세스면 즉시 히트), L2 폴백 (Supabase)
    let v2Keywords: KeywordV2[] | null = v2Cache.get<KeywordV2[]>(kw) ?? null;
    if (!v2Keywords) {
      v2Keywords = await getL2Cache<KeywordV2[]>(kw, V2_CACHE_TYPE);
    }
    if (v2Keywords) {
      for (const k of v2Keywords) {
        const kwStr = k.keyword;
        if (!coreTokens.every((t: string) => kwStr.includes(t))) {
          addRealCandidate(kwStr, "adRelated");
        } else {
          const kwTokens = kwStr.split(/\s+/);
          const extraTokens = kwTokens.filter((t: string) => !coreTokens.includes(t));
          if (extraTokens.length > 0) {
            const hasBrandOrSpec = extraTokens.some((t: string) =>
              t.length >= 2 && !isCommonModifier(t) && !isCreativeModifier(t)
            );
            if (hasBrandOrSpec) {
              addRealCandidate(kwStr, "adRelated");
            }
          }
        }
      }
    }
  } catch {
    // v2 캐시 읽기 실패 시 무시 — 다른 소스로 보완
  }

  // ══════════════════════════════════════════════════════════
  // 소스 1-C: 네이버 쇼핑 검색 결과에서 브랜드/제조사 추출
  // (위에서 병렬 호출한 shopResult 재사용 — 추가 API 호출 0회)
  // ══════════════════════════════════════════════════════════
  if (shopResult.status === "fulfilled") {
    const brandCount = new Map<string, number>();
    for (const item of shopResult.value.items) {
      const b = item.brand || item.maker;
      if (b && b.length >= 2) brandCount.set(b, (brandCount.get(b) ?? 0) + 1);
    }
    const topBrands = [...brandCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([b]) => b);

    for (const brand of topBrands) {
      addRealCandidate(`${brand} ${kw}`, "brandExtract");
    }
  }

  // ══════════════════════════════════════════════════════════
  // 소스 2: 창의적 수식어 × 시드 키워드 (카테고리 필터링)
  // "텐트" (sports) → "캠핑 텐트", "1인가구 텐트" (O)
  //                 → "유기농 텐트", "저칼로리 텐트" (X, food 전용)
  // ══════════════════════════════════════════════════════════
  const filteredModifiers = getFilteredModifiers(seedPath);
  for (const mod of filteredModifiers) {
    addTemplateCandidate(`${mod} ${kw}`, "modifier");
    addTemplateCandidate(`${kw} ${mod}`, "modifier");
  }

  // ══════════════════════════════════════════════════════════
  // 소스 3: 같은 L2 내 형제 노드 맥락 (온톨로지)
  // "노트북" → "노트북 모니터", "키보드 노트북"
  // ══════════════════════════════════════════════════════════
  if (seedPath) {
    const nodes = getNodes(op);
    const seedParts = seedPath.split(".");
    if (seedParts.length >= 3) {
      const l2Prefix = seedParts.slice(0, 3).join(".");
      for (const node of nodes) {
        if (node.id.startsWith(l2Prefix) && node.id !== seedPath && node.level >= 3) {
          addTemplateCandidate(`${kw} ${node.name}`, "siblingContext");
        }
      }
    }
  }

  // ══════════════════════════════════════════════════════════
  // 소스 4: 복합 수식어 (목적 + 시드 + 접미어)
  // "선물용 노트북 세트", "1인가구 노트북 패키지"
  // ══════════════════════════════════════════════════════════
  const highValueMods = ["선물용", "1인가구", "프리미엄", "미니", "대용량"];
  const contextMods = ["세트", "패키지", "용품", "추천"];
  for (const hv of highValueMods) {
    for (const ctx of contextMods) {
      addTemplateCandidate(`${hv} ${kw} ${ctx}`, "compound");
    }
  }

  // ══════════════════════════════════════════════════════════
  // 연관도 필터: 시드와 완전 무관한 키워드 사전 차단
  // 예: "게이밍 의자" → "왕새우", "오징어" 등 다른 L1 카테고리 키워드 제거
  // ══════════════════════════════════════════════════════════
  const seedTokensForFilter = kw.split(/\s+/);
  for (const candidate of [...candidates]) {
    const containsSeedToken = seedTokensForFilter.some((t) => candidate.includes(t));
    if (!containsSeedToken) {
      // 시드 토큰을 전혀 포함하지 않는 키워드 → 온톨로지 연관도 검사
      const rel = calcOntologyRelevance(kw, candidate);
      if (rel.score < 15) {
        candidates.delete(candidate);
        candidateSources.delete(candidate);
      }
    }
  }

  // ══════════════════════════════════════════════════════════
  // Creativity Score 계산 + 필터링
  // ══════════════════════════════════════════════════════════
  const results: CreativityResult[] = [];

  for (const candidate of candidates) {
    const result = calcCreativityScore({
      seedKeyword: kw,
      candidateKeyword: candidate,
      platform: op,
      source: candidateSources.get(candidate) ?? "unknown",
    });
    results.push(result);
  }

  // 점수 내림차순 정렬
  const sorted = results.sort((a, b) => b.score - a.score);

  // 토큰 집합이 동일한 키워드 중복 제거 (어순만 다른 경우)
  const seen = new Set<string>();
  const deduped: CreativityResult[] = [];
  for (const r of sorted) {
    const tokenKey = r.keyword.split(/\s+/).sort().join(" ");
    if (!seen.has(tokenKey)) {
      seen.add(tokenKey);
      deduped.push(r);
    }
  }

  // 상위 20개 (CS 최소 기준 없음 — 실제 검색 데이터는 모두 가치 있음)
  const keywords: CreativeKeyword[] = deduped.slice(0, 20).map((r) => ({
    keyword: r.keyword,
    score: r.score,
    topFactor: r.topFactor,
    source: r.source,
    subfactors: r.subfactors.map((s) => ({ key: s.key, label: s.label, score: s.score })),
  }));

  return NextResponse.json({ keywords });
}
