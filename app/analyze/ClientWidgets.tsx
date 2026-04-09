"use client";

import dynamic from "next/dynamic";

export const ProfitSimulator = dynamic(() => import("./ProfitSimulator"), { ssr: false });
export const MonthlyVolumeCard = dynamic(() => import("./MonthlyVolumeCard"), { ssr: false });
