/**
 * API 호출 모니터링 + 한도 관리 시스템
 * - 인메모리 카운터 (일간, 자정 자동 리셋)
 * - 한도 도달 시 텔레그램 알림 (30/60/80/90%)
 * - 100% 도달 시 호출 차단 → 캐시 전용 모드
 */

import NodeCache from "node-cache";
import { sendTelegram } from "./telegram";

// ─── API별 일일 한도 ──────────────────────────────────────────
const API_LIMITS: Record<string, number> = {
  naver_shop:    25_000,   // Naver Shopping Search
  naver_ad:      40_000,   // Naver Ad Keyword Tool
  naver_datalab: 10_000,   // Naver DataLab Search
  naver_insight: 10_000,   // Naver Shopping Insight (별도 한도)
  openai:         1_000,   // OpenAI GPT (안전 한도)
};

const THRESHOLDS = [0.3, 0.6, 0.8, 0.9];

// 자정까지 남은 초 계산
function secondsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.floor((midnight.getTime() - now.getTime()) / 1000);
}

// 카운터: 자정에 자동 만료
const counters = new NodeCache({ stdTTL: secondsUntilMidnight(), checkperiod: 3600 });
// 알림 중복 방지 (같은 임계치에 1회만)
const alertedCache = new NodeCache({ stdTTL: secondsUntilMidnight(), checkperiod: 3600 });

/**
 * API 호출 전 호출. 한도 초과 시 false 반환 (차단).
 * @returns true = 호출 가능, false = 한도 초과 (차단)
 */
export function trackApiCall(apiName: string): boolean {
  const limit = API_LIMITS[apiName];
  if (!limit) return true; // 등록되지 않은 API는 통과

  const key = `count:${apiName}`;
  const current = (counters.get<number>(key) ?? 0) + 1;
  counters.set(key, current);

  const ratio = current / limit;

  // 임계치 알림
  for (const t of THRESHOLDS) {
    const alertKey = `alert:${apiName}:${t}`;
    if (ratio >= t && !alertedCache.get(alertKey)) {
      alertedCache.set(alertKey, true);
      const pct = Math.round(t * 100);
      const emoji = t >= 0.8 ? "🚨" : "⚠️";
      sendTelegram(
        `${emoji} <b>[쿠랭크] ${apiName} 일일 한도 ${pct}% 도달</b>\n\n` +
        `호출: <b>${current.toLocaleString()}/${limit.toLocaleString()}</b>\n` +
        `남은 한도: ${(limit - current).toLocaleString()}건\n\n` +
        `${t >= 0.9 ? "🔴 한도 초과 임박! 캐시 전용 모드 전환 준비" : "📊 모니터링 중"}`
      ).catch(() => {});
    }
  }

  // 100% 초과 시 차단
  if (current > limit) {
    if (!alertedCache.get(`alert:${apiName}:blocked`)) {
      alertedCache.set(`alert:${apiName}:blocked`, true);
      sendTelegram(
        `🔴 <b>[쿠랭크] ${apiName} 일일 한도 초과 — 호출 차단됨</b>\n\n` +
        `호출: <b>${current.toLocaleString()}/${limit.toLocaleString()}</b>\n` +
        `캐시 전용 모드로 전환. 자정에 자동 복구됩니다.`
      ).catch(() => {});
    }
    return false;
  }

  return true;
}

/**
 * 현재 API 사용량 조회 (관리자용)
 */
export function getApiUsage(): Record<string, { used: number; limit: number; ratio: number }> {
  const result: Record<string, { used: number; limit: number; ratio: number }> = {};
  for (const [name, limit] of Object.entries(API_LIMITS)) {
    const used = counters.get<number>(`count:${name}`) ?? 0;
    result[name] = { used, limit, ratio: Math.round((used / limit) * 100) };
  }
  return result;
}
