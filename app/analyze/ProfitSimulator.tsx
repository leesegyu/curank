"use client";

import { useEffect, useMemo, useState } from "react";

interface Props {
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  totalCount: number;
  keyword: string;
}

const COUPANG_RATES = [
  { label: "식품", value: 5 },
  { label: "도서/완구", value: 8 },
  { label: "패션잡화", value: 10 },
  { label: "일반 (기본)", value: 11 },
  { label: "화장품/건강", value: 13 },
];

const NAVER_RATES = [
  { label: "식품/전자기기", value: 2 },
  { label: "생활/건강", value: 4 },
  { label: "기타 (기본)", value: 5 },
  { label: "패션/화장품", value: 6 },
];

const NAVER_PAY_RATE = 3.74;

// 간이과세자 업종별 부가가치율
const SIMPLIFIED_RATES = [
  { label: "소매 · 음식료품", valueRate: 10 },  // 납부세 = 판매가 × 10% × 10%
  { label: "소매 · 일반상품", valueRate: 15 },  // 납부세 = 판매가 × 15% × 10%
  { label: "도소매업",        valueRate: 10 },
];

type VatType = "exempt" | "standard" | "simplified";

function formatWon(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

function formatCount(n: number) {
  return n >= 10000
    ? (n / 10000).toFixed(1) + "만"
    : n.toLocaleString("ko-KR");
}

function marginColor(rate: number) {
  if (rate >= 30) return "text-green-600";
  if (rate >= 20) return "text-yellow-600";
  return "text-red-500";
}

function marginBg(rate: number) {
  if (rate >= 30) return "bg-green-50 border-green-200";
  if (rate >= 20) return "bg-yellow-50 border-yellow-200";
  return "bg-red-50 border-red-200";
}

export default function ProfitSimulator({ avgPrice, minPrice, maxPrice, totalCount, keyword }: Props) {
  const [monthlyVolume, setMonthlyVolume] = useState<number | null>(null);
  const [sourcingPrice, setSourcingPrice] = useState("");
  const [salePrice, setSalePrice] = useState(avgPrice > 0 ? String(avgPrice) : "");
  const [shippingCost, setShippingCost] = useState("2500");
  const [customShipping, setCustomShipping] = useState("");
  const [coupangRateIdx, setCoupangRateIdx] = useState(3);
  const [naverRateIdx, setNaverRateIdx] = useState(2);
  const [vatType, setVatType] = useState<VatType>("standard");
  const [simplifiedRateIdx, setSimplifiedRateIdx] = useState(1); // 소매 일반
  const [targetProfit, setTargetProfit] = useState("");

  useEffect(() => {
    fetch(`/api/volume?keyword=${encodeURIComponent(keyword)}`)
      .then((r) => r.json())
      .then((d) => setMonthlyVolume(d.volume ?? 0))
      .catch(() => setMonthlyVolume(0));
  }, [keyword]);

  const calc = useMemo(() => {
    const sourcing = parseInt(sourcingPrice.replace(/,/g, ""), 10);
    const sale = parseInt(salePrice.replace(/,/g, ""), 10);
    const shipping = shippingCost === "custom"
      ? (parseInt(customShipping.replace(/,/g, ""), 10) || 0)
      : (parseInt(shippingCost.replace(/,/g, ""), 10) || 0);

    if (!sourcing || !sale || sourcing <= 0 || sale <= 0) return null;

    // ── 부가세 계산 ───────────────────────────────────────────────────────────
    // 과세(일반): 판매가·소싱가 모두 VAT 포함 → 납부세 = (판매가-소싱가) × 10/110
    // 과세(간이): 납부세 = 판매가 × 업종 부가가치율 × 10%
    // 면세: 납부세 없음 (농수산물·도서·의료용품 등)
    let vatPayable = 0;
    if (vatType === "standard") {
      vatPayable = Math.max(0, Math.round((sale - sourcing) * (10 / 110)));
    } else if (vatType === "simplified") {
      const r = SIMPLIFIED_RATES[simplifiedRateIdx].valueRate / 100;
      vatPayable = Math.round(sale * r * 0.1);
    }

    const coupangRate = COUPANG_RATES[coupangRateIdx].value;
    const naverSellRate = NAVER_RATES[naverRateIdx].value;

    const coupangFee = Math.round(sale * (coupangRate / 100));
    const coupangMargin = sale - sourcing - coupangFee - shipping - vatPayable;
    const coupangMarginRate = (coupangMargin / sale) * 100;

    const naverSellFee = Math.round(sale * (naverSellRate / 100));
    const naverPayFee = Math.round(sale * (NAVER_PAY_RATE / 100));
    const naverTotalFee = naverSellFee + naverPayFee;
    const naverMargin = sale - sourcing - naverTotalFee - shipping - vatPayable;
    const naverMarginRate = (naverMargin / sale) * 100;

    const target = parseInt(targetProfit.replace(/,/g, ""), 10);
    const coupangNeeded = target > 0 && coupangMargin > 0 ? Math.ceil(target / coupangMargin) : null;
    const naverNeeded = target > 0 && naverMargin > 0 ? Math.ceil(target / naverMargin) : null;

    const marketMonthly = monthlyVolume && monthlyVolume > 0 ? Math.round(monthlyVolume * 0.015) : null;

    return {
      vatPayable,
      coupangFee, coupangMargin, coupangMarginRate,
      naverSellFee, naverPayFee, naverTotalFee, naverMargin, naverMarginRate,
      coupangNeeded, naverNeeded,
      marketMonthly,
      coupangRate, naverSellRate,
    };
  }, [sourcingPrice, salePrice, shippingCost, customShipping, coupangRateIdx, naverRateIdx, vatType, simplifiedRateIdx, targetProfit, monthlyVolume]);

  const coupangWins = calc && calc.coupangMarginRate > calc.naverMarginRate;
  const naverWins = calc && calc.naverMarginRate > calc.coupangMarginRate;

  const VAT_BUTTONS: { key: VatType; label: string; sub: string }[] = [
    { key: "standard",   label: "일반과세자", sub: "연매출 1억400만원↑" },
    { key: "simplified", label: "간이과세자", sub: "연매출 1억400만원↓" },
    { key: "exempt",     label: "면세",       sub: "농수산물·도서 등" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-gray-700">수익 시뮬레이터</p>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">쿠팡 vs 스마트스토어</span>
        </div>
        <p className="text-[11px] text-gray-400 mt-1">소싱가를 입력하면 예상 마진과 필요 판매량을 바로 계산해줘요. 소싱 전에 꼭 확인하세요</p>
      </div>

      {/* 가격 입력 */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">소싱 단가</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="예) 15000"
            value={sourcingPrice}
            onChange={(e) => setSourcingPrice(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-400"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            판매가
            {avgPrice > 0 && (
              <button
                type="button"
                onClick={() => setSalePrice(String(avgPrice))}
                className="ml-1 text-blue-500 underline text-xs"
              >
                평균가 적용
              </button>
            )}
          </label>
          <input
            type="text"
            inputMode="numeric"
            placeholder={avgPrice > 0 ? `평균 ${formatWon(avgPrice)}` : "판매가 입력"}
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-400"
          />
        </div>
      </div>

      {/* 배송비 */}
      <div className="mb-4">
        <label className="block text-xs text-gray-500 mb-1">배송비</label>
        <select
          value={shippingCost}
          onChange={(e) => setShippingCost(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-400 bg-white"
          suppressHydrationWarning
        >
          <option value="0">무료배송</option>
          <option value="2500">2,500원</option>
          <option value="2700">2,700원</option>
          <option value="3000">3,000원</option>
          <option value="custom">직접입력</option>
        </select>
        {shippingCost === "custom" && (
          <input
            type="text"
            inputMode="numeric"
            placeholder="배송비 입력"
            value={customShipping}
            onChange={(e) => setCustomShipping(e.target.value)}
            className="w-full mt-1 px-3 py-2 text-sm border border-blue-300 rounded-xl outline-none focus:border-blue-400"
          />
        )}
      </div>

      {/* 부가세 유형 */}
      <div className="mb-4">
        <label className="block text-xs text-gray-500 mb-1.5">부가세 (VAT) 유형</label>
        <div className="grid grid-cols-3 gap-2">
          {VAT_BUTTONS.map(({ key, label, sub }) => (
            <button
              key={key}
              type="button"
              onClick={() => setVatType(key)}
              className={`py-2 px-1 text-xs font-bold rounded-xl border transition-colors text-center ${
                vatType === key
                  ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                  : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              {label}
              <span className={`block font-normal mt-0.5 leading-tight ${vatType === key ? "text-indigo-400" : "text-gray-400"}`} style={{ fontSize: 10 }}>
                {sub}
              </span>
            </button>
          ))}
        </div>
        {/* 간이과세자 업종 선택 */}
        {vatType === "simplified" && (
          <div className="mt-2">
            <select
              value={simplifiedRateIdx}
              onChange={(e) => setSimplifiedRateIdx(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-indigo-200 rounded-xl outline-none focus:border-indigo-400 bg-white"
            >
              {SIMPLIFIED_RATES.map((r, i) => (
                <option key={i} value={i}>
                  {r.label} (납부세 {r.valueRate}% × 10%)
                </option>
              ))}
            </select>
          </div>
        )}
        {/* 면세 안내 */}
        {vatType === "exempt" && (
          <p className="mt-1.5 text-xs text-gray-400">
            미가공 농·수·축산물, 도서·신문, 의료용품, 영유아 기저귀·분유 등 해당
          </p>
        )}
        {/* 일반과세자 안내 */}
        {vatType === "standard" && (
          <p className="mt-1.5 text-xs text-gray-400">
            납부세 = (판매가 − 소싱가) × 10/110 &nbsp;·&nbsp; 소싱가에 VAT 포함 가정
          </p>
        )}
        {vatType === "simplified" && (
          <p className="mt-1 text-xs text-gray-400">
            납부세 = 판매가 × 업종 부가가치율 × 10%
          </p>
        )}
      </div>

      {/* 수수료 선택 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">쿠팡 수수료 카테고리</label>
          <select
            value={coupangRateIdx}
            onChange={(e) => setCoupangRateIdx(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-400 bg-white"
          >
            {COUPANG_RATES.map((r, i) => (
              <option key={i} value={i}>{r.label} ({r.value}%)</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">스마트스토어 수수료 카테고리</label>
          <select
            value={naverRateIdx}
            onChange={(e) => setNaverRateIdx(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-400 bg-white"
          >
            {NAVER_RATES.map((r, i) => (
              <option key={i} value={i}>{r.label} ({r.value}%)</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-0.5">+ 네이버페이 3.74% 고정 포함</p>
        </div>
      </div>

      {/* 미입력 안내 */}
      {!calc && (
        <div className="text-center py-6 text-sm text-gray-400">
          소싱 단가와 판매가를 입력하면 마진이 계산됩니다
        </div>
      )}

      {/* 결과 비교 카드 */}
      {calc && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* 쿠팡 */}
            <div className={`border rounded-2xl p-4 ${marginBg(calc.coupangMarginRate)}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gray-600">쿠팡</p>
                {coupangWins && (
                  <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">추천</span>
                )}
              </div>
              <p className={`text-2xl font-black ${marginColor(calc.coupangMarginRate)}`}>
                {calc.coupangMarginRate.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-0.5">마진율</p>
              <div className="mt-2 space-y-0.5 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>수수료 ({calc.coupangRate}%)</span>
                  <span className="font-medium text-gray-700">-{formatWon(calc.coupangFee)}</span>
                </div>
                {vatType !== "exempt" && calc.vatPayable > 0 && (
                  <div className="flex justify-between">
                    <span>
                      {vatType === "standard" ? "납부 부가세" : "간이 납부세"}
                    </span>
                    <span className="font-medium text-orange-600">-{formatWon(calc.vatPayable)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-800 border-t border-gray-200 pt-1 mt-1">
                  <span>단위 마진</span>
                  <span className={marginColor(calc.coupangMarginRate)}>
                    {calc.coupangMargin >= 0 ? formatWon(calc.coupangMargin) : "−" + formatWon(Math.abs(calc.coupangMargin))}
                  </span>
                </div>
              </div>
            </div>

            {/* 스마트스토어 */}
            <div className={`border rounded-2xl p-4 ${marginBg(calc.naverMarginRate)}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gray-600">스마트스토어</p>
                {naverWins && (
                  <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">추천</span>
                )}
              </div>
              <p className={`text-2xl font-black ${marginColor(calc.naverMarginRate)}`}>
                {calc.naverMarginRate.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-0.5">마진율</p>
              <div className="mt-2 space-y-0.5 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>판매수수료 ({calc.naverSellRate}%)</span>
                  <span className="font-medium text-gray-700">-{formatWon(calc.naverSellFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span>네이버페이 (3.74%)</span>
                  <span className="font-medium text-gray-700">-{formatWon(calc.naverPayFee)}</span>
                </div>
                {vatType !== "exempt" && calc.vatPayable > 0 && (
                  <div className="flex justify-between">
                    <span>
                      {vatType === "standard" ? "납부 부가세" : "간이 납부세"}
                    </span>
                    <span className="font-medium text-orange-600">-{formatWon(calc.vatPayable)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-800 border-t border-gray-200 pt-1 mt-1">
                  <span>단위 마진</span>
                  <span className={marginColor(calc.naverMarginRate)}>
                    {calc.naverMargin >= 0 ? formatWon(calc.naverMargin) : "−" + formatWon(Math.abs(calc.naverMargin))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 월 목표 역산 */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <label className="text-xs font-bold text-gray-700 shrink-0">월 목표 순수익</label>
              <div className="flex-1">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="예) 1000000"
                  value={targetProfit}
                  onChange={(e) => setTargetProfit(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white"
                />
              </div>
            </div>
            {(calc.coupangNeeded || calc.naverNeeded) && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                {calc.coupangNeeded && (
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-0.5">쿠팡</p>
                    <p className="font-black text-gray-900">
                      {calc.coupangNeeded.toLocaleString()}개 <span className="text-xs font-normal text-gray-500">/ 월</span>
                    </p>
                  </div>
                )}
                {calc.naverNeeded && (
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-0.5">스마트스토어</p>
                    <p className="font-black text-gray-900">
                      {calc.naverNeeded.toLocaleString()}개 <span className="text-xs font-normal text-gray-500">/ 월</span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 시장 규모 추정 */}
          {calc.marketMonthly !== null && calc.marketMonthly > 0 && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl text-xs text-blue-700">
              <span>시장 전체 월 약</span>
              <span className="font-bold">{formatCount(calc.marketMonthly)}개</span>
              <span>거래 추정</span>
              <span className="text-blue-400 ml-auto">(검색량 기반 추정, 참고용)</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
