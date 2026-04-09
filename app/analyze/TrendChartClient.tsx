"use client";

import { useState, useCallback } from "react";
import { TrendPoint } from "@/lib/datalab";

const PERIODS = [
  { label: "12개월", months: 12, unit: "monthly" },
  { label: "6개월",  months: 6,  unit: "monthly" },
  { label: "3개월",  months: 3,  unit: "weekly" },
  { label: "1개월",  months: 1,  unit: "weekly" },
] as const;

type PeriodMonths = 12 | 6 | 3 | 1;

export default function TrendChartClient({
  data,
  weeklyData: initialWeekly,
  peak,
  current,
  keyword,
}: {
  data: TrendPoint[];
  weeklyData: TrendPoint[];
  peak: number;
  current: number;
  keyword?: string;
}) {
  const [period, setPeriod] = useState<PeriodMonths>(12);
  const [weeklyData, setWeeklyData] = useState<TrendPoint[]>(initialWeekly);
  const [weeklyLoading, setWeeklyLoading] = useState(false);

  // 주별 데이터 lazy fetch (3개월/1개월 클릭 시)
  const handlePeriod = useCallback(async (p: PeriodMonths) => {
    setPeriod(p);
    const needsWeekly = p === 3 || p === 1;
    if (needsWeekly && weeklyData.length === 0 && keyword && !weeklyLoading) {
      setWeeklyLoading(true);
      try {
        const res = await fetch(`/api/trend-weekly?keyword=${encodeURIComponent(keyword)}`);
        const json = await res.json();
        if (json.weeklyData?.length > 0) setWeeklyData(json.weeklyData);
      } catch { /* 실패 시 빈 상태 유지 */ }
      setWeeklyLoading(false);
    }
  }, [weeklyData.length, keyword, weeklyLoading]);

  const periodInfo = PERIODS.find((p) => p.months === period)!;
  const isWeekly = periodInfo.unit === "weekly";

  // 주별 로딩 중 표시
  if (isWeekly && weeklyLoading) {
    return (
      <div>
        <PeriodButtons period={period} setPeriod={handlePeriod} />
        <div className="h-28 flex items-center justify-center text-gray-400 text-sm animate-pulse">
          주별 데이터 불러오는 중...
        </div>
      </div>
    );
  }

  // 기간에 맞는 데이터 슬라이싱
  let sliced: TrendPoint[];
  if (isWeekly) {
    const weekCount = period === 1 ? 5 : 14;
    sliced = weeklyData.slice(-weekCount);
  } else {
    sliced = data.slice(-period);
  }

  if (sliced.length === 0) {
    return (
      <div>
        <PeriodButtons period={period} setPeriod={setPeriod} />
        <div className="h-28 flex items-center justify-center text-gray-400 text-sm">
          데이터 없음
        </div>
      </div>
    );
  }

  // 데이터 1개인 경우 숫자만 표시
  if (sliced.length === 1) {
    return (
      <div>
        <PeriodButtons period={period} setPeriod={setPeriod} />
        <div className="flex items-center justify-center h-28 text-center">
          <div>
            <p className="text-4xl font-black text-blue-600">{Math.round(sliced[0].ratio)}</p>
            <p className="text-xs text-gray-400 mt-1">
              {sliced[0].period.slice(0, 7)} 검색 지수
            </p>
          </div>
        </div>
        <ChartFooter peak={peak} current={current} isWeekly={isWeekly} />
      </div>
    );
  }

  const W = 800, H = 210;
  const PAD = { top: 26, bottom: 34, left: 6, right: 6 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(...sliced.map((p) => p.ratio), 1);
  const minVal = Math.min(...sliced.map((p) => p.ratio));
  const yPad = (maxVal - minVal) * 0.18 || 8;
  const yMin = Math.max(0, minVal - yPad);
  const yMax = maxVal + yPad;
  const yRange = yMax - yMin || 1;

  const xs = sliced.map((_, i) =>
    PAD.left + (sliced.length === 1 ? innerW / 2 : (i / (sliced.length - 1)) * innerW)
  );
  const ys = sliced.map((p) => PAD.top + (1 - (p.ratio - yMin) / yRange) * innerH);

  const polyline = xs.map((x, i) => `${x},${ys[i]}`).join(" ");
  const fillPath =
    `M${xs[0]},${PAD.top + innerH} ` +
    xs.map((x, i) => `L${x},${ys[i]}`).join(" ") +
    ` L${xs[xs.length - 1]},${PAD.top + innerH} Z`;

  const peakIdx = sliced.reduce((mi, p, i, arr) => p.ratio > arr[mi].ratio ? i : mi, 0);
  const lastIdx = sliced.length - 1;

  // X축 레이블: W=800에서 월별·주별 모두 충분한 간격 확보 → 전부 표시
  // 단, 인접 레이블 겹침 방지를 위해 픽셀 거리 기반 필터 적용
  const estLabelPx = isWeekly ? 28 : 44; // 레이블 추정 너비 (SVG 단위)
  const labelIdxs: number[] = [0];
  let lastLabelRightEdge = PAD.left + estLabelPx; // start-anchored 첫 레이블의 오른쪽 끝
  for (let i = 1; i < sliced.length - 1; i++) {
    const leftEdge = xs[i] - estLabelPx / 2;
    if (leftEdge >= lastLabelRightEdge + 4) {
      labelIdxs.push(i);
      lastLabelRightEdge = xs[i] + estLabelPx / 2;
    }
  }
  // 마지막 레이블: end-anchored이므로 왼쪽으로 뻗음 — 겹치면 직전 레이블 제거 후 추가
  const lastLabelLeftEdge = xs[lastIdx] - estLabelPx;
  if (lastLabelLeftEdge < lastLabelRightEdge + 4 && labelIdxs.length > 1) {
    labelIdxs.pop();
  }
  labelIdxs.push(lastIdx);

  // 수치 레이블: 포인트 수가 적으면 전부, 많으면 최고점·마지막·짝수 인덱스만
  const sparseValues = sliced.length > 12
    ? new Set<number>([peakIdx, lastIdx, ...sliced.map((_, i) => i).filter(i => i % 2 === 0)])
    : new Set<number>(sliced.map((_, i) => i));

  return (
    <div>
      <PeriodButtons period={period} setPeriod={setPeriod} />
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto overflow-visible">
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={fillPath} fill="url(#trendGrad)" />
        <polyline
          points={polyline}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {sliced.map((p, i) => {
          const cx = xs[i];
          const cy = ys[i];
          const isLast = i === lastIdx;
          const isPeak = i === peakIdx;
          const showVal = sparseValues.has(i);

          // 수치 레이블 위치: 점 위로, 경계 초과 시 아래로
          const labelY = cy < PAD.top + 14 ? cy + 13 : cy - 6;

          return (
            <g key={p.period}>
              <circle
                cx={cx} cy={cy}
                r={isPeak ? 5.5 : isLast ? 5 : 3.5}
                fill={isPeak ? "#ef4444" : "#3b82f6"}
                stroke="white"
                strokeWidth="1.5"
              />
              {showVal && (
                <text
                  x={cx} y={labelY}
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight={isPeak || isLast ? "700" : "400"}
                  fill={isPeak ? "#ef4444" : isLast ? "#1d4ed8" : "#4b5563"}
                >
                  {Math.round(p.ratio)}
                </text>
              )}
            </g>
          );
        })}

        {/* X축 레이블 */}
        {labelIdxs.map((i) => {
          const raw = sliced[i].period.slice(0, 10);
          const label = isWeekly
            ? raw.slice(5).replace("-", "/")  // "03/24" 형식
            : raw.slice(0, 7).replace("-", "."); // "2025.04" 형식
          // 양 끝 레이블은 안쪽 정렬하여 SVG 경계 밖으로 나가지 않도록
          const anchor = i === 0 ? "start" : i === lastIdx ? "end" : "middle";
          return (
            <text key={raw} x={xs[i]} y={H - 6} textAnchor={anchor} fontSize="9" fill="#9ca3af">
              {label}
            </text>
          );
        })}
      </svg>
      <ChartFooter peak={peak} current={current} isWeekly={isWeekly} />
    </div>
  );
}

function PeriodButtons({
  period,
  setPeriod,
}: {
  period: PeriodMonths;
  setPeriod: (p: PeriodMonths) => void | Promise<void>;
}) {
  return (
    <div className="flex gap-1 mb-3">
      {PERIODS.map((p) => (
        <button
          key={p.months}
          onClick={() => setPeriod(p.months)}
          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
            period === p.months
              ? "bg-blue-600 text-white border-blue-600"
              : "border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-600"
          }`}
        >
          {p.label}
        </button>
      ))}
      <span className="ml-auto text-xs text-gray-400 self-center">
        {PERIODS.find(p => p.months === period)?.unit === "weekly" ? "주별" : "월별"}
      </span>
    </div>
  );
}

function ChartFooter({
  peak,
  current,
  isWeekly,
}: {
  peak: number;
  current: number;
  isWeekly: boolean;
}) {
  return (
    <div className="flex items-center justify-between mt-1">
      <p className="text-xs text-gray-400">
        네이버 검색 상대 지수 (100 = 최고점) · <span className="text-red-400">●</span> 최고점
        {isWeekly && " · 주별 데이터"}
      </p>
      <div className="flex gap-3 text-xs text-gray-500">
        <span>최고 <strong className="text-red-500">{Math.round(peak)}</strong></span>
        <span>현재 <strong className="text-blue-600">{Math.round(current)}</strong></span>
      </div>
    </div>
  );
}
