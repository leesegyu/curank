import { redirect } from "next/navigation";
import Link from "next/link";
import { unifiedSearch, fetchNaverScoreData } from "@/lib/search";
import { analyze } from "@/lib/analyzer";
import { getKeywordTrend } from "@/lib/datalab";
import { auth } from "@/auth";
import { trackEvent } from "@/lib/events";
import { getUsage } from "@/lib/usage";
import UsageBadge from "@/components/UsageBadge";
import TrendChartClient from "./TrendChartClient";
import KeywordRecommendationsVariant from "./KeywordRecommendationsVariant";
import KeywordRecommendationsModifiers from "./KeywordRecommendationsModifiers";
import FactorScoreAggregated from "./FactorScoreAggregated";
import KeywordRecommendationsV2, { FactorPredictionCard } from "./KeywordRecommendationsV2";
import KeywordRecommendationsGraph from "./KeywordRecommendationsGraph";
// DemographicsSection 삭제됨 — API 비용 절감
import { ProfitSimulator, MonthlyVolumeCard } from "./ClientWidgets";
import OpportunitySummary from "./OpportunitySummary";
import DwellTracker from "./DwellTracker";
// import PlatformInsightCard from "./PlatformInsightCard"; // 비활성화 — 추후 복원 가능
import FactorScoreCard from "./FactorScoreCard";
import CompetitorThreatCard from "./CompetitorThreatCard";
import BrandDistributionCard from "./BrandDistributionCard";
import type { BrandDistributionData } from "./BrandDistributionCard";
import ConclusionCard from "./ConclusionCard";
import KeywordRecommendationsCreative from "./KeywordRecommendationsCreative";
// KeywordRecommendationsHistorical 삭제됨 — SOS 카드에 통합
import KeywordRecommendationsSeasonOpportunity from "./KeywordRecommendationsSeasonOpportunity";
import FactorCompareCard from "./FactorCompareCard";
import BackToHomeLink from "./BackToHomeLink";
import PreventSwipeBack from "./PreventSwipeBack";
import ActionPlanCard from "./ActionPlanCard";
import ReportDownloadButton from "./ReportDownloadButton";
import type { SearchPlatform } from "@/components/PlatformSelector";
import { getSnapshot, saveSnapshot } from "@/lib/snapshot";
import type { AnalysisResult } from "@/lib/analyzer";
import SnapshotBanner from "./SnapshotBanner";

interface PageProps {
  searchParams: Promise<{ keyword?: string; platform?: string; refresh?: string }>;
}

const LEVEL_COLORS = {
  낮음: "text-green-600 bg-green-50 border-green-200",
  보통: "text-yellow-600 bg-yellow-50 border-yellow-200",
  높음: "text-orange-600 bg-orange-50 border-orange-200",
  "매우 높음": "text-red-600 bg-red-50 border-red-200",
};

const SCORE_BG = (score: number) => {
  if (score < 25) return "bg-green-500";
  if (score < 50) return "bg-yellow-500";
  if (score < 75) return "bg-orange-500";
  return "bg-red-500";
};

const SOURCE_LABEL = {
  coupang: { text: "쿠팡 파트너스 API", color: "text-blue-600 bg-blue-50 border-blue-200" },
  naver:   { text: "네이버 쇼핑 API",   color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  demo:    { text: "데모 모드",          color: "text-amber-600 bg-amber-50 border-amber-200" },
};

const DIRECTION_STYLE = {
  상승: "text-green-600 bg-green-50",
  하락: "text-red-600 bg-red-50",
  안정: "text-gray-500 bg-gray-50",
};
const DIRECTION_ICON = { 상승: "↑", 하락: "↓", 안정: "→" };

function formatPrice(p: number) {
  return p > 0 ? p.toLocaleString("ko-KR") + "원" : "-";
}

export default async function AnalyzePage({ searchParams }: PageProps) {
  const { keyword, platform: rawPlatform, refresh } = await searchParams;
  if (!keyword?.trim()) redirect("/");

  const kw = keyword.trim();
  const platform: SearchPlatform =
    rawPlatform === "coupang" || rawPlatform === "all" ? rawPlatform : "naver";
  const forceRefresh = refresh === "true";

  // 세션 확인 + 사용량 체크 (차감은 홈의 analyze-run API에서 처리)
  const session = await auth();
  let usageResult: { ok: boolean; usage: { used: number; limit: number; remaining: number } } | null = null;

  if (session?.user?.id) {
    const usage = await getUsage(session.user.id as string);
    usageResult = { ok: usage.remaining > 0, usage };
    trackEvent(session.user.id, "analyze", kw, { source: "direct" });
  }

  // 한도 초과 시 분석 결과 없이 안내만 표시
  if (usageResult && !usageResult.ok) {
    return (
      <main className="min-h-screen px-4 sm:px-8 py-10 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/">
            <span className="text-2xl font-black" style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>쿠랭크</span>
          </Link>
          <UsageBadge />
        </div>
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-3">이번 달 무료 분석을 모두 사용했어요</h2>
          <p className="text-sm text-gray-500 mb-2">사용량: {usageResult.usage.used}/{usageResult.usage.limit}회</p>
          <p className="text-sm text-gray-400 mb-8">매월 1일에 분석 횟수가 초기화됩니다.</p>
          <Link href="/" className="inline-block px-6 py-3 rounded-xl text-white font-bold text-sm" style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}>홈으로 돌아가기</Link>
        </div>
      </main>
    );
  }

  // ── 스냅샷 우선 로드 (과거 분석 재방문 시 API 호출 0) ──
  const userId = session?.user?.id as string | undefined;
  let result: AnalysisResult | null = null;
  let trend: Awaited<ReturnType<typeof getKeywordTrend>> | null = null;
  let errorMsg: string | null = null;
  let snapshotTime: string | null = null;
  // snapshotDemographics 삭제됨
  // 키워드 추천 스냅샷 데이터
  let snapKeywordsVariant: unknown | null = null;
  // keywordsV1(legacy Blue Ocean) 제거됨 — 모듈 삭제
  let snapKeywordsV2: unknown[] | null = null;
  let snapKeywordsCreative: unknown[] | null = null;
  let snapKeywordsGraph: unknown[] | null = null;
  // keywordsHistorical 제거됨 — SOS 카드에 통합, analyze-run에서 더 이상 수집 안 함
  let snapKeywordsSeasonOpp: unknown[] | null = null;
  let snapFactorScore: unknown | null = null;
  let snapBrandDistribution: BrandDistributionData | null = null;
  let snapFactorAggregated: { candidates: Array<{ keyword: string; source: string }>; results: unknown[] } | null = null;
  let snapPoolSource: "pool" | "api" | null = null;
  let snapPoolFetchedAt: string | null = null;
  let poolFreshnessLabel: string | null = null;

  if (!forceRefresh && userId) {
    const snap = await getSnapshot(userId, kw, platform);
    if (snap) {
      result = snap.snapshot.result as AnalysisResult;
      trend = snap.snapshot.trend as typeof trend;
      // demographics 삭제됨
      snapshotTime = snap.created_at;
      // 키워드 추천 데이터 추출
      snapKeywordsVariant = snap.snapshot.keywordsVariant ?? null;
      // snapKeywordsV1 제거됨 (legacy)
      snapKeywordsV2 = (snap.snapshot.keywordsV2 as unknown[] | undefined) ?? null;
      snapKeywordsCreative = (snap.snapshot.keywordsCreative as unknown[] | undefined) ?? null;
      snapKeywordsGraph = (snap.snapshot.keywordsGraph as unknown[] | undefined) ?? null;
      snapKeywordsSeasonOpp = (snap.snapshot.keywordsSeasonOpp as unknown[] | undefined) ?? null;
      snapFactorScore = snap.snapshot.factorScore ?? null;
      snapBrandDistribution = (snap.snapshot.brandDistribution as BrandDistributionData | undefined) ?? null;
      snapFactorAggregated = (snap.snapshot.factorAggregated as typeof snapFactorAggregated) ?? null;
      snapPoolSource = (snap.snapshot.poolSource as "pool" | "api" | null) ?? null;
      snapPoolFetchedAt = (snap.snapshot.poolFetchedAt as string | null) ?? null;
      if (snapPoolSource === "pool" && snapPoolFetchedAt) {
        // eslint-disable-next-line react-hooks/purity
        const nowMs = Date.now();
        const days = Math.max(0, Math.floor((nowMs - new Date(snapPoolFetchedAt).getTime()) / 86400000));
        poolFreshnessLabel = days === 0 ? "오늘 갱신" : `${days}일 전 갱신`;
      }
      console.log(`[snapshot] HIT: "${kw}" (${platform}) from ${snap.created_at}`, snapKeywordsV2 ? `+keywords` : `(no keywords)`);
    }
  }

  // 스냅샷 없거나 강제 새로고침 → API 호출
  if (!result) {
    console.log(`[snapshot] MISS: "${kw}" (${platform}) → API 호출`);
    const [searchRaw, naverScoreRaw, trendResult] = await Promise.allSettled([
      unifiedSearch(kw, platform),
      fetchNaverScoreData(kw),
      getKeywordTrend(kw),
    ]);

    const searchData = searchRaw.status === "fulfilled" ? searchRaw.value : null;
    const naverScoreData = naverScoreRaw.status === "fulfilled" ? naverScoreRaw.value : null;
    result = searchData ? analyze(searchData, naverScoreData) : null;
    trend = trendResult.status === "fulfilled" ? trendResult.value : null;
    errorMsg = searchRaw.status === "rejected"
      ? (searchRaw.reason instanceof Error ? searchRaw.reason.message : "분석 오류")
      : null;

    // 분석 성공 시 스냅샷 저장
    if (result && userId) {
      saveSnapshot(userId, kw, platform, { result, trend, naverScoreData }).catch(() => {});
    }
  }

  const sourceInfo = result ? SOURCE_LABEL[result.source] : null;

  return (
    <main className="min-h-screen px-4 sm:px-8 py-10 max-w-5xl mx-auto">
      {/* 체류시간 트래킹 (렌더 없음) */}
      <DwellTracker keyword={kw} />

      {/* 뒤로가기/스와이프 제스처 차단 (렌더 없음) */}
      <PreventSwipeBack />

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <BackToHomeLink />
        <div className="flex items-center gap-3">
          <UsageBadge />
          <Link
            href="/"
            className="text-xs font-bold px-4 py-2 rounded-xl border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            다른 키워드 검색하기
          </Link>
        </div>
      </div>

      {snapshotTime && (
        <div className="mb-4">
          <SnapshotBanner snapshotTime={snapshotTime} />
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-600">
          <p className="font-bold mb-1">분석 실패</p>
          <p className="text-sm">{errorMsg}</p>
          <Link href="/" className="mt-4 inline-block text-sm text-blue-600 underline">돌아가기</Link>
        </div>
      )}

      {result && (
        <div className="space-y-4">

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* 📍 STEP 1: 현재 상황 — 지금 이 시장은 어떤가?   */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

          <div className="flex items-center gap-2 pt-2">
            <span className="text-xs font-bold text-white px-2.5 py-1 rounded-lg bg-blue-500">STEP 1</span>
            <span className="text-sm font-bold text-gray-700">현재 상황</span>
            <span className="text-xs text-gray-400">지금 이 시장은 어떤가?</span>
          </div>

          {/* 플랫폼 배지 */}
          {platform === "naver" && (
            <div className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-black text-green-700 px-3 py-1 bg-white rounded-xl border border-green-200 shadow-sm">N</span>
                  <div>
                    <p className="text-sm font-black text-green-800">스마트스토어 전용 분석</p>
                    <p className="text-xs text-green-600">네이버 쇼핑 기준으로 분석한 결과입니다</p>
                  </div>
                </div>
                {trend && (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${DIRECTION_STYLE[trend.direction]}`}>
                    {DIRECTION_ICON[trend.direction]} {trend.direction}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 키워드 + 경쟁 강도 */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">분석 키워드</p>
                <h2 className="text-2xl font-black text-gray-900">{result.keyword}</h2>
              </div>
            </div>

            {platform === "naver" && result.naverPlatformScore && (
              <div className="mb-4">
                <div className="rounded-xl p-5 bg-green-50 border border-green-100">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-sm font-bold text-green-700">경쟁 강도</span>
                      <p className="text-[11px] text-green-600/60 mt-0.5">점수가 높을수록 경쟁이 치열해요. 70점 이상이면 신규 진입이 어려울 수 있습니다</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${LEVEL_COLORS[result.naverPlatformScore.level]}`}>
                      {result.naverPlatformScore.level}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-4xl font-black text-gray-900">{result.naverPlatformScore.score}</span>
                    <span className="text-sm text-gray-400">/ 100</span>
                  </div>
                  <div className="w-full bg-white rounded-full h-2 overflow-hidden mb-4">
                    <div className={`h-2 rounded-full transition-all ${SCORE_BG(result.naverPlatformScore.score)}`}
                      style={{ width: `${result.naverPlatformScore.score}%` }} />
                  </div>
                  {(() => {
                    const bd = result.naverPlatformScore.breakdown;
                    const factors = [
                      { label: "공급 포화도", value: bd.supplyScore ?? 0, desc: "판매 중인 상품이 얼마나 많은지" },
                      { label: "가격 경쟁", value: bd.priceCompression ?? 0, desc: "가격 전쟁이 얼마나 치열한지" },
                    ];
                    return (
                      <div className="grid grid-cols-2 gap-2">
                        {factors.map((f) => (
                          <div key={f.label} className="bg-white rounded-lg p-2.5 text-center">
                            <p className="text-xs text-gray-400 mb-0.5">{f.label}</p>
                            <p className="text-lg font-black text-gray-800">{f.value}</p>
                            <p className="text-xs text-gray-300">{f.desc}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* 쿠팡 비교 티저 */}
            <div className="rounded-xl p-4 bg-gray-50 border border-dashed border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-blue-400 px-2 py-0.5 bg-blue-50 rounded-lg border border-blue-100">쿠팡</span>
                <span className="text-xs text-gray-400">에서는 다른 결과가 나올 수 있어요</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                쿠팡은 <strong className="text-gray-500">리뷰 수·로켓배송 여부·판매자 독점도</strong>가 순위를 결정합니다.
              </p>
              <p className="text-xs text-blue-400 mt-2 font-semibold">쿠팡 전용 분석 — 준비중</p>
            </div>
          </div>

          {/* 시장 현황 + 가격대 + 검색량 */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-bold text-gray-700 mb-0.5">시장 현황</p>
            <p className="text-[11px] text-gray-400 mb-3">상품 수가 적고 검색량이 많으면 기회가 큰 시장이에요. 가격대를 보고 내 소싱가로 마진이 남는지 확인하세요</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl bg-gray-50 p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">판매 중인 상품 수</p>
                <p className="text-xl font-black text-gray-900">
                  {result.totalCount >= 10000
                    ? (result.totalCount / 10000).toFixed(1) + "만"
                    : result.totalCount.toLocaleString()}개
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">최저가</p>
                <p className="text-xl font-black text-gray-900">{formatPrice(result.priceStats.min)}</p>
              </div>
            </div>
            <p className="text-xs font-semibold text-gray-500 mb-2">가격 범위</p>
            <div className="flex items-center gap-0 mb-1">
              <span className="text-sm font-bold text-gray-900 w-24 shrink-0">{formatPrice(result.priceStats.min)}</span>
              <div className="flex-1 mx-2 h-1.5 bg-gray-100 rounded-full overflow-hidden relative">
                <div className="absolute inset-0 rounded-full" style={{ background: "linear-gradient(90deg, #3b82f6, #6366f1)" }} />
                {result.priceStats.max > result.priceStats.min && (
                  <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white border-2 border-indigo-500 rounded-full"
                    style={{ left: `calc(${((result.priceStats.avg - result.priceStats.min) / (result.priceStats.max - result.priceStats.min)) * 100}% - 5px)` }} />
                )}
              </div>
              <span className="text-sm font-bold text-gray-900 w-24 shrink-0 text-right">{formatPrice(result.priceStats.max)}</span>
            </div>
            <p className="text-xs text-center text-indigo-600 font-semibold">평균 {formatPrice(result.priceStats.avg)}</p>
            {/* 월 검색량 카드 비활성화 — 데이터 노이즈 */}
            {/* <div className="mt-3 pt-3 border-t border-gray-50">
              <MonthlyVolumeCard keyword={kw} />
            </div> */}
          </div>

          {/* 트렌드 차트 */}
          {trend && trend.data.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="mb-3">
                <p className="text-sm font-bold text-gray-700">검색량 트렌드</p>
                <p className="text-[11px] text-gray-400 mt-0.5">꾸준히 오르는 키워드가 안정적인 매출을 만들어줘요. 급락 중이면 재고 리스크가 있을 수 있습니다</p>
              </div>
              <TrendChartClient data={trend.data} weeklyData={trend.weeklyData} peak={trend.peak} current={trend.current} keyword={kw} />
            </div>
          )}

          {/* 검색자 인구통계 카드 삭제됨 — API 비용 절감 */}

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* ⚠️ STEP 2: 문제 진단 — 어떤 점이 어렵나?        */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

          <div className="flex items-center gap-2 pt-4">
            <span className="text-xs font-bold text-white px-2.5 py-1 rounded-lg bg-orange-500">STEP 2</span>
            <span className="text-sm font-bold text-gray-700">문제 진단</span>
            <span className="text-xs text-gray-400">어떤 점이 어렵고, 누가 위협적인가?</span>
          </div>

          {/* 경쟁 위협도 — 구체적으로 누가 위협적인지 */}
          <CompetitorThreatCard keyword={kw} platform={platform} />

          {/* 브랜드/상호명 분포 — 시장 지배 브랜드 파악 */}
          <BrandDistributionCard keyword={kw} platform={platform} preloadedData={snapBrandDistribution} />

          {/* 판매 성공 Factor — 어떤 지표에서 약한지 */}
          <FactorScoreCard keyword={kw} platform={platform} preloadedData={snapFactorScore} />

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* 💡 STEP 3: 해결 방안 — 어떤 키워드로 공략할까?    */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

          <div className="flex items-center gap-2 pt-4 flex-wrap">
            <span className="text-xs font-bold text-white px-2.5 py-1 rounded-lg bg-green-500">STEP 3</span>
            <span className="text-sm font-bold text-gray-700">해결 방안</span>
            <span className="text-xs text-gray-400">경쟁을 피하고 기회를 잡을 키워드 추천</span>
            {poolFreshnessLabel && (
              <span
                className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium"
                title="카테고리 키워드 풀(Ad API 배치 캐시)에서 즉시 조회"
              >
                📦 카테고리 풀 · {poolFreshnessLabel}
              </span>
            )}
          </div>

          {/* 시즌 기회 키워드 — Historical + V2 융합 SOS (STEP 3 첫 번째) */}
          <KeywordRecommendationsSeasonOpportunity keyword={kw} platform={platform} preloadedData={snapKeywordsSeasonOpp} />

          {/* Blue Ocean 주석 처리 → 변형/품종 키워드로 교체 */}
          {/* KeywordRecommendations(Blue Ocean) 제거됨 — variant/수식어/기회분석 카드로 대체 */}
          <KeywordRecommendationsVariant keyword={kw} platform={platform} preloadedData={snapKeywordsVariant as { keywords?: { keyword: string; volume?: number }[]; category?: string; source?: "ontology" | "api-fallback" } | null} />

          {/* 수식어 추천 키워드 (여러 소스 통합) */}
          <KeywordRecommendationsModifiers
            keyword={kw}
            platform={platform}
            sources={{
              v2: snapKeywordsV2,
              creative: snapKeywordsCreative,
              graph: snapKeywordsGraph,
              sos: (snapKeywordsSeasonOpp as unknown[] | null),
            }}
          />

          {/* 심화 키워드 추천 A/B/C */}
          <KeywordRecommendationsV2 keyword={kw} platform={platform} preloadedData={snapKeywordsV2} />

          {/* 그래프 기반 추천 */}
          <KeywordRecommendationsGraph keyword={kw} platform={platform} preloadedData={snapKeywordsGraph} />

          {/* 크리에이티브 발굴 */}
          <KeywordRecommendationsCreative keyword={kw} platform={platform} preloadedData={snapKeywordsCreative} />

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* 📊 STEP 4: 최종 후보 비교 — 어떤 키워드가 최선?  */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

          <div className="flex items-center gap-2 pt-4">
            <span className="text-xs font-bold text-white px-2.5 py-1 rounded-lg" style={{ background: "linear-gradient(135deg, #a855f7, #6366f1)" }}>STEP 4</span>
            <span className="text-sm font-bold text-gray-700">최종 후보 비교</span>
            <span className="text-xs text-gray-400">STEP 3 추천 키워드들을 6개 지표로 종합 비교</span>
          </div>

          <FactorScoreAggregated
            keyword={kw}
            platform={platform}
            sources={{
              v2: snapKeywordsV2,
              creative: snapKeywordsCreative,
              graph: snapKeywordsGraph,
              sos: (snapKeywordsSeasonOpp as unknown[] | null),
              variant: snapKeywordsVariant,
            }}
            preloaded={snapFactorAggregated as { candidates: Array<{ keyword: string; source: string }>; results: import("@/lib/factor-model").FactorScoreSet[] } | null}
          />

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* 📈 STEP 5: 결과 예측 — 이렇게 하면?             */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

          <div className="flex items-center gap-2 pt-4">
            <span className="text-xs font-bold text-white px-2.5 py-1 rounded-lg bg-purple-500">STEP 5</span>
            <span className="text-sm font-bold text-gray-700">결과 예측</span>
            <span className="text-xs text-gray-400">추천 키워드로 진입하면 어떤 결과가?</span>
          </div>

          {/* 판매 성공 지표 — 키워드별 6 Factor 예측 */}
          <FactorPredictionCard keyword={kw} platform={platform} preloadedData={snapKeywordsV2} />

          {/* 추천 키워드 효과 비교 */}
          <FactorCompareCard mainKeyword={kw} recommendations={[]} platform={platform} />

          {/* 시장 기회 요약 — 비활성화 (진입 실행 가이드로 대체) */}
          {/* <OpportunitySummary result={result} trend={trend} platform={platform} /> */}

          {/* 플랫폼 전략 인사이트 — 비활성화 (추후 복원 가능) */}
          {/* <PlatformInsightCard result={result} platform={platform} /> */}

          {/* 진입 실행 가이드 — STEP 1~4 종합 액션 플랜 */}
          <ActionPlanCard
            result={result}
            trend={trend}
            keyword={kw}
            topKeywordsV2={snapKeywordsV2}
          />

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* 🎯 STEP 6: 결론 — 그래서, 이렇게 하세요          */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

          <div className="flex items-center gap-2 pt-4">
            <span className="text-xs font-bold text-white px-2.5 py-1 rounded-lg bg-red-500">STEP 6</span>
            <span className="text-sm font-bold text-gray-700">결론</span>
            <span className="text-xs text-gray-400">그래서, 이렇게 하세요</span>
          </div>

          <ConclusionCard keyword={kw} platform={platform} />

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* 📋 STEP 7: 참고사항                              */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

          <div className="flex items-center gap-2 pt-4">
            <span className="text-xs font-bold text-white px-2.5 py-1 rounded-lg bg-gray-500">STEP 7</span>
            <span className="text-sm font-bold text-gray-700">참고사항</span>
            <span className="text-xs text-gray-400">추가로 알아두면 좋은 정보</span>
          </div>

          {/* 수익 시뮬레이터 */}
          <ProfitSimulator
            avgPrice={result.priceStats.avg}
            minPrice={result.priceStats.min}
            maxPrice={result.priceStats.max}
            totalCount={result.totalCount}
            keyword={kw}
          />

          {/* PDF 보고서 다운로드 */}
          <ReportDownloadButton keyword={kw} platform={platform} />

          <p className="text-xs text-center text-gray-400 pb-4">
            분석 시각: {new Date(result.analyzedAt).toLocaleString("ko-KR")}
          </p>
        </div>
      )}
    </main>
  );
}
