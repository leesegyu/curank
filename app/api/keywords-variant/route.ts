/**
 * 세부 유형 키워드 추천 API
 *
 * 1순위: V2 온톨로지의 variantKeywords (LLM 큐레이션 + variant 집합)
 * 2순위(fallback): Ad API relKwdStat 중 "시드 포함" 키워드를 월 검색량 순으로
 *
 * 분류 실패(온톨로지 미정의 카테고리) 또는 variantKeywords 빈곤 시에도
 * 카드가 반드시 유용한 결과를 표시하도록 보장.
 */

import { NextRequest, NextResponse } from "next/server";
import NodeCache from "node-cache";
import { classifyKeywordV2, getNodesV2 } from "@/lib/ontology/index";
import { validateKeyword } from "@/lib/keyword-validator";
import { getNaverAdKeywords, totalMonthlyVolume } from "@/lib/naver-ad";
import { sanitizeCandidateKeyword } from "@/lib/keyword-shape";

interface VariantItem { keyword: string; volume?: number }
interface VariantResponse {
  keywords: VariantItem[];
  category: string | null;
  source: "ontology" | "api-fallback";
}

const cache = new NodeCache({ stdTTL: 3600, maxKeys: 500 });

const FALLBACK_LIMIT = 20;
const MIN_VARIANT_COUNT = 4; // 이 미만이면 Ad API로 보강/대체

export async function GET(req: NextRequest) {
  const rawKeyword = req.nextUrl.searchParams.get("keyword")?.trim();
  const validation = validateKeyword(rawKeyword);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const keyword = rawKeyword as string;

  const cacheKey = `var:${keyword}`;
  const l1 = cache.get<VariantResponse>(cacheKey);
  if (l1) return NextResponse.json(l1);

  // ═══════════════════════════════════════════════════════════════
  // 1) 온톨로지 variantKeywords 수집
  // ═══════════════════════════════════════════════════════════════
  let ontologyVariants: string[] = [];
  let categoryName: string | null = null;

  const classified = classifyKeywordV2(keyword, "smartstore");
  if (classified) {
    const nodes = getNodesV2(classified.platform);
    const currentNode = nodes.find((n) => n.id === classified.path);
    if (currentNode) {
      categoryName = currentNode.name;
      const seen = new Set<string>();
      for (const vk of currentNode.variantKeywords ?? []) {
        if (vk !== keyword && !seen.has(vk)) {
          seen.add(vk);
          ontologyVariants.push(vk);
        }
      }
      const children = nodes.filter((n) => n.parent === classified.path);
      for (const child of children) {
        for (const vk of child.variantKeywords ?? []) {
          if (vk !== keyword && !seen.has(vk)) {
            seen.add(vk);
            ontologyVariants.push(vk);
          }
        }
      }
    }
  }

  // 온톨로지 결과가 충분하면 그대로 반환
  if (ontologyVariants.length >= MIN_VARIANT_COUNT) {
    const response: VariantResponse = {
      keywords: ontologyVariants.map((kw) => ({ keyword: kw })),
      category: categoryName,
      source: "ontology",
    };
    cache.set(cacheKey, response);
    return NextResponse.json(response);
  }

  // ═══════════════════════════════════════════════════════════════
  // 2) Ad API fallback — "시드 포함" 키워드 상위 N개
  //    - 분류 실패, 또는 온톨로지 variantKeywords가 빈약한 경우
  //    - 진짜 사용자 검색 기반 고품질 변형을 확보
  // ═══════════════════════════════════════════════════════════════
  if (!classified) {
    console.warn(`[variant] 온톨로지 미분류: "${keyword}" — Ad API fallback 적용`);
  }

  let adFallback: VariantItem[] = [];
  try {
    const ads = await getNaverAdKeywords(keyword);
    const seedNorm = keyword.trim().toLowerCase().replace(/\s+/g, "");

    adFallback = ads
      .map((k) => {
        const sanitized = sanitizeCandidateKeyword(k.relKeyword);
        if (!sanitized) return null;
        const normalized = sanitized.toLowerCase().replace(/\s+/g, "");
        // 시드 자체는 제외, 시드를 포함하는 변형만
        if (normalized === seedNorm) return null;
        if (!normalized.includes(seedNorm)) return null;
        return { keyword: sanitized, volume: totalMonthlyVolume(k) };
      })
      .filter((x): x is VariantItem & { volume: number } => x !== null)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, FALLBACK_LIMIT);
  } catch (err) {
    console.warn(`[variant] Ad API fallback 실패:`, err instanceof Error ? err.message : err);
  }

  // 온톨로지 + 폴백 병합 (온톨로지 우선, 중복 제거)
  const seenFinal = new Set<string>();
  const merged: VariantItem[] = [];
  for (const kw of ontologyVariants) {
    if (!seenFinal.has(kw)) {
      seenFinal.add(kw);
      merged.push({ keyword: kw });
    }
  }
  for (const item of adFallback) {
    if (!seenFinal.has(item.keyword)) {
      seenFinal.add(item.keyword);
      merged.push(item);
    }
  }

  const response: VariantResponse = {
    keywords: merged,
    category: categoryName,
    source: classified && ontologyVariants.length > 0 ? "ontology" : "api-fallback",
  };

  if (merged.length > 0) cache.set(cacheKey, response);
  return NextResponse.json(response);
}
