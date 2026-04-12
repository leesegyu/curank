import Link from "next/link";
import { auth } from "@/auth";

const PLANS: Array<{
  id: string;
  name: string;
  price: string;
  monthly: string | null;
  color: string;
  badge: string | null;
  features: Array<{ label: string; value: string; positive?: boolean; negative?: boolean; upcoming?: boolean }>;
}> = [
  {
    id: "free",
    name: "Free",
    price: "무료",
    monthly: null,
    color: "border-gray-200",
    badge: null,
    features: [
      { label: "월 키워드 분석", value: "8회" },
      { label: "추천 키워드 효과 비교", value: "5회" },
      { label: "결론 재생성", value: "키워드당 10회" },
      { label: "상품발굴 열람", value: "3개" },
      { label: "분석 이력 보관", value: "최근 10개" },
      { label: "스냅샷 보관", value: "10일" },
      { label: "CSV 다운로드", value: "O", positive: true },
      { label: "PDF 보고서", value: "X", negative: true },
    ],
  },
  {
    id: "standard",
    name: "Standard",
    price: "8,000",
    monthly: "월",
    color: "border-blue-300",
    badge: null,
    features: [
      { label: "월 키워드 분석", value: "30회" },
      { label: "추천 키워드 효과 비교", value: "10회" },
      { label: "결론 재생성", value: "키워드당 20회" },
      { label: "상품발굴 열람", value: "10개" },
      { label: "분석 이력 보관", value: "최근 30개" },
      { label: "스냅샷 보관", value: "30일" },
      { label: "CSV 다운로드", value: "O", positive: true },
      { label: "PDF 보고서", value: "O", positive: true },
    ],
  },
  {
    id: "business",
    name: "Business",
    price: "15,000",
    monthly: "월",
    color: "border-indigo-400 ring-2 ring-indigo-100",
    badge: "인기",
    features: [
      { label: "월 키워드 분석", value: "80회" },
      { label: "추천 키워드 효과 비교", value: "20회" },
      { label: "결론 재생성", value: "키워드당 30회" },
      { label: "상품발굴 열람", value: "30개" },
      { label: "분석 이력 보관", value: "50개" },
      { label: "스냅샷 보관", value: "무제한" },
      { label: "CSV 다운로드", value: "O", positive: true },
      { label: "PDF 보고서", value: "O", positive: true },
      { label: "키워드 모니터링", value: "X", negative: true },
      { label: "경쟁사 비교", value: "X", negative: true },
      { label: "일괄 분석", value: "X", negative: true },
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: "30,000",
    monthly: "월",
    color: "border-purple-300",
    badge: null,
    features: [
      { label: "월 키워드 분석", value: "200회" },
      { label: "추천 키워드 효과 비교", value: "30회" },
      { label: "결론 재생성", value: "키워드당 40회" },
      { label: "상품발굴 열람", value: "전체", positive: true },
      { label: "분석 이력 보관", value: "50개" },
      { label: "스냅샷 보관", value: "무제한" },
      { label: "CSV 다운로드", value: "O", positive: true },
      { label: "PDF 보고서", value: "O", positive: true },
      { label: "키워드 모니터링", value: "예정", upcoming: true },
      { label: "경쟁사 비교", value: "예정", upcoming: true },
      { label: "일괄 분석", value: "예정", upcoming: true },
    ],
  },
  {
    id: "membership",
    name: "Membership",
    price: "50,000",
    monthly: "월",
    color: "border-amber-300",
    badge: null,
    features: [
      { label: "월 키워드 분석", value: "500회" },
      { label: "추천 키워드 효과 비교", value: "50회" },
      { label: "결론 재생성", value: "키워드당 50회" },
      { label: "상품발굴 열람", value: "전체 + 알림", positive: true },
      { label: "분석 이력 보관", value: "50개" },
      { label: "스냅샷 보관", value: "무제한" },
      { label: "CSV 다운로드", value: "O", positive: true },
      { label: "PDF 보고서", value: "O", positive: true },
      { label: "키워드 모니터링", value: "예정", upcoming: true },
      { label: "경쟁사 비교", value: "예정", upcoming: true },
      { label: "일괄 분석", value: "예정", upcoming: true },
      { label: "개인 맞춤 정보 알림", value: "예정", upcoming: true },
    ],
  },
] as const;

const FAQ = [
  { q: "유료 플랜은 언제 오픈되나요?", a: "서비스 고도화와 정확도 검증을 마친 후 오픈할 예정입니다. 셀러분들께 진짜 도움이 되는 수준이 될 때까지 무료로 제공합니다." },
  { q: "이번 달 분석 횟수를 모두 사용하면?", a: "매월 1일에 자동으로 초기화됩니다. 남은 횟수는 다음 달로 이월되지 않습니다." },
  { q: "같은 키워드를 다시 분석하면 횟수가 차감되나요?", a: "같은 달에 이미 분석한 키워드는 횟수 차감 없이 재조회됩니다." },
  { q: "PDF 보고서에는 어떤 내용이 포함되나요?", a: "경쟁 분석, 트렌드, 인구통계, 추천 키워드, 결론까지 전체 분석 결과가 쿠랭크 디자인으로 정리됩니다." },
];

export default async function PricingPage() {
  const session = await auth();
  const currentPlan = (session?.user as Record<string, unknown> | undefined)?.plan as string ?? "free";

  return (
    <main className="min-h-screen px-4 py-12 max-w-7xl mx-auto">
      {/* 헤더 */}
      <div className="text-center mb-4">
        <Link href="/">
          <span
            className="text-2xl font-black"
            style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            쿠랭크
          </span>
        </Link>
      </div>
      <h1 className="text-3xl font-black text-center text-gray-900 mb-2">
        셀러에게 딱 맞는 요금제
      </h1>
      <p className="text-center text-gray-500 text-sm mb-6">
        무료로 시작하고, 필요할 때 업그레이드하세요
      </p>

      {/* 유료 플랜 준비 중 안내 */}
      <div className="max-w-2xl mx-auto mb-10 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 text-center">
        <p className="text-sm font-bold text-blue-800 mb-1">
          현재 무료 플랜만 운영 중입니다
        </p>
        <p className="text-xs text-blue-600 leading-relaxed">
          더 정확하고 유용한 분석을 드리기 위해 서비스를 개선하고 있습니다.<br/>
          충분한 검증과 고도화를 마친 후 유료 플랜을 오픈할 예정이니 조금만 기다려주세요.
        </p>
      </div>

      {/* 플랜 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-16">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border-2 ${plan.color} bg-white p-5 flex flex-col transition-shadow hover:shadow-lg ${isCurrent ? "ring-2 ring-blue-400" : ""}`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold text-white px-3 py-1 rounded-full" style={{ background: "linear-gradient(135deg, #6366f1, #3b82f6)" }}>
                  {plan.badge}
                </span>
              )}
              {isCurrent && (
                <span className="absolute -top-3 right-4 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                  현재 플랜
                </span>
              )}

              <h3 className="text-lg font-black text-gray-900 mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-4">
                {plan.monthly ? (
                  <>
                    <span className="text-2xl font-black text-gray-900">{plan.price}</span>
                    <span className="text-sm text-gray-400">원/{plan.monthly}</span>
                  </>
                ) : (
                  <span className="text-2xl font-black text-gray-900">{plan.price}</span>
                )}
              </div>

              <ul className="space-y-2 flex-1 mb-5">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <span className={`mt-0.5 shrink-0 ${f.negative ? "text-gray-300" : f.upcoming ? "text-amber-400" : "text-green-500"}`}>
                      {f.negative ? "—" : f.upcoming ? "◇" : "✓"}
                    </span>
                    <span className="text-gray-600">
                      {f.label} <span className={`font-bold ${f.negative ? "text-gray-300" : f.upcoming ? "text-amber-500" : "text-gray-800"}`}>{f.value}</span>
                    </span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="py-2.5 rounded-xl text-center text-sm font-bold text-blue-600 bg-blue-50 border border-blue-200">
                  사용 중
                </div>
              ) : plan.id === "free" ? (
                <Link href="/signup" className="block py-2.5 rounded-xl text-center text-sm font-bold text-white transition-opacity hover:opacity-90" style={{ background: "#6b7280" }}>
                  무료 시작
                </Link>
              ) : (
                <div className="py-2.5 rounded-xl text-center text-sm font-bold text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed">
                  준비 중
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto">
        <h2 className="text-xl font-black text-gray-900 text-center mb-6">자주 묻는 질문</h2>
        <div className="space-y-3">
          {FAQ.map((item, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-sm font-bold text-gray-800 mb-1">{item.q}</p>
              <p className="text-sm text-gray-500">{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 푸터 링크 */}
      <div className="text-center mt-12">
        <Link href="/" className="text-sm text-gray-400 hover:text-blue-600 transition-colors">
          홈으로 돌아가기
        </Link>
      </div>
    </main>
  );
}
