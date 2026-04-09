import { searchNaver } from "./naver";
import NodeCache from "node-cache";

const acCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

// ─── 의도별 e-커머스 템플릿 ────────────────────────────────────
const INTENT_SUFFIXES: { intent: string; suffixes: string[] }[] = [
  {
    intent: "탐색",
    suffixes: ["추천", "순위", "비교", "후기", "리뷰", "베스트"],
  },
  {
    intent: "가격",
    suffixes: ["가성비", "저렴한", "할인", "최저가", "가격"],
  },
  {
    intent: "상황",
    suffixes: ["선물", "세트", "2개", "대용량"],
  },
  {
    intent: "타겟",
    suffixes: ["여성용", "남성용", "어린이", "1인용", "가정용"],
  },
];

// ─── Naver 자동완성 (무료, 인증 불필요) ──────────────────────────
async function getNaverAutocomplete(keyword: string): Promise<string[]> {
  const cached = acCache.get<string[]>(`nac:${keyword}`);
  if (cached) return cached;
  try {
    const url = `https://ac.search.naver.com/nx/ac?q=${encodeURIComponent(keyword)}&con=1&frm=nv&ans=2&r_format=json&r_enc=UTF-8`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible)" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = await res.json();
    // 응답 형식: { items: [[["keyword1", "0"], ["keyword2", "0"], ...]] }
    const items = json?.items?.[0] ?? [];
    const result = items.map((item: string[]) => item[0]).filter(Boolean).slice(0, 10) as string[];
    if (result.length > 0) acCache.set(`nac:${keyword}`, result);
    return result;
  } catch {
    return [];
  }
}

// ─── 후보 키워드 생성 ─────────────────────────────────────────────
function generateCandidates(keyword: string, autocomplete: string[]): string[] {
  const candidates = new Set<string>(autocomplete);

  // 의도별 템플릿 확장
  for (const { suffixes } of INTENT_SUFFIXES) {
    for (const suffix of suffixes) {
      candidates.add(`${keyword} ${suffix}`);
    }
  }

  // 복합어 분해: "무선 청소기" → ["무선청소기", "청소기"]
  const parts = keyword.trim().split(/\s+/);
  if (parts.length > 1) {
    candidates.add(parts.join("")); // 붙여쓰기
    parts.slice(1).forEach((p) => candidates.add(p)); // 단어별
  }

  // 원래 키워드 제외, 너무 짧은 것 제외
  candidates.delete(keyword);
  return Array.from(candidates).filter((c) => c.length >= 2).slice(0, 50);
}

// ─── Blue Ocean Score 계산 ────────────────────────────────────────
// demand × trend / competition^0.55
// demand: 자동완성 순위 기반 (1위=100, 10위=15, 자동완성 외=30)
// competition: Naver Shopping totalCount (공급량)
function calcScore(acRank: number | null, totalCount: number): number {
  const demand = acRank !== null ? Math.max(100 - acRank * 9, 10) : 30;
  const competitionPenalty = Math.pow(totalCount + 1, 0.55);
  return Math.round((demand * 1000) / competitionPenalty);
}

function competitionLevel(count: number): "낮음" | "보통" | "높음" | "매우 높음" {
  if (count < 1_000) return "낮음";
  if (count < 10_000) return "보통";
  if (count < 50_000) return "높음";
  return "매우 높음";
}

function opportunityTier(score: number): "최고" | "좋음" | "보통" | "낮음" {
  if (score >= 500) return "최고";
  if (score >= 150) return "좋음";
  if (score >= 50) return "보통";
  return "낮음";
}

export interface KeywordOpportunity {
  keyword: string;
  competition: number;           // Naver Shopping totalCount
  competitionLevel: ReturnType<typeof competitionLevel>;
  score: number;                 // Blue Ocean Score
  tier: ReturnType<typeof opportunityTier>;
  fromAutocomplete: boolean;
  intent?: string;               // 탐색/가격/상황/타겟
}

// ─── 메인 추천 함수 ───────────────────────────────────────────────
export async function getKeywordRecommendations(keyword: string): Promise<KeywordOpportunity[]> {
  // 1. Naver 자동완성
  const autocomplete = await getNaverAutocomplete(keyword);
  const acMap = new Map(autocomplete.map((kw, i) => [kw, i]));

  // 2. 후보 생성
  const candidates = generateCandidates(keyword, autocomplete);

  // 3. 경쟁 상품 수 조회 (배치 5개, 병렬)
  const BATCH = 5;
  const results: KeywordOpportunity[] = [];

  for (let i = 0; i < candidates.length; i += BATCH) {
    const batch = candidates.slice(i, i + BATCH);
    const fetched = await Promise.all(
      batch.map(async (kw) => {
        try {
          const r = await searchNaver(kw, 1);
          return { keyword: kw, totalCount: r.total };
        } catch {
          return { keyword: kw, totalCount: 999_999 };
        }
      })
    );

    for (const item of fetched) {
      const acRank = acMap.has(item.keyword) ? acMap.get(item.keyword)! : null;
      const score = calcScore(acRank, item.totalCount);

      // 의도 분류
      let intent: string | undefined;
      for (const { intent: name, suffixes } of INTENT_SUFFIXES) {
        if (suffixes.some((s) => item.keyword.includes(s))) {
          intent = name;
          break;
        }
      }

      results.push({
        keyword: item.keyword,
        competition: item.totalCount,
        competitionLevel: competitionLevel(item.totalCount),
        score,
        tier: opportunityTier(score),
        fromAutocomplete: acRank !== null,
        intent,
      });
    }

    // 배치 간 딜레이 (레이트 리밋 방지)
    if (i + BATCH < candidates.length) {
      await new Promise((r) => setTimeout(r, 80));
    }
  }

  // 4. 정렬 + 필터 + 상위 50개
  return results
    .filter((r) => r.competition < 300_000) // 레드오션 제외
    .sort((a, b) => b.score - a.score)
    .slice(0, 50);
}
