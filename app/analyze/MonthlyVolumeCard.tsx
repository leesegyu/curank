"use client";

import { useEffect, useState } from "react";

export default function MonthlyVolumeCard({ keyword }: { keyword: string }) {
  const [volume, setVolume] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/volume?keyword=${encodeURIComponent(keyword)}`)
      .then((r) => r.json())
      .then((d) => setVolume(d.volume ?? 0))
      .catch(() => setVolume(0));
  }, [keyword]);

  const display =
    volume === null
      ? "..."
      : volume === 0
      ? "-"
      : volume >= 10000
      ? (volume / 10000).toFixed(1) + "만"
      : volume.toLocaleString();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center col-span-2 sm:col-span-2">
      <p className="text-xs text-gray-400 mb-1">월 검색량 (PC+모바일)</p>
      <p className="text-xl font-black text-gray-900">{display}</p>
      <p className="text-xs text-gray-400">회 / 월</p>
    </div>
  );
}
