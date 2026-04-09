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
import type { Platform as OntoPlatform } from "@/lib/ontology/types";
import {
  CREATIVE_MODIFIERS,
  isCommonModifier,
  isCreativeModifier,
} from "@/lib/ontology/use-case-bridges";
import { calcCreativityScore, type CreativityResult } from "@/lib/creativity-score";
import { getNaverShoppingAutocomplete } from "@/lib/naver-ad";
import { searchNaver } from "@/lib/naver";

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
  const keyword = req.nextUrl.searchParams.get("keyword")?.trim();
  const platform = (req.nextUrl.searchParams.get("platform") ?? "naver") as Platform;

  if (!keyword) {
    return NextResponse.json({ error: "keyword required" }, { status: 400 });
  }

  const kw = keyword;
  const op = ontoPlatform(platform);
  const seedClass = classifyKeyword(kw, op);
  const seedPath = seedClass?.path;
  const coreTokens = kw.split(/\s+/);

  const candidates = new Set<string>();
  const candidateSources = new Map<string, string>();

  // 시드 포함 필수인 후보 추가 (수식어 조합용)
  function addTemplateCandidate(candidate: string, source: string) {
    const trimmed = candidate.trim();
    if (trimmed === kw || candidates.has(trimmed)) return;
    if (trimmed.length < 4) return;
    if (!coreTokens.every((t) => trimmed.includes(t))) return;
    candidates.add(trimmed);
    candidateSources.set(trimmed, source);
  }

  // 실제 검색 데이터 후보 추가 (시드 미포함 허용 — 자동완성에서 온 실제 키워드)
  function addRealCandidate(candidate: string, source: string) {
    const trimmed = candidate.trim();
    if (trimmed === kw || candidates.has(trimmed)) return;
    if (trimmed.length < 2) return;
    candidates.add(trimmed);
    candidateSources.set(trimmed, source);
  }

  // ══════════════════════════════════════════════════════════
  // 소스 1: 네이버 쇼핑 자동완성 (실제 검색 데이터, 무료)
  // ══════════════════════════════════════════════════════════
  try {
    const autocomplete = await getNaverShoppingAutocomplete(kw);
    for (const ac of autocomplete) {
      addRealCandidate(ac, "autocomplete");
    }

    // 2차 자동완성: 시드와 다른 형태의 키워드로 더 깊은 탐색
    const secondarySeeds = autocomplete
      .filter((ac) => !coreTokens.every((t) => ac.includes(t)) && ac.length >= 2)
      .slice(0, 3);

    const secondaryResults = await Promise.allSettled(
      secondarySeeds.map((seed) => getNaverShoppingAutocomplete(seed))
    );
    for (const result of secondaryResults) {
      if (result.status === "fulfilled") {
        for (const ac of result.value.slice(0, 5)) {
          addRealCandidate(ac, "deepAutocomplete");
        }
      }
    }
  } catch {
    // 자동완성 실패 시 무시
  }

  // ══════════════════════════════════════════════════════════
  // 소스 1-B: Naver Ad API 연관 키워드 (v2에서 이미 캐시됨)
  // v2 전체 결과 중 기존 카드에 표시 안 되는 하위 키워드도 활용
  // ══════════════════════════════════════════════════════════
  try {
    const v2Url = new URL("/api/keywords-v2", req.nextUrl.origin);
    v2Url.searchParams.set("keyword", kw);
    const v2Res = await fetch(v2Url.toString());
    if (v2Res.ok) {
      const v2Data = await v2Res.json();
      // v2 전체 결과에서 시드와 다른 형태 또는 브랜드+시드 키워드 추가
      for (const k of (v2Data.keywords ?? [])) {
        const kwStr = k.keyword as string;
        if (!coreTokens.every((t: string) => kwStr.includes(t))) {
          // 시드를 포함하지 않는 연관 키워드 = 브랜드/스펙/대체재
          addRealCandidate(kwStr, "adRelated");
        } else {
          // 시드 포함이지만 추가 토큰이 브랜드/스펙인 경우도 포함
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
    // v2 실패 시 무시
  }

  // ══════════════════════════════════════════════════════════
  // 소스 1-C: 네이버 쇼핑 검색 결과에서 브랜드/제조사 추출
  // "청소기" → 삼성, 샤오미, LG전자 등 실제 판매 브랜드 발굴
  // ══════════════════════════════════════════════════════════
  try {
    const shopResult = await searchNaver(kw, 40);
    const brandSet = new Set<string>();
    for (const item of shopResult.items) {
      if (item.brand && item.brand.length >= 2) brandSet.add(item.brand);
      if (item.maker && item.maker.length >= 2) brandSet.add(item.maker);
    }
    // 브랜드 출현 빈도로 정렬 (더 많이 팔리는 브랜드 우선)
    const brandCount = new Map<string, number>();
    for (const item of shopResult.items) {
      const b = item.brand || item.maker;
      if (b && b.length >= 2) brandCount.set(b, (brandCount.get(b) ?? 0) + 1);
    }
    const topBrands = [...brandCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([b]) => b);

    for (const brand of topBrands) {
      // "브랜드 + 시드" 조합 (예: "삼성 청소기", "샤오미 청소기")
      addRealCandidate(`${brand} ${kw}`, "brandExtract");
    }
  } catch {
    // 쇼핑 검색 실패 시 무시
  }

  // ══════════════════════════════════════════════════════════
  // 소스 2: 창의적 수식어 × 시드 키워드 (정적 조합)
  // "노트북" → "직장인 노트북", "대학생 노트북", "재택근무 노트북"
  // ══════════════════════════════════════════════════════════
  const allModifiers = Object.values(CREATIVE_MODIFIERS).flat();
  for (const mod of allModifiers) {
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
