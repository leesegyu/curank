import type { AnalysisResult } from "@/lib/analyzer";

interface Props {
  result: AnalysisResult;
  platform: string;
}

interface StrategyPoint {
  signal: "positive" | "caution" | "warning";
  title: string;
  why: string;
  action: string;
}

const SIGNAL = {
  positive: { dot: "bg-green-500", bg: "bg-green-50 border-green-100" },
  caution:  { dot: "bg-yellow-500", bg: "bg-yellow-50 border-yellow-100" },
  warning:  { dot: "bg-red-500", bg: "bg-red-50 border-red-100" },
};

/**
 * 플랫폼별 전략 포인트 — 상위 노출·구매전환·검색량에 직결되는 실전 전략
 */
export default function PlatformInsightCard({ result, platform }: Props) {
  if (platform !== "naver") return null;

  const ns = result.naverPlatformScore;
  if (!ns) return null;

  const { supplyScore = 0, coupangPenetration = 0, priceCompression = 0 } = ns.breakdown;
  const totalCount = result.totalCount;
  const avgPrice = result.priceStats.avg;

  // ── 스마트스토어 전략 포인트 (데이터 기반) ──
  const points: StrategyPoint[] = [];

  // 1) 상품 수(공급) 기반 상위 노출 전략
  if (supplyScore < 30) {
    points.push({
      signal: "positive",
      title: "상위 노출이 쉬운 블루오션",
      why: `경쟁 상품이 ${totalCount.toLocaleString()}개로 적습니다. 네이버 쇼핑에서 이 키워드를 검색하는 소비자 대비 상품이 부족한 상태입니다.`,
      action: "상품명 앞 25자에 이 키워드를 정확히 배치하세요. 경쟁이 적어 상품 등록만으로도 1페이지 노출이 가능하며, 리뷰 10개만 모아도 상위 3위권 진입을 기대할 수 있습니다.",
    });
  } else if (supplyScore < 55) {
    points.push({
      signal: "caution",
      title: "상품명·태그 최적화가 순위를 가른다",
      why: `경쟁 상품 ${totalCount.toLocaleString()}개 — 단순 등록만으로는 상위 노출이 어렵습니다.`,
      action: "상품명에 '핵심 키워드 + 수식어(예: 가성비, 대용량)' 조합을 넣고, 태그에 연관 키워드를 10개 이상 등록하세요. 카테고리는 네이버 추천 카테고리를 정확히 따라야 검색 적합도 점수가 올라갑니다.",
    });
  } else if (supplyScore < 75) {
    points.push({
      signal: "warning",
      title: "상위 노출 경쟁 치열 — 롱테일 우회 전략 필요",
      why: `경쟁 상품 ${totalCount.toLocaleString()}개로 이 키워드 직접 공략은 상위 노출까지 시간이 오래 걸립니다.`,
      action: "'키워드 + 세부 수식어'(예: 남성용, 1인용, 캠핑용) 롱테일로 먼저 상위에 올라 판매량·리뷰를 쌓으세요. 네이버 쇼핑은 최근 판매량과 리뷰 수가 높은 상품을 메인 키워드에서도 상위로 밀어줍니다.",
    });
  } else {
    points.push({
      signal: "warning",
      title: "초포화 시장 — 광고+콘텐츠 병행 필수",
      why: `경쟁 상품 ${totalCount.toLocaleString()}개로 레드오션입니다. 신규 진입 시 자연 노출만으로는 거의 불가능합니다.`,
      action: "네이버 쇼핑 검색광고(파워링크)로 초기 노출을 확보하면서, 블로그 체험단·인플루언서 리뷰로 외부 유입을 만드세요. 광고 없이는 판매가 시작되기 어렵고, 판매가 없으면 순위가 오르지 않는 구조입니다.",
    });
  }

  // 2) 쿠팡 침투율 기반 플랫폼 기회 (쿠팡 API 있을 때만 표시)
  if (result.coupangRatio > 0) {
    if (coupangPenetration >= 50) {
      points.push({
        signal: "caution",
        title: `쿠팡 점유율 ${result.coupangRatio}% — 스마트스토어 차별화 필수`,
        why: "이 키워드의 소비자 상당수가 이미 쿠팡에서 구매하고 있습니다. 가격만으로는 쿠팡의 로켓배송을 이기기 어렵습니다.",
        action: "스마트스토어만의 강점을 살리세요: 상세페이지 스토리텔링(사용 후기·비교 사진), 네이버 블로그·카페 연동으로 검색 신뢰도를 높이고, 쿠폰·적립금으로 네이버 쇼핑 내 구매전환율을 올려야 합니다.",
      });
    } else if (coupangPenetration < 20) {
      points.push({
        signal: "positive",
        title: `쿠팡 점유율 ${result.coupangRatio}% — 네이버 쇼핑 강세 시장`,
        why: "이 키워드의 소비자는 네이버 쇼핑에서 주로 구매합니다. 스마트스토어 진입에 매우 유리한 환경입니다.",
        action: "네이버 쇼핑 라이브·기획전에 적극 참여하면 노출이 크게 올라갑니다. 또한 스마트스토어 '찜하기' 이벤트로 구매전환율을 높이면, 검색 알고리즘에서 추가 가산점을 받습니다.",
      });
    }
  }

  // 3) 가격 경쟁 기반 포지셔닝
  if (priceCompression >= 50) {
    const minP = result.priceStats.min.toLocaleString();
    const avgP = avgPrice.toLocaleString();
    points.push({
      signal: "warning",
      title: `가격 편차 큼 (최저 ${minP}원 ~ 평균 ${avgP}원)`,
      why: "최저가와 평균가의 격차가 커서 저가 경쟁이 심합니다. 최저가 매칭만 하면 마진이 남지 않을 수 있습니다.",
      action: "2+1 묶음·사은품 추가·프리미엄 패키지 등으로 '가격 비교 불가' 상품을 만드세요. 네이버 쇼핑에서 단순 가격 정렬을 피하면서 구매전환율을 높이는 전략입니다.",
    });
  } else if (priceCompression < 20 && avgPrice > 0) {
    points.push({
      signal: "positive",
      title: "가격 경쟁 낮음 — 안정적 마진 확보 가능",
      why: "셀러들 간 가격 차이가 크지 않아 출혈 경쟁 없이 안정적으로 판매할 수 있는 시장입니다.",
      action: `평균가 ${avgPrice.toLocaleString()}원 근처에서 가격을 설정하되, 무료배송이나 빠른 발송으로 구매전환율을 높이세요. 가격이 아닌 배송·서비스 품질이 승부처입니다.`,
    });
  }

  // ── 크로스 플랫폼: "이 키워드를 쿠팡에서 쓰면?" ──
  const hasCoupangData = result.coupangRatio > 0;
  const crossTitle = !hasCoupangData
    ? "쿠팡 상품 분석 시스템 준비중"
    : coupangPenetration >= 50
      ? "이 키워드, 쿠팡에서도 수요가 높습니다"
      : "쿠팡에서는 아직 기회가 있을 수 있습니다";

  const crossPoints: string[] = [];

  if (!hasCoupangData) {
    crossPoints.push(
      "쿠팡 상품 데이터 연동이 완료되면, 같은 키워드가 쿠팡에서는 어떤 경쟁 구도인지 자동으로 비교해드립니다."
    );
    crossPoints.push(
      "핵심 차이: 스마트스토어는 '상품명 키워드 매칭 + 최근 판매량 + 클릭률'이 순위를 결정하고, 쿠팡은 '리뷰 수 + 로켓배송 여부 + 가격 경쟁력'이 순위를 결정합니다."
    );
  } else {
    if (coupangPenetration >= 50) {
      crossPoints.push(
        "쿠팡에서는 리뷰 수가 순위의 핵심입니다. 스마트스토어에서 같은 상품으로 리뷰 100개를 모았더라도, 쿠팡에서는 상위 셀러가 1,000개 이상인 경우가 많아 별도의 리뷰 전략이 필요합니다."
      );
    } else {
      crossPoints.push(
        "쿠팡 점유율이 낮다는 것은 두 가지를 의미합니다 — 쿠팡에서 아직 이 시장이 안 열렸거나, 이 키워드의 소비자가 네이버 쇼핑을 선호하는 것입니다. 쿠팡 진입 시 선점 기회가 있을 수 있습니다."
      );
    }
    crossPoints.push(
      "핵심 차이: 스마트스토어는 '상품명 키워드 매칭 + 최근 판매량 + 클릭률'이 순위를 결정하고, 쿠팡은 '리뷰 수 + 로켓배송 여부 + 가격 경쟁력'이 순위를 결정합니다. 같은 상품이라도 각 플랫폼에 맞춰 상품명·가격·이미지를 따로 최적화해야 합니다."
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      {/* 헤더 */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-black text-green-700">스마트스토어 전략 분석</span>
        </div>
        <p className="text-[11px] text-gray-400">
          추천 키워드로 진입할 때 어떤 전략이 효과적인지 구체적으로 알려줘요. 이대로 상품을 등록하면 상위 노출 확률이 높아집니다
        </p>
      </div>

      {/* 전략 포인트 */}
      <div className="space-y-3 mb-5">
        {points.map((p, i) => {
          const s = SIGNAL[p.signal];
          return (
            <div key={i} className={`rounded-xl border p-4 ${s.bg}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                <p className="text-sm font-bold text-gray-800">{p.title}</p>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed mb-2">{p.why}</p>
              <div className="bg-white rounded-lg px-3 py-2 border border-gray-100">
                <p className="text-xs font-semibold text-gray-700 leading-relaxed">
                  <span className="text-green-600 mr-1">TIP</span>
                  {p.action}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 크로스 플랫폼 비교 */}
      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">VS 쿠팡</span>
          <span className="text-xs font-bold text-gray-600">{crossTitle}</span>
        </div>
        <div className="space-y-2">
          {crossPoints.map((cp, i) => (
            <p key={i} className="text-xs text-gray-500 leading-relaxed">{cp}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
