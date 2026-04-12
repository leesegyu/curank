"use client";

interface MonthlyRatio {
  month: number;
  ratio: number;
}

interface Props {
  monthlyRatios: MonthlyRatio[];
  peakMonth: number;
}

const MONTH_LABELS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const currentMonth = new Date().getMonth() + 1;

export default function MiniSeasonChart({ monthlyRatios, peakMonth }: Props) {
  const maxRatio = Math.max(...monthlyRatios.map((r) => r.ratio), 1);
  const barWidth = 14;
  const gap = 4;
  const chartHeight = 40;
  const svgWidth = 12 * barWidth + 11 * gap;

  return (
    <svg width="100%" viewBox={`0 0 ${svgWidth} ${chartHeight + 12}`} className="block">
      {monthlyRatios
        .sort((a, b) => a.month - b.month)
        .map((r, i) => {
          const h = Math.max(2, (r.ratio / maxRatio) * chartHeight);
          const x = i * (barWidth + gap);
          const y = chartHeight - h;

          const isCurrent = r.month === currentMonth;
          const isPeak = r.month === peakMonth;

          let fill = "#e5e7eb"; // gray-200
          if (isCurrent) fill = "#10b981"; // emerald-500
          else if (isPeak) fill = "#f97316"; // orange-500

          return (
            <g key={r.month}>
              <rect x={x} y={y} width={barWidth} height={h} rx={2} fill={fill} />
              <text
                x={x + barWidth / 2}
                y={chartHeight + 10}
                textAnchor="middle"
                fontSize="7"
                fill={isCurrent ? "#10b981" : isPeak ? "#f97316" : "#9ca3af"}
              >
                {MONTH_LABELS[i]}
              </text>
            </g>
          );
        })}
    </svg>
  );
}
