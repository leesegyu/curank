/**
 * 키워드별 작년 12개월 월별 검색량 사전 배치
 *
 * 대상: category_keyword_pool의 키워드 중 상위 N개 (기본 5개/노드)
 *       + 온톨로지 L3+ 노드의 name 시드
 *
 * API: Naver DataLab `/search` — 1년치 월별 데이터 한 번에 조회
 * 한도: naver_datalab 일 10,000콜
 *
 * 실행:
 *   npx tsx scripts/build-seasonal-trends.ts                 # 전체
 *   npx tsx scripts/build-seasonal-trends.ts --limit=50      # 처음 N개
 *   npx tsx scripts/build-seasonal-trends.ts --top-per-node=3 # 노드당 상위 N
 *   npx tsx scripts/build-seasonal-trends.ts --dry-run
 *
 * 예상:
 *   - 노드당 3개 × 740 노드 = ~2,200 키워드
 *   - DataLab 1콜에 5개 키워드 포함 (keywordGroups 5개) → 440 API 호출
 *   - 호출당 1.5초 = 약 11분
 */

import { createClient } from "@supabase/supabase-js";
import { getNodesV2 } from "../lib/ontology";
import { computeSeasonalMeta, type MonthlyRatio } from "../lib/seasonal-trend";
import { trackApiCall } from "../lib/api-monitor";
import type { Platform } from "../lib/ontology/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("❌ Supabase 환경변수 미설정");
  process.exit(1);
}
const sb = createClient(url, key);

const args = process.argv.slice(2);
const getArg = (name: string): string | undefined => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : undefined;
};
const limit = getArg("limit") ? parseInt(getArg("limit")!, 10) : undefined;
const topPerNode = getArg("top-per-node") ? parseInt(getArg("top-per-node")!, 10) : 3;
const dryRun = args.includes("--dry-run");

const DATALAB_BASE = "https://openapi.naver.com/v1/datalab";
function getHeaders() {
  return {
    "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID!,
    "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET!,
    "Content-Type": "application/json",
  };
}

const DELAY_MS = 1500;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 작년 1년치 (작년 1월 1일 ~ 작년 12월 31일)
function getLastYearRange(): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear() - 1;
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
}

/**
 * DataLab 호출 — 한번에 최대 5개 키워드
 * 반환: keyword → 월별 [{month, ratio}]
 */
async function fetchMonthlyRatios(keywords: string[]): Promise<Map<string, MonthlyRatio[]>> {
  const result = new Map<string, MonthlyRatio[]>();
  if (keywords.length === 0) return result;

  if (!trackApiCall("naver_datalab")) {
    console.warn("[datalab] 일 한도 초과 — 배치 중단");
    throw new Error("DATALAB_LIMIT");
  }

  const range = getLastYearRange();
  const keywordGroups = keywords.slice(0, 5).map((kw) => ({ groupName: kw, keywords: [kw] }));

  const res = await fetch(`${DATALAB_BASE}/search`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      startDate: range.start,
      endDate: range.end,
      timeUnit: "month",
      keywordGroups,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.warn(`[datalab] HTTP ${res.status}: ${text.slice(0, 150)}`);
    return result;
  }

  const json = await res.json();
  const groups = json?.results ?? [];

  for (let i = 0; i < keywordGroups.length; i++) {
    const kw = keywordGroups[i].groupName;
    const pts = (groups[i]?.data ?? []) as Array<{ period: string; ratio: number }>;

    if (pts.length === 0) continue;

    // 월별 평균 계산 (DataLab이 월 단위로 주면 각 월 1개, 그대로 사용)
    const ratios: MonthlyRatio[] = pts.map((p) => {
      const month = parseInt(p.period.split("-")[1], 10);
      return { month, ratio: Math.round(p.ratio * 100) / 100 };
    });

    // 12개월 전부 있는지 확인, 누락 시 보간(0)
    const byMonth = new Map(ratios.map((r) => [r.month, r.ratio]));
    const full: MonthlyRatio[] = [];
    for (let m = 1; m <= 12; m++) {
      full.push({ month: m, ratio: byMonth.get(m) ?? 0 });
    }

    // 0~100 정규화 (최대값 기준)
    const maxRatio = Math.max(...full.map((r) => r.ratio));
    if (maxRatio === 0) continue;
    const normalized = full.map((r) => ({
      month: r.month,
      ratio: Math.round((r.ratio / maxRatio) * 10000) / 100, // 0~100
    }));

    result.set(kw, normalized);
  }

  return result;
}

// ─────────────────────────────────────────────
// 수집 대상 키워드 결정
// ─────────────────────────────────────────────

async function collectTargetKeywords(): Promise<string[]> {
  const set = new Set<string>();

  // 1) 온톨로지 L3+ 노드명 + matchKeywords 대표 + variantKeywords 상위
  for (const platform of ["smartstore", "coupang"] as Platform[]) {
    const nodes = getNodesV2(platform);
    for (const n of nodes) {
      if (n.level < 3) continue;
      // 노드명
      if (n.name && n.name.length >= 2 && !/[\s/]/.test(n.name)) {
        set.add(n.name);
      }
      // matchKeywords 중 깨끗한 것 (상위 3개)
      let mkCount = 0;
      for (const mk of n.matchKeywords) {
        if (mk.length >= 2 && !/[\s/]/.test(mk) && mkCount < 3) {
          set.add(mk);
          mkCount++;
        }
      }
      // variantKeywords 상위 3개 (시즌 커버리지 확대)
      if (n.variantKeywords) {
        let vkCount = 0;
        for (const vk of n.variantKeywords) {
          if (vk.length >= 2 && !/[\s/]/.test(vk) && vkCount < 3) {
            set.add(vk);
            vkCount++;
          }
        }
      }
    }
  }

  // 2) category_keyword_pool 상위 키워드 (노드당 top N)
  const { data } = await sb
    .from("category_keyword_pool")
    .select("keyword, node_id, rank")
    .lte("rank", topPerNode)
    .order("node_id")
    .order("rank");

  if (data) {
    for (const row of data as Array<{ keyword: string }>) {
      const kw = row.keyword;
      if (kw && kw.length >= 2 && !/[\s/]/.test(kw)) set.add(kw);
    }
  }

  return Array.from(set);
}

// ─────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────

async function run() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("키워드 시즌 트렌드 배치 수집");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  let keywords = await collectTargetKeywords();
  if (limit !== undefined) keywords = keywords.slice(0, limit);

  const range = getLastYearRange();
  console.log(`- 수집 대상: ${keywords.length}개 고유 키워드`);
  console.log(`- 범위: ${range.start} ~ ${range.end}`);
  console.log(`- 배치: 5개/호출, 간격 ${DELAY_MS}ms`);
  console.log(`- 예상 API 호출: ${Math.ceil(keywords.length / 5)}`);
  console.log(`- 예상 소요: ${Math.ceil((keywords.length / 5) * DELAY_MS / 60000)}분`);
  console.log(`- 드라이런: ${dryRun ? "YES" : "NO"}`);
  console.log();

  let ok = 0, skipped = 0, errorCount = 0;
  const startedAt = Date.now();

  for (let i = 0; i < keywords.length; i += 5) {
    const batch = keywords.slice(i, i + 5);
    const idx = Math.floor(i / 5) + 1;
    const total = Math.ceil(keywords.length / 5);

    try {
      const ratiosMap = await fetchMonthlyRatios(batch);

      for (const kw of batch) {
        const ratios = ratiosMap.get(kw);
        if (!ratios || ratios.every((r) => r.ratio === 0)) {
          skipped++;
          console.log(`[${idx}/${total}] ⚠️  ${kw} — 데이터 없음`);
          continue;
        }
        const meta = computeSeasonalMeta(ratios);

        if (!dryRun) {
          const { error } = await sb
            .from("keyword_seasonal_trend")
            .upsert({
              keyword: kw,
              monthly_ratios: ratios,
              peak_month: meta.peakMonth,
              peak_ratio: meta.peakRatio,
              trough_month: meta.troughMonth,
              trough_ratio: meta.troughRatio,
              seasonality: meta.seasonality,
              season_type: meta.seasonType,
              fetched_at: new Date().toISOString(),
            }, { onConflict: "keyword" });
          if (error) {
            errorCount++;
            console.log(`[${idx}/${total}] ❌ ${kw} upsert 실패: ${error.message}`);
            continue;
          }
        }
        ok++;
        console.log(`[${idx}/${total}] ✅ ${kw} — peak M${meta.peakMonth}(${meta.peakRatio}) season=${meta.seasonType} var=${meta.seasonality}`);
      }
    } catch (err) {
      if (err instanceof Error && err.message === "DATALAB_LIMIT") {
        console.error("일 한도 초과 — 중단");
        break;
      }
      errorCount++;
      console.log(`[${idx}/${total}] ❌ 배치 실패: ${err instanceof Error ? err.message : err}`);
    }

    if (i + 5 < keywords.length) await sleep(DELAY_MS);
  }

  const elapsedMin = ((Date.now() - startedAt) / 60000).toFixed(1);
  console.log();
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`✅ 성공: ${ok}`);
  console.log(`⚠️  데이터 없음: ${skipped}`);
  console.log(`❌ 에러: ${errorCount}`);
  console.log(`⏱️  소요: ${elapsedMin}분`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
