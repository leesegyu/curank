import { trackApiCall } from "./api-monitor";

const DATALAB_BASE = "https://openapi.naver.com/v1/datalab";

function getHeaders() {
  return {
    "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID!,
    "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET!,
    "Content-Type": "application/json",
  };
}

function getDateRange(months = 12) {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - months);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
}

export interface TrendPoint {
  period: string;
  ratio: number;
}

export interface TrendData {
  keyword: string;
  data: TrendPoint[];        // 월별 (12개월)
  weeklyData: TrendPoint[];  // 주별 (최근 16주)
  peak: number;
  current: number;
  direction: "상승" | "하락" | "안정";
}

export interface AgeGroup {
  age: string;   // e.g. "13~18세"
  code: string;  // "2"
  ratio: number; // 0~100
}

export interface DemographicData {
  maleRatio: number;
  femaleRatio: number;
  ageGroups: AgeGroup[];
  hasGenderData: boolean;
  hasAgeData: boolean;
  usedKeyword: string; // 실제 데이터를 가져온 키워드 (폴백 시 첫 단어)
}

// ─── API 호출 헬퍼 ────────────────────────────────────────────────

type DatalabJson = { results?: { data: TrendPoint[] }[] };

// fetchDatalab 결과: data=null + error=false → "데이터 없음(확정)"
//                    data=null + error=true  → "API 에러(일시적)" → 캐시 금지
interface FetchResult {
  data: DatalabJson | null;
  error: boolean;
}

async function fetchDatalab(body: object): Promise<FetchResult> {
  if (!trackApiCall("naver_datalab")) return { data: null, error: true };
  try {
    const res = await fetch(`${DATALAB_BASE}/search`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok || json.errorCode || json.errMsg) {
      // 429(한도 초과), 500 등은 일시적 에러 → 캐시하면 안 됨
      return { data: null, error: true };
    }
    return { data: json, error: false };
  } catch {
    return { data: null, error: true };
  }
}

function getDataPoints(result: FetchResult): TrendPoint[] {
  return result.data?.results?.[0]?.data ?? [];
}

function avgRatioFromPoints(pts: TrendPoint[]): number {
  if (pts.length === 0) return 0;
  return pts.reduce((s, d) => s + d.ratio, 0) / pts.length;
}

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// batchSize개씩 병렬 → 배치 사이 delayMs 간격
async function batchedFetch(bodies: object[], batchSize = 4, delayMs = 200): Promise<FetchResult[]> {
  const results: FetchResult[] = [];
  for (let i = 0; i < bodies.length; i += batchSize) {
    const batch = bodies.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fetchDatalab));
    results.push(...batchResults);
    if (i + batchSize < bodies.length) await delay(delayMs);
  }
  return results;
}

// ─── 트렌드 (월별 + 주별) ─────────────────────────────────────────

export async function getKeywordTrend(keyword: string): Promise<TrendData> {
  // 캐시 확인 (24h TTL)
  const { cacheGet, cacheSet } = await import("./cache");
  const cached = await cacheGet<TrendData>(keyword, "trend");
  if (cached) return cached;

  // 월별만 가져옴 (주별은 lazy — getKeywordWeeklyTrend으로 분리)
  const monthly = getDateRange(12);
  const monthlyResult = await fetchDatalab({
    startDate: monthly.startDate,
    endDate: monthly.endDate,
    timeUnit: "month",
    keywordGroups: [{ groupName: keyword, keywords: [keyword] }],
  });

  const data = getDataPoints(monthlyResult);
  const result = buildTrendData(keyword, data, []);

  if (!monthlyResult.error || data.length > 0) {
    await cacheSet(keyword, "trend", result);
  }
  return result;
}

// 주별 트렌드 (lazy — 사용자가 3개월/1개월 차트 클릭 시에만 호출)
export async function getKeywordWeeklyTrend(keyword: string): Promise<TrendPoint[]> {
  // 캐시에 weeklyData가 이미 있으면 반환
  const { cacheGet, cacheSet } = await import("./cache");
  const cached = await cacheGet<TrendData>(keyword, "trend");
  if (cached?.weeklyData && cached.weeklyData.length > 0) return cached.weeklyData;

  const weekly4mo = getDateRange(4);
  const weeklyResult = await fetchDatalab({
    startDate: weekly4mo.startDate,
    endDate: weekly4mo.endDate,
    timeUnit: "week",
    keywordGroups: [{ groupName: keyword, keywords: [keyword] }],
  });

  const weeklyData = getDataPoints(weeklyResult);

  // 기존 캐시에 weeklyData 병합
  if (cached && weeklyData.length > 0) {
    const merged = { ...cached, weeklyData };
    await cacheSet(keyword, "trend", merged);
  }

  return weeklyData;
}

// ─── 트렌드 배치 (keywordGroups 5개씩 묶어 API 호출 절약) ──────────

function buildTrendData(keyword: string, monthlyPts: TrendPoint[], weeklyPts: TrendPoint[]): TrendData {
  const values = monthlyPts.map((d) => d.ratio);
  const peak = values.length ? Math.max(...values) : 0;
  const current = values.at(-1) ?? 0;
  const prev = values.at(-3) ?? current;
  let direction: TrendData["direction"] = "안정";
  if (current > prev * 1.1) direction = "상승";
  else if (current < prev * 0.9) direction = "하락";
  return { keyword, data: monthlyPts, weeklyData: weeklyPts, peak, current, direction };
}

export async function getKeywordTrendBatch(keywords: string[]): Promise<Map<string, TrendData>> {
  const { cacheGet, cacheSet } = await import("./cache");
  const resultMap = new Map<string, TrendData>();

  // 캐시 히트 먼저 처리
  const uncached: string[] = [];
  for (const kw of keywords) {
    const cached = await cacheGet<TrendData>(kw, "trend");
    if (cached) { resultMap.set(kw, cached); }
    else { uncached.push(kw); }
  }

  if (uncached.length === 0) return resultMap;

  const monthly = getDateRange(12);
  const weekly4mo = getDateRange(4);

  // 5개씩 묶어서 API 호출 (keywordGroups 최대 5개)
  for (let i = 0; i < uncached.length; i += 5) {
    const batch = uncached.slice(i, i + 5);
    const keywordGroups = batch.map((kw) => ({ groupName: kw, keywords: [kw] }));

    const [monthlyResult, weeklyResult] = await Promise.all([
      fetchDatalab({ startDate: monthly.startDate, endDate: monthly.endDate, timeUnit: "month", keywordGroups }),
      fetchDatalab({ startDate: weekly4mo.startDate, endDate: weekly4mo.endDate, timeUnit: "week", keywordGroups }),
    ]);

    const monthlyResults = monthlyResult.data?.results ?? [];
    const weeklyResults = weeklyResult.data?.results ?? [];
    const hadError = monthlyResult.error || weeklyResult.error;

    for (let j = 0; j < batch.length; j++) {
      const kw = batch[j];
      const mPts: TrendPoint[] = monthlyResults[j]?.data ?? [];
      const wPts: TrendPoint[] = weeklyResults[j]?.data ?? [];
      const trend = buildTrendData(kw, mPts, wPts);
      resultMap.set(kw, trend);
      if (!hadError || mPts.length > 0) {
        await cacheSet(kw, "trend", trend);
      }
    }

    // 배치 사이 100ms 딜레이
    if (i + 5 < uncached.length) await delay(100);
  }

  return resultMap;
}

// ─── 인구통계 ─────────────────────────────────────────────────────

// Naver Datalab 연령 코드 전체 11개
const AGE_CODES: { label: string; code: string }[] = [
  { label: "~12세",   code: "1" },
  { label: "13~18세", code: "2" },
  { label: "19~24세", code: "3" },
  { label: "25~29세", code: "4" },
  { label: "30~34세", code: "5" },
  { label: "35~39세", code: "6" },
  { label: "40~44세", code: "7" },
  { label: "45~49세", code: "8" },
  { label: "50~54세", code: "9" },
  { label: "55~59세", code: "10" },
  { label: "60세+",   code: "11" },
];

interface DemoFetchResult {
  malePoints: TrendPoint[];
  femalePoints: TrendPoint[];
  agePointsList: TrendPoint[][];
  hadApiError: boolean; // true면 캐시 금지
}

async function fetchDemographicsFor(keyword: string): Promise<DemoFetchResult> {
  const { startDate, endDate } = getDateRange(3);
  const base = {
    startDate, endDate,
    timeUnit: "month",
    keywordGroups: [{ groupName: keyword, keywords: [keyword] }],
  };

  // ① 성별 2개 병렬 (빠름 ~90ms)
  const [maleResult, femaleResult] = await Promise.all([
    fetchDatalab({ ...base, gender: "m" }),
    fetchDatalab({ ...base, gender: "f" }),
  ]);

  const genderHadError = maleResult.error || femaleResult.error;
  const malePoints   = getDataPoints(maleResult);
  const femalePoints = getDataPoints(femaleResult);

  // ② 성별 데이터가 확정적으로 없으면 (에러가 아닌 진짜 없음) 연령 호출 스킵
  //    → 11회 API 절약 (일일 한도 보존)
  const genderConfirmedEmpty = !genderHadError && malePoints.length === 0 && femalePoints.length === 0;
  if (genderConfirmedEmpty) {
    return {
      malePoints, femalePoints,
      agePointsList: AGE_CODES.map(() => []),
      hadApiError: false,
    };
  }

  // ③ 연령 11개 배치 처리 — 4개씩 병렬, 배치 사이 100ms
  const ageResults = await batchedFetch(
    AGE_CODES.map((a) => ({ ...base, ages: [a.code] })),
    4,
    100
  );

  const ageHadError = ageResults.some((r) => r.error);
  const agePointsList = ageResults.map(getDataPoints);

  return {
    malePoints, femalePoints, agePointsList,
    hadApiError: genderHadError || ageHadError,
  };
}

export async function getKeywordDemographics(keyword: string): Promise<DemographicData> {
  const { cacheGet, cacheSet } = await import("./cache");
  const cached = await cacheGet<DemographicData>(keyword, "demo");
  if (cached) {
    if (cached.hasGenderData || cached.hasAgeData) return cached;
  }

  // ★ 1순위: Shopping Insight API (별도 한도, 2회 호출로 전부)
  try {
    const { resolveNaverCategoryCode, fetchShoppingDemographics } = await import("./shopping");
    const catCode = await resolveNaverCategoryCode(keyword);
    if (catCode) {
      const shopping = await fetchShoppingDemographics(keyword, catCode);
      if (shopping.hasGenderData || shopping.hasAgeData) {
        const demoResult: DemographicData = {
          ...shopping,
          ageGroups: shopping.ageGroups.map((a) => ({ age: a.age, code: a.code, ratio: a.ratio })),
        };
        await cacheSet(keyword, "demo", demoResult);
        return demoResult;
      }
    }
  } catch { /* Shopping Insight 실패 시 DataLab 폴백 */ }

  // ★ 2순위: DataLab Search 폴백 (기존 로직, Search 한도 사용)
  let result = await fetchDemographicsFor(keyword);
  let { malePoints, femalePoints, agePointsList } = result;

  const hasGender1 = malePoints.length > 0 || femalePoints.length > 0;
  const hasAge1 = agePointsList.some((pts) => pts.length > 0);

  let usedKeyword = keyword;
  if (!hasGender1 && !hasAge1 && !result.hadApiError) {
    const firstWord = keyword.trim().split(/\s+/)[0];
    if (firstWord && firstWord !== keyword) {
      const fallback = await fetchDemographicsFor(firstWord);
      malePoints = fallback.malePoints;
      femalePoints = fallback.femalePoints;
      agePointsList = fallback.agePointsList;
      result = fallback;
      usedKeyword = firstWord;
    }
  }

  const hasGenderData = malePoints.length > 0 || femalePoints.length > 0;
  const hasAgeData = agePointsList.some((pts) => pts.length > 0);

  const maleAvg = avgRatioFromPoints(malePoints);
  const femaleAvg = avgRatioFromPoints(femalePoints);

  let maleRatio = 50;
  let femaleRatio = 50;
  if (hasGenderData) {
    const total = maleAvg + femaleAvg;
    maleRatio = total > 0 ? Math.round((maleAvg / total) * 100) : 50;
    femaleRatio = 100 - maleRatio;
  }

  const ageRaws = AGE_CODES.map((a, i) => ({
    age: a.label, code: a.code,
    val: avgRatioFromPoints(agePointsList[i]),
  }));
  const ageTotal = ageRaws.reduce((s, a) => s + a.val, 0);

  let ageGroups: AgeGroup[];
  if (!hasAgeData || ageTotal === 0) {
    ageGroups = ageRaws.map((a) => ({ age: a.age, code: a.code, ratio: 0 }));
  } else {
    ageGroups = ageRaws.map((a) => ({
      age: a.age, code: a.code,
      ratio: Math.round((a.val / ageTotal) * 100),
    }));
    const sum = ageGroups.reduce((s, a) => s + a.ratio, 0);
    if (sum !== 100) {
      const maxIdx = ageGroups.reduce((mi, a, i, arr) => a.ratio > arr[mi].ratio ? i : mi, 0);
      ageGroups[maxIdx].ratio += (100 - sum);
    }
  }

  const demoResult: DemographicData = { maleRatio, femaleRatio, ageGroups, hasGenderData, hasAgeData, usedKeyword };
  if (!result.hadApiError) {
    await cacheSet(keyword, "demo", demoResult);
  }
  return demoResult;
}
