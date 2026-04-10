import { AnalysisResult } from "@/lib/analyzer";
import { TrendData } from "@/lib/datalab";

interface Props {
  result: AnalysisResult;
  trend: TrendData | null;
  platform?: string;
}

type Verdict = "추천" | "검토" | "주의";

function getVerdict(score: number, direction: string | null): Verdict {
  if (score < 40 && direction !== "하락") return "추천";
  if (score < 65 && direction !== "하락") return "검토";
  if (score < 40 && direction === "하락") return "검토";
  return "주의";
}

const VERDICT_STYLE: Record<Verdict, { bg: string; border: string; badge: string; text: string }> = {
  추천: {
    bg: "bg-green-50",
    border: "border-green-200",
    badge: "bg-green-500 text-white",
    text: "text-green-700",
  },
  검토: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    badge: "bg-yellow-500 text-white",
    text: "text-yellow-700",
  },
  주의: {
    bg: "bg-red-50",
    border: "border-red-200",
    badge: "bg-red-500 text-white",
    text: "text-red-700",
  },
};

// 플랫폼별 진입 설명
const VERDICT_DESC: Record<string, Record<Verdict, string>> = {
  naver: {
    추천: "스마트스토어에서 경쟁이 낮고 수요가 있습니다. 네이버 SEO 최적화와 함께 지금 진입하세요.",
    검토: "스마트스토어에서 보통 수준의 경쟁입니다. 상품명/태그 최적화와 블로그 마케팅으로 차별화하세요.",
    주의: "스마트스토어에서 경쟁이 치열합니다. 롱테일 키워드 조합 또는 틈새 카테고리 공략을 먼저 검토하세요.",
  },
  coupang: {
    추천: "쿠팡에서 경쟁이 낮습니다. 빠른 등록과 초기 리뷰 확보에 집중하세요.",
    검토: "쿠팡에서 보통 경쟁입니다. 로켓그로스 입점과 가격 경쟁력을 확보하세요.",
    주의: "쿠팡에서 경쟁이 매우 치열합니다. 리뷰 수가 많은 시장이므로 롱테일 전략을 권장합니다.",
  },
};

function formatWon(n: number) {
  if (n >= 100_000_000) return (n / 100_000_000).toFixed(1) + "억원";
  if (n >= 10_000) return Math.round(n / 10_000) + "만원";
  return n.toLocaleString("ko-KR") + "원";
}

export default function OpportunitySummary({ result, trend, platform = "naver" }: Props) {
  const direction = trend?.direction ?? null;

  // 현재 플랫폼 점수 기준으로 진입 판정
  const currentScore = platform === "naver"
    ? result.naverPlatformScore
    : result.coupangPlatformScore;
  const score = currentScore?.score ?? result.competitionScore;
  const verdict = getVerdict(score, direction);
  const style = VERDICT_STYLE[verdict];
  const desc = VERDICT_DESC[platform]?.[verdict] ?? VERDICT_DESC.naver[verdict];

  const avgPrice = result.priceStats.avg;

  // 리뷰 수 기반 판매량 추정
  const topProduct = (result.products ?? []).find((p) => (p.ratingCount ?? 0) > 0) ?? null;
  const topReviews = topProduct?.ratingCount ?? 0;
  const hasReviewData = topReviews > 0;
  const estimatedSales = hasReviewData ? topReviews * 50 : null;

  const coupangRevenue = estimatedSales && topProduct
    ? estimatedSales * topProduct.salePrice
    : null;
  const naverRevenue = estimatedSales && avgPrice > 0
    ? estimatedSales * avgPrice
    : null;

  const estimatedMargin =
    avgPrice > 0
      ? Math.round(
          ((avgPrice - avgPrice * 0.4 - avgPrice * 0.11 - 2500) / avgPrice) * 100
        )
      : null;

  const isNaver = platform === "naver";

  return (
    <div className={`rounded-2xl border p-5 ${style.bg} ${style.border}`}>
      {/* 헤더: 플랫폼 진입 판정 */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-1">
          <span className={`text-xs font-black px-3 py-1 rounded-full shrink-0 ${style.badge}`}>
            {isNaver ? "스마트스토어" : "쿠팡"} 진입 {verdict}
          </span>
        </div>
        <p className="text-[11px] text-gray-400 mb-2">위의 분석을 종합해서 이 시장에 진입해도 되는지 최종 판단한 결과예요</p>
        <p className={`text-sm font-medium ${style.text}`}>{desc}</p>
      </div>

      {/* 매출 추정 - 현재 플랫폼 우선, 비교 플랫폼은 서브 */}
      {(coupangRevenue || naverRevenue) ? (
        <div className="space-y-3 mb-4">
          {/* 현재 플랫폼 (메인) */}
          <div className={`rounded-xl p-4 ${isNaver ? "bg-white border border-green-100" : "bg-white border border-blue-100"}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-bold ${isNaver ? "text-green-700" : "text-blue-700"}`}>
                {isNaver ? "스마트스토어" : "쿠팡"} 1위 판매자 추정 누적 매출
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${isNaver ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"}`}>
                현재 분석
              </span>
            </div>
            <p className={`text-xl font-black ${isNaver ? "text-green-700" : "text-blue-700"}`}>
              {isNaver
                ? (naverRevenue ? formatWon(naverRevenue) : "-")
                : (coupangRevenue ? formatWon(coupangRevenue) : "-")}
            </p>
            {hasReviewData && (
              <p className="text-xs text-gray-400 mt-0.5">
                리뷰 {topReviews.toLocaleString()}개 × 50회 × {formatWon(isNaver ? avgPrice : (topProduct?.salePrice ?? 0))}
              </p>
            )}
          </div>

          {/* 비교 플랫폼 (서브) */}
          <div className="rounded-xl p-3 bg-white border border-dashed border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-gray-400">
                {isNaver ? "쿠팡" : "스마트스토어"} 1위 추정 매출
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">비교</span>
            </div>
            <p className="text-base font-black text-gray-500">
              {isNaver
                ? (coupangRevenue ? formatWon(coupangRevenue) : "-")
                : (naverRevenue ? formatWon(naverRevenue) : "-")}
            </p>
            {/* 매출 차이 인사이트 */}
            {coupangRevenue && naverRevenue && (
              <p className="text-xs text-gray-400 mt-1">
                {coupangRevenue > naverRevenue
                  ? `쿠팡 1위 매출이 ${formatWon(coupangRevenue - naverRevenue)} 더 높음 — 쿠팡이 객단가가 높은 시장`
                  : naverRevenue > coupangRevenue
                    ? `스마트스토어가 ${formatWon(naverRevenue - coupangRevenue)} 더 높음 — 평균가 기준 더 높은 매출 잠재력`
                    : "양 플랫폼 매출 규모가 비슷합니다"}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-1">평균 판매가</p>
            <p className="text-base font-black text-gray-900">
              {avgPrice > 0 ? formatWon(avgPrice) : "-"}
            </p>
            {estimatedMargin !== null && (
              <p className="text-xs text-gray-500 mt-0.5">
                소싱 40% 가정 시 마진 약{" "}
                <span className={estimatedMargin >= 20 ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
                  {estimatedMargin}%
                </span>
              </p>
            )}
          </div>
          <div className="bg-white rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-1">총 경쟁 상품</p>
            <p className="text-base font-black text-gray-900">
              {result.totalCount >= 10000
                ? (result.totalCount / 10000).toFixed(1) + "만개"
                : result.totalCount.toLocaleString() + "개"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {result.competitionLevel} 경쟁
            </p>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mb-3">
        * 리뷰:구매 비율 1:50 업계 추정치 기준 · 실제와 다를 수 있음
      </p>

    </div>
  );
}
