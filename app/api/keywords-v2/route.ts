/**
 * 키워드 기회 분석 API (v2 — 통합 KOS)
 * GET /api/keywords-v2?keyword=에어팟
 *
 * Keyword Opportunity Score (KOS) 구성 요소:
 *   scoreDemand      — 실검색량 (Naver Ad API)
 *   scoreIntent      — 구매 의도율 (클릭/검색, Li et al. 2019 검증: 3.7× CVR)
 *   scoreSpecificity — 키워드 구체성 / 롱테일 (Brynjolfsson 2011: 전환율 2.5×)
 *   scoreGrowth      — 검색량 성장률 (Choi & Varian 2012: 미래 매출 예측 r=0.73)
 *   scorePenetrability — 진입 용이성 (Jungle Scout: top-3 리뷰 중앙값 역수)
 *   scoreRelation    — 연관도 (D 그래프 BFS)
 *
 * 롱테일 전략:
 *   Ad API 후보 + 롱테일 템플릿 확장 → 구체성 높은 저경쟁 키워드 발굴
 */

import { NextRequest, NextResponse }    from "next/server";
import NodeCache                         from "node-cache";
import {
  getNaverAdKeywordsForHints,
  getNaverShoppingAutocomplete,
  totalMonthlyVolume,
} from "@/lib/naver-ad";
import { calcMomentumScores }            from "@/lib/trend-momentum";
import { bfsKeywords, upsertAutocompleteEdges } from "@/lib/keyword-graph";
import { getL2Cache, setL2Cache }        from "@/lib/cache-db";
import { classifyKeywordIntent, intentMultiplier, specificityMultiplier } from "@/lib/intent-classifier";
import { generateOntologyLongtails, classifyKeyword } from "@/lib/ontology";
import { calcOntologyRelevance } from "@/lib/ontology-relevance";
import { searchNaver } from "@/lib/naver";
import { calcCreativityScore, calcCreativityChanceScore } from "@/lib/creativity-score";
import { validateKeyword } from "@/lib/keyword-validator";
import { getAdKeywordsWithPool } from "@/lib/category-pool";
import type { Platform as OntoPlatform } from "@/lib/ontology/types";

export const V2_CACHE_TYPE = "keywords_v2_20"; // v20: substring 가점 + 분류 실패 시 substring 강제 필터
const CACHE_TYPE = V2_CACHE_TYPE; // 기존 코드 호환용 alias
/** L1 인메모리 캐시 — keywords-creative에서도 읽기 전용으로 참조 */
export const v2Cache = new NodeCache({ stdTTL: 3600 });
const cache = v2Cache; // 기존 코드 호환용 alias

/** 풀 메타 캐시 (poolSource/poolFetchedAt) — v2Cache와 동기 갱신 */
interface V2Meta { poolSource: "pool" | "api" | null; poolFetchedAt: string | null }
const v2MetaCache = new NodeCache({ stdTTL: 3600, maxKeys: 500 });
const META_L2_TYPE = "keywords_v2_meta_20";

export interface KeywordV2 {
  keyword: string;
  // ─── 종합 점수 ────────────────────────────────────────────────────
  // volumeConfirmed=true:  0~1000 (전체 KOS 공식)
  // volumeConfirmed=false: 0~100  (NLP 신호만)
  score: number;
  // ─── 서브 점수 (각 0~100) ────────────────────────────────────────
  scoreDemand:        number;
  scoreIntent:        number;
  scoreSpecificity:   number;
  scoreGrowth:        number;
  scorePenetrability: number;
  scoreRelation:      number;
  scoreCreativity:    number;  // 수요선점 (Creativity Score)
  scoreChance:        number;  // 기회 발굴 (Creativity Chance Score)
  // ─── 메타 ─────────────────────────────────────────────────────────
  competitionLevel:  "낮음" | "보통" | "높음" | "매우 높음";
  monthlyVolume:     number;
  trendDirection:    "상승" | "하락" | "안정";
  trendSlope:        number;
  intentType:        "transactional" | "informational" | "neutral";
  isLongTail:        boolean;
  /** false = Ad API 검색량 미확인, NLP 점수만 사용 */
  volumeConfirmed:   boolean;
}

// ─── 롱테일 후보 생성 ─────────────────────────────────────────────

/** 시드 키워드 기반 롱테일 수식어 템플릿 */
// 모든 카테고리에 적용 가능한 범용 수식어
const UNIVERSAL_TEMPLATES = [
  "{kw} 가성비", "{kw} 최저가", "{kw} 저렴한", "{kw} 할인",
  "{kw} 추천", "{kw} 세트", "{kw} 대용량", "{kw} 1인용",
  "{kw} 선물", "{kw} 인기",
];
// 카테고리 태깅된 수식어 그룹 — L1 카테고리 기반 필터링
interface TemplateGroup {
  templates: string[];
  allow: string[] | null; // null = 전체 카테고리, 배열 = 해당 L1만
}
const TEMPLATE_GROUPS: TemplateGroup[] = [
  // 전자기기 수식어
  { templates: ["{kw} 무선", "{kw} 블루투스", "{kw} 충전식"], allow: ["digital", "sports", "leisure"] },
  // 구조/경량 수식어
  { templates: ["{kw} 접이식", "{kw} 경량", "{kw} 휴대용"], allow: ["digital", "sports", "furniture", "baby", "leisure"] },
  // 캠핑용
  { templates: ["{kw} 캠핑용"], allow: ["sports", "food", "furniture", "digital", "health"] },
  // 실내 용도 — 범용
  { templates: ["{kw} 가정용", "{kw} 사무용"], allow: null },
  // 인구통계 — 범용
  { templates: ["{kw} 남성용", "{kw} 여성용", "{kw} 아동용"], allow: null },
  // 침구/패브릭 사이즈
  { templates: ["{kw} 퀸사이즈", "{kw} 싱글", "{kw} 킹사이즈"], allow: ["health", "furniture"] },
  // 소재/촉감
  { templates: ["{kw} 순면", "{kw} 극세사", "{kw} 냉감"], allow: ["health", "fashion", "furniture", "baby"] },
  // 계절
  { templates: ["{kw} 여름용", "{kw} 겨울용", "{kw} 사계절"], allow: ["health", "fashion", "furniture", "sports", "baby", "accessory"] },
  // 식품 전용
  { templates: ["{kw} 국내산", "{kw} 유기농", "{kw} 소포장", "{kw} 선물세트"], allow: ["food"] },
];
// 식품 키워드 판별 (온톨로지 L1 기반)
const FOOD_KEYWORDS = ["식품", "과일", "채소", "수산", "축산", "건강식품", "음료", "간식", "반찬", "김치", "쌀", "견과", "참외", "수박", "사과", "배", "포도", "딸기", "감", "귤", "망고", "바나나", "멜론", "복숭아", "자두", "체리", "블루베리", "토마토", "고구마", "감자", "양파", "마늘"];

function isLikelyFood(seed: string): boolean {
  return FOOD_KEYWORDS.some((f) => seed.includes(f));
}

function getSeedL1Category(seed: string): string | null {
  const classified = classifyKeyword(seed, "smartstore");
  if (!classified) return null;
  const parts = classified.path.split(".");
  return parts.length >= 2 ? parts[1] : null;
}

function generateLongtailCandidates(seed: string): string[] {
  const l1 = getSeedL1Category(seed);
  const templates = [...UNIVERSAL_TEMPLATES];

  if (l1) {
    for (const group of TEMPLATE_GROUPS) {
      if (group.allow === null || group.allow.includes(l1)) {
        templates.push(...group.templates);
      }
    }
  } else {
    // 미분류 폴백: 안전한 범용 수식어만
    if (isLikelyFood(seed)) {
      templates.push("{kw} 국내산", "{kw} 유기농", "{kw} 소포장", "{kw} 선물세트");
    } else {
      templates.push("{kw} 가정용", "{kw} 사무용", "{kw} 남성용", "{kw} 여성용", "{kw} 아동용");
    }
  }

  return templates
    .map((t) => t.replace("{kw}", seed))
    .filter((kw) => kw.trim().split(/\s+/).length >= 2);
}

// ─── 서브스코어 계산 ──────────────────────────────────────────────

/** 검색 수요: log 스케일 0-100 */
function calcDemandScore(volume: number): number {
  if (volume <= 0) return 0;
  return Math.min(Math.round((Math.log10(volume + 1) / 6) * 100), 100);
}

/** 구매 의도: 클릭/검색 비율 (0-100). 30% = 100점 */
function calcIntentScore(clicks: number, volume: number): number {
  if (volume <= 0) return 0;
  return Math.min(Math.round((clicks / volume) * 333), 100);
}

/** 성장률: trendSlope -100~+100 → 0~100점 */
function calcGrowthScore(trendSlope: number): number {
  return Math.max(0, Math.min(100, Math.round(50 + trendSlope)));
}

/** 진입 용이성: compIdx → 0-100 */
const PENETRABILITY: Record<string, number> = {
  "낮음":    90,
  "보통":    55,
  "높음":    18,
  "매우 높음": 5,
};

/** 연관도: 그래프 weight log 스케일 */
function calcRelationScore(graphWeight: number): number {
  if (graphWeight <= 0) return 0;
  return Math.min(Math.round(Math.log(graphWeight + 1) * 30), 100);
}

/** 광고 경쟁지수 → KOS 배율 */
const COMP_MULT: Record<string, number> = {
  "낮음":    1.00,
  "보통":    0.50,
  "높음":    0.18,
  "매우 높음": 0.08,
};

export async function GET(req: NextRequest) {
  const rawKeyword = req.nextUrl.searchParams.get("keyword")?.trim();
  const validation = validateKeyword(rawKeyword);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const keyword = rawKeyword as string;

  // platform 파라미터 (카테고리 풀 조회용, 기본 smartstore)
  const platformRaw = req.nextUrl.searchParams.get("platform") ?? "smartstore";
  const ontoPlatform: OntoPlatform = platformRaw === "coupang" ? "coupang" : "smartstore";

  const cached = cache.get<KeywordV2[]>(keyword);
  if (cached) {
    const meta = v2MetaCache.get<V2Meta>(keyword) ?? { poolSource: null, poolFetchedAt: null };
    return NextResponse.json({
      keywords: cached,
      cached: true,
      poolSource: meta.poolSource,
      poolFetchedAt: meta.poolFetchedAt,
    });
  }

  const l2 = await getL2Cache<KeywordV2[]>(keyword, CACHE_TYPE);
  if (l2) {
    cache.set(keyword, l2);
    const l2Meta = await getL2Cache<V2Meta>(keyword, META_L2_TYPE);
    const meta = l2Meta ?? { poolSource: null, poolFetchedAt: null };
    if (l2Meta) v2MetaCache.set(keyword, l2Meta);
    return NextResponse.json({
      keywords: l2,
      cached: true,
      poolSource: meta.poolSource,
      poolFetchedAt: meta.poolFetchedAt,
    });
  }

  try {
    // ─── 1단계: Ad API(풀 우선) + BFS 그래프 + 쇼핑 자동완성 병렬 호출 ──────
    const longtailCandidates = generateLongtailCandidates(keyword);

    const [adsResult, graphResult, autoResult] = await Promise.allSettled([
      getAdKeywordsWithPool(keyword, ontoPlatform),
      bfsKeywords(keyword, 2, 15),
      getNaverShoppingAutocomplete(keyword),
    ]);

    const adsRes         = adsResult.status   === "fulfilled" ? adsResult.value   : { keywords: [], source: "api" as const };
    const adsKeywords    = adsRes.keywords;
    const graphKeywords   = graphResult.status  === "fulfilled" ? graphResult.value  : [];
    const autoSuggestions = autoResult.status   === "fulfilled" ? autoResult.value   : [];

    // ─── 2단계: 후보 통합 ──────────────────────────────────────────
    type CandidateInfo = {
      volume: number;
      clicks: number;
      compIdx: string;
      graphWeight: number;
      inAds: boolean;
    };
    const candidateMap = new Map<string, CandidateInfo>();

    const addOrMerge = (
      kw: string,
      info: Partial<CandidateInfo>
    ) => {
      if (kw === keyword || kw.length < 2) return;
      if (!candidateMap.has(kw)) {
        candidateMap.set(kw, {
          volume: 0, clicks: 0, compIdx: "보통", graphWeight: 0, inAds: false,
          ...info,
        });
      } else {
        const c = candidateMap.get(kw)!;
        if (info.volume)      c.volume      = Math.max(c.volume, info.volume);
        if (info.clicks)      c.clicks      = Math.max(c.clicks, info.clicks);
        if (info.compIdx)     c.compIdx     = info.compIdx;
        if (info.graphWeight) c.graphWeight = Math.max(c.graphWeight, info.graphWeight);
        if (info.inAds)       c.inAds       = true;
      }
    };

    // Ad API 결과 (가장 신뢰도 높은 소스)
    const adKwSet = new Set<string>();
    for (const ad of adsKeywords) {
      adKwSet.add(ad.relKeyword);
      addOrMerge(ad.relKeyword, {
        volume:      totalMonthlyVolume(ad),
        clicks:      (ad.monthlyAvgPcClkCnt ?? 0) + (ad.monthlyAvgMobileClkCnt ?? 0),
        compIdx:     ad.compIdx ?? "보통",
        graphWeight: 0,
        inAds:       true,
      });
    }

    // D 그래프 결과 (발굴 가산점)
    for (const g of graphKeywords) {
      addOrMerge(g.keyword, { graphWeight: g.graphWeight });
    }

    // 온톨로지 Facet 기반 롱테일 (형제/자식 노드 속성 교차 조합)
    const ontologyLongtails = generateOntologyLongtails(keyword, "smartstore", 15);

    // 자동완성 + 템플릿 롱테일 + 온톨로지 롱테일 — 후보로 등록
    for (const lt of [...autoSuggestions, ...longtailCandidates, ...ontologyLongtails]) {
      if (!candidateMap.has(lt)) {
        addOrMerge(lt, { inAds: false, compIdx: "보통" });
      }
    }

    // ─── 3단계: 미조회 후보 검색량 일괄 조회 (Ad API 2차 호출) ────
    // 자동완성 + 롱테일 중 Ad API 1차에서 나오지 않은 키워드 실검색량 보완
    const needLookup = [...new Set([...autoSuggestions, ...longtailCandidates, ...ontologyLongtails])]
      .filter((kw) => !adKwSet.has(kw) && kw !== keyword)
      .slice(0, 25); // 최대 25개 (온톨로지 롱테일 포함, 15→25 확대: 결과 부족 방지)

    if (needLookup.length > 0) {
      const batches: string[][] = [];
      for (let i = 0; i < needLookup.length; i += 5) {
        batches.push(needLookup.slice(i, i + 5));
      }
      const batchResults = await Promise.allSettled(
        batches.map((b) => getNaverAdKeywordsForHints(b))
      );
      for (const r of batchResults) {
        if (r.status !== "fulfilled") continue;
        for (const ad of r.value) {
          addOrMerge(ad.relKeyword, {
            volume:  totalMonthlyVolume(ad),
            clicks:  (ad.monthlyAvgPcClkCnt ?? 0) + (ad.monthlyAvgMobileClkCnt ?? 0),
            compIdx: ad.compIdx ?? "보통",
            inAds:   true,
          });
        }
      }
    }

    // ─── 4단계: 자동완성 엣지 → D 그래프 ─────────────────────────
    const autoKeywords = [
      ...adsKeywords.slice(0, 8).map((a) => a.relKeyword),
      ...autoSuggestions.slice(0, 5),
    ];
    if (autoKeywords.length > 0) {
      upsertAutocompleteEdges(keyword, autoKeywords).catch(() => {});
    }

    // ─── 5단계: 검색량 맵 + 트렌드 (DataLab 무료 대안 포함) ──────
    const volumeMap = new Map<string, number>();
    for (const [kw, info] of candidateMap) {
      if (info.volume > 0) volumeMap.set(kw, info.volume);
    }

    // Ad API 결과 있으면: 상위 12개 선별해서 DataLab 트렌드 보강
    // Ad API 결과 없으면: 모든 NLP 후보를 DataLab으로 조회 (무료 검색량 추정)
    let preScored: string[];
    if (adsKeywords.length > 0) {
      preScored = Array.from(candidateMap.entries())
        .filter(([, info]) => info.volume > 50)    // 200→50: 중소 검색량 키워드도 트렌드 분석 포함
        .sort(([, a], [, b]) => {
          const am = COMP_MULT[a.compIdx] ?? 0.5;
          const bm = COMP_MULT[b.compIdx] ?? 0.5;
          return b.volume * bm - a.volume * am;
        })
        .slice(0, 18)                               // 12→18: 트렌드 분석 대상 확대
        .map(([kw]) => kw);
    } else {
      // Ad API 없음 → 다중어 후보 전체를 DataLab으로 조회 (최대 12개)
      preScored = Array.from(candidateMap.keys())
        .filter((kw) => kw.trim().split(/\s+/).length >= 2)
        .slice(0, 12);
    }

    const momentumMap = await calcMomentumScores(preScored, volumeMap);

    // ─── 5단계: 전체 채점 ─────────────────────────────────────────
    const results: KeywordV2[] = [];
    const seedTokensForFilter = keyword.split(/\s+/);
    // 시드 정규화 (대소문자/공백 무시) — substring 매칭용
    const seedNorm = keyword.trim().toLowerCase().replace(/\s+/g, "");
    // 시드의 온톨로지 분류 성공 여부 — 실패 시 substring 의존도 강화
    const seedClassified = classifyKeyword(keyword, "smartstore") ?? classifyKeyword(keyword, "coupang");
    const seedUnclassified = !seedClassified;

    for (const [kw, info] of candidateMap) {
      // 데이터 없는 후보 필터: 다중어 + 구체성 높으면 NLP 점수만으로 포함
      if (!info.inAds && info.graphWeight < 1 && info.volume === 0) {
        const tokenCount = kw.trim().split(/\s+/).length;
        if (tokenCount < 2) continue; // 단일어는 데이터 없으면 제외
        const spec = classifyKeywordIntent(kw).specificityScore;
        if (spec < 35) continue; // 구체성 낮은 다중어도 제외 (40→35: 2토큰 조합 포용)
        // 구체성 높은 롱테일 후보 → 검색량 0으로 채점 진행
      }

      const momentum       = momentumMap.get(kw);
      const monthlyVolume  = Math.round(info.volume > 0 ? info.volume : (momentum?.monthlyVolume ?? 0));
      const trendSlope     = momentum?.recentSlope ?? 0;
      const trendDirection: KeywordV2["trendDirection"] = momentum?.direction ?? "안정";

      // 구매 의도 + 구체성 (키워드 자체 분석 — API 독립)
      const intent = classifyKeywordIntent(kw);

      // 서브 점수
      const scoreDemand        = calcDemandScore(monthlyVolume);
      const scoreIntentApi     = calcIntentScore(info.clicks, info.volume); // Ad API 클릭율
      const scoreIntentNlp     = intent.intentScore;                        // NLP 분류
      // 두 신호 블렌딩: API 클릭율 60% + NLP 분류 40%
      const scoreIntent        = info.inAds && info.volume > 0
        ? Math.round(scoreIntentApi * 0.6 + scoreIntentNlp * 0.4)
        : scoreIntentNlp;
      // 시드 substring 포함하면서 시드보다 길면 명확한 "변형" → specificity 최소 50 보장
      // ("납작복숭아"·"신비복숭아" 같은 단일토큰 변형이 점수 낮게 처리되던 문제 보정)
      const isSeedVariant = kw.trim().toLowerCase().replace(/\s+/g, "").includes(seedNorm) && kw.length > keyword.length;
      const scoreSpecificity   = isSeedVariant
        ? Math.max(intent.specificityScore, 50)
        : intent.specificityScore;
      const scoreGrowth        = calcGrowthScore(trendSlope);
      const scorePenetrability = PENETRABILITY[info.compIdx] ?? 55;
      // 온톨로지 기반 연관도 (Wu-Palmer + 분류깊이 + 그래프 + 학습매핑 + 토큰겹침)
      const relevance          = calcOntologyRelevance(keyword, kw, info.graphWeight);
      const scoreRelation      = relevance.score;

      // ─── 연관도 필터: 시드와 완전 무관한 키워드 차단 ────────────
      // - containsSeedToken: 공백 분리 토큰 단위 매칭
      // - containsSeedSubstr: 정규화된 시드 substring 매칭 (단일어 변형 ex. "납작복숭아")
      const containsSeedToken = seedTokensForFilter.some((t) => kw.includes(t));
      const kwNorm = kw.trim().toLowerCase().replace(/\s+/g, "");
      const containsSeedSubstr = kwNorm.includes(seedNorm);

      // 시드 분류 실패(온톨로지 미정의) → seed substring 미포함 후보는 무조건 차단
      // 분류가 있을 때보다 엄격: 그래프 BFS로 묶인 무관 키워드("미국젤리" 등) 제거
      if (seedUnclassified && !containsSeedSubstr) {
        continue;
      }
      if (!containsSeedToken && !containsSeedSubstr && scoreRelation < 15) {
        continue;
      }

      // ─── KOS 최종 점수 ─────────────────────────────────────────
      const compMult  = COMP_MULT[info.compIdx] ?? 0.5;
      const trendMult = Math.max(1 + trendSlope / 150, 0.5);
      const iMult     = intentMultiplier(scoreIntent);
      const sMult     = specificityMultiplier(scoreSpecificity);
      // 연관도 배율
      // - 시드 substring 포함(예: "납작복숭아"): 최소 1.0배 (강한 변형 확신)
      // - 시드 토큰 포함: 최소 0.7배
      // - 그 외: 온톨로지 점수 기반
      let relMult: number;
      if (containsSeedSubstr) {
        relMult = Math.max(1.0, 0.3 + (scoreRelation / 100) * 0.9);
      } else if (containsSeedToken) {
        relMult = Math.max(0.7, 0.3 + (scoreRelation / 100) * 0.9);
      } else {
        relMult = 0.3 + (scoreRelation / 100) * 0.9;
      }

      // volumeConfirmed: Ad API 실데이터 여부 (true = 신뢰 높음)
      const volumeConfirmed = info.inAds && info.volume > 0;

      let score: number;
      if (monthlyVolume > 0) {
        // 검색량 있음 (Ad API 실데이터 or DataLab 추정) → 전체 KOS (0~1000)
        score = Math.round(scoreDemand * iMult * sMult * compMult * trendMult * relMult * 10);
      } else {
        // 검색량 없음 → NLP 신호만 사용 (0~100)
        score = Math.round((scoreIntent * 0.6 + scoreSpecificity * 0.4) * sMult * relMult * 0.7);
      }

      const compLevel = (
        info.compIdx === "매우 높음" ? "매우 높음"
        : info.compIdx === "높음"   ? "높음"
        : info.compIdx === "보통"   ? "보통"
        : "낮음"
      ) as KeywordV2["competitionLevel"];

      // 수요선점 (Creativity Score)
      const csResult = calcCreativityScore({
        seedKeyword: keyword,
        candidateKeyword: kw,
        platform: "smartstore",
        monthlyVolume,
        competitionLevel: compLevel,
        trendSlope,
        source: "v2",
      });
      const scoreCreativity = csResult.score;
      const scoreChance = calcCreativityChanceScore({
        seedKeyword: keyword,
        candidateKeyword: kw,
        platform: "smartstore",
        monthlyVolume,
        competitionLevel: compLevel,
        trendSlope,
        source: "v2",
      });

      results.push({
        keyword:           kw,
        score,
        scoreDemand,
        scoreIntent,
        scoreSpecificity,
        scoreGrowth,
        scorePenetrability,
        scoreRelation,
        scoreCreativity,
        scoreChance,
        competitionLevel:  compLevel,
        monthlyVolume,
        trendDirection,
        trendSlope,
        intentType:        intent.type,
        isLongTail:        intent.isLongTail,
        volumeConfirmed,
      });
    }

    // ── 검색량 미확인 키워드: 상품 존재 여부로 판별 (L2 캐시) ──
    const unconfirmed = results.filter((r) => !r.volumeConfirmed && r.scoreSpecificity >= 35);
    if (unconfirmed.length > 0) {
      // 구체성 높은 순으로 정렬 → 상위 20개 검증 (배치 4회)
      const sorted = [...unconfirmed].sort((a, b) => b.scoreSpecificity - a.scoreSpecificity);
      const toCheck = sorted.slice(0, 20);      // 15→20: 검증 범위 확대
      const noProductSet = new Set<string>();

      // L2 캐시 일괄 병렬 조회 (과거: 순차 → 현재: Promise.all)
      const l2Results = await Promise.all(
        toCheck.map((r) => getL2Cache<boolean>(r.keyword, "product_exists"))
      );

      const cacheHits: Array<{ keyword: string; exists: boolean }> = [];
      const cacheMisses: typeof toCheck = [];
      for (let i = 0; i < toCheck.length; i++) {
        const l2 = l2Results[i];
        if (l2 !== null) {
          cacheHits.push({ keyword: toCheck[i].keyword, exists: l2 });
        } else {
          cacheMisses.push(toCheck[i]);
        }
      }

      // 캐시 미스만 실제 네이버 API 호출
      const missResults = await Promise.all(
        cacheMisses.map(async (r) => {
          try {
            const res = await searchNaver(r.keyword, 1);
            const exists = res.total > 0;
            setL2Cache(r.keyword, "product_exists", exists); // 24h 캐시
            return { keyword: r.keyword, exists };
          } catch {
            return { keyword: r.keyword, exists: true }; // 에러 시 살려둠
          }
        })
      );

      const checks = [...cacheHits, ...missResults];
      for (const c of checks) if (!c.exists) noProductSet.add(c.keyword);
      // 검증 못 한 나머지: 구체성 45+ 이면 살리고, 미만이면 제거
      for (const r of sorted.slice(20)) {
        if (r.scoreSpecificity < 45) noProductSet.add(r.keyword);  // 50→45
      }
      for (const kw of noProductSet) {
        const idx = results.findIndex((r) => r.keyword === kw);
        if (idx >= 0) results.splice(idx, 1);
      }
    }

    const top = results
      .filter((r) => {
        if (r.volumeConfirmed) {
          if (r.isLongTail || r.scoreSpecificity >= 40)
            return r.monthlyVolume >= 10 || r.scoreSpecificity >= 50;
          return r.monthlyVolume >= 30;   // 50→30: "텀블러" 같은 중간 카테고리 결과 확보
        }
        // 검색량 미확인이지만 상품 존재 확인됨 (위에서 상품 없는 건 이미 제거)
        return r.scoreSpecificity >= 35;  // 40→35: 2토큰 수식어 조합 포용력 향상
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 80);

    cache.set(keyword, top);
    setL2Cache(keyword, CACHE_TYPE, top);
    const meta: V2Meta = {
      poolSource: adsRes.source,
      poolFetchedAt: adsRes.fetchedAt ?? null,
    };
    v2MetaCache.set(keyword, meta);
    setL2Cache(keyword, META_L2_TYPE, meta);
    return NextResponse.json({
      keywords: top,
      poolSource: meta.poolSource,
      poolFetchedAt: meta.poolFetchedAt,
    });

  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "추천 실패" },
      { status: 500 }
    );
  }
}
