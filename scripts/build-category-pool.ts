/**
 * 카테고리 키워드 풀 배치 수집
 *
 * 온톨로지 V2 L3/L4 노드별로 Ad API(`relKwdStat`)를 호출해
 * 연관 키워드 + 월 검색량 + 경쟁도를 수집하고 category_keyword_pool에 저장한다.
 *
 * 실행:
 *   npx tsx scripts/build-category-pool.ts                  # 전체
 *   npx tsx scripts/build-category-pool.ts --platform=smartstore
 *   npx tsx scripts/build-category-pool.ts --limit=20       # 앞에서 N개만
 *   npx tsx scripts/build-category-pool.ts --dry-run
 *
 * 예상 소요: ~510 L3 노드 × 2초 = 약 17분 (Ad API rate limit 보호)
 * 예상 API 호출: ~510 콜/실행 (일 한도 40K의 1.3%)
 */

import { createClient } from "@supabase/supabase-js";
import { getNodesV2 } from "../lib/ontology";
import { getNaverAdKeywords, totalMonthlyVolume, type NaverAdKeyword } from "../lib/naver-ad";
import type { Platform } from "../lib/ontology/types";

// ─────────────────────────────────────────
// 환경
// ─────────────────────────────────────────
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 미설정");
  process.exit(1);
}

const supabase = createClient(url, key);

// ─────────────────────────────────────────
// 옵션 파싱
// ─────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (name: string): string | undefined => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : undefined;
};

const platformArg = getArg("platform") as Platform | undefined;
const limitArg = getArg("limit");
const limit = limitArg ? parseInt(limitArg, 10) : undefined;
const dryRun = args.includes("--dry-run");

// ─────────────────────────────────────────
// 상수
// ─────────────────────────────────────────
const MAX_KEYWORDS_PER_NODE = 300; // 노드당 저장 상한 (top rank)
const MIN_MONTHLY_VOLUME = 50;     // 월 검색량 50 미만 제외 (노이즈)
const CALL_DELAY_MS = 2000;        // 호출 간격

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

interface NodeJob {
  nodeId: string;
  platform: Platform;
  seedKeyword: string;
}

/**
 * 노드에서 Ad API에 넘길 유효한 시드 선택
 *
 * Ad API hintKeywords 제약: 공백·슬래시·특수문자 포함 키워드 거부 (400 BAD_REQUEST).
 * 우선순위:
 *   1) variantKeywords 중 공백·슬래시 없는 첫 항목 ("한돈삼겹살")
 *   2) seedKeywords 중 공백·슬래시 없는 첫 항목
 *   3) 노드명에서 공백·슬래시 제거 후 (길이 ≥ 2)
 *   4) null (skip)
 */
function pickCleanSeed(node: {
  name: string;
  variantKeywords?: string[];
  seedKeywords?: string[];
}): string | null {
  const isClean = (s: string) => !!s && !/[\s/]/.test(s) && s.length >= 2;

  // 1순위: node.name 자체가 깨끗하면 사용 — 가장 대표성 있는 시드
  //        (variantKeywords 최상위가 특수 변형이라 풀이 좁아지는 문제 방지)
  if (isClean(node.name)) return node.name;

  // 2순위: variantKeywords 중 깨끗한 첫 항목
  if (node.variantKeywords) {
    const hit = node.variantKeywords.find(isClean);
    if (hit) return hit;
  }

  // 3순위: seedKeywords 중 깨끗한 첫 항목
  if (node.seedKeywords) {
    const hit = node.seedKeywords.find(isClean);
    if (hit) return hit;
  }

  // 4순위: 공백/슬래시 제거한 name
  const stripped = node.name.replace(/[\s/]/g, "");
  if (stripped.length >= 2) return stripped;
  return null;
}

function collectJobs(platforms: Platform[]): NodeJob[] {
  const jobs: NodeJob[] = [];
  for (const platform of platforms) {
    const nodes = getNodesV2(platform);
    for (const node of nodes) {
      if (node.level < 2) continue; // L1 skip. L2(음료수 등)는 카테고리 루트로 유용하므로 포함
      const seed = pickCleanSeed(node);
      if (!seed) continue;
      jobs.push({
        nodeId: node.id,
        platform,
        seedKeyword: seed,
      });
    }
  }
  return jobs;
}

function toRows(
  nodeId: string,
  platform: Platform,
  items: NaverAdKeyword[],
): Array<Record<string, unknown>> {
  const sorted = items
    .map((item) => ({ item, total: totalMonthlyVolume(item) }))
    .filter(({ total }) => total >= MIN_MONTHLY_VOLUME)
    .sort((a, b) => b.total - a.total)
    .slice(0, MAX_KEYWORDS_PER_NODE);

  return sorted.map(({ item }, idx) => ({
    node_id: nodeId,
    platform,
    keyword: item.relKeyword,
    monthly_pc: item.monthlyPcQcCnt ?? 0,
    monthly_mobile: item.monthlyMobileQcCnt ?? 0,
    comp_idx: item.compIdx ?? null,
    ad_depth: typeof item.plAvgDepth === "number" ? item.plAvgDepth : null,
    rank: idx + 1,
    fetched_at: new Date().toISOString(),
  }));
}

async function run() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("카테고리 키워드 풀 배치 수집");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const platforms: Platform[] = platformArg ? [platformArg] : ["smartstore", "coupang"];
  let jobs = collectJobs(platforms);
  if (limit !== undefined) jobs = jobs.slice(0, limit);

  console.log(`- 대상 플랫폼: ${platforms.join(", ")}`);
  console.log(`- 수집 대상 L3+ 노드: ${jobs.length}개`);
  console.log(`- 노드당 상한: ${MAX_KEYWORDS_PER_NODE}개 (월 검색량 ≥ ${MIN_MONTHLY_VOLUME})`);
  console.log(`- 예상 소요: ~${Math.ceil((jobs.length * CALL_DELAY_MS) / 60000)}분`);
  console.log(`- 드라이런: ${dryRun ? "YES" : "NO"}`);
  console.log("");

  let totalKeywords = 0;
  let okCount = 0;
  let emptyCount = 0;
  let errorCount = 0;
  const startedAt = Date.now();

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    const progress = `[${i + 1}/${jobs.length}]`;

    try {
      const items = await getNaverAdKeywords(job.seedKeyword);
      const rows = toRows(job.nodeId, job.platform, items);

      if (rows.length === 0) {
        emptyCount++;
        console.log(`${progress} ⚠️  ${job.platform}:${job.nodeId} (${job.seedKeyword}) — 결과 없음`);
      } else {
        if (!dryRun) {
          // 기존 행 정리 후 삽입 (간단한 덮어쓰기)
          const { error: delErr } = await supabase
            .from("category_keyword_pool")
            .delete()
            .eq("node_id", job.nodeId)
            .eq("platform", job.platform);
          if (delErr) throw delErr;

          const { error: insErr } = await supabase
            .from("category_keyword_pool")
            .insert(rows);
          if (insErr) throw insErr;
        }
        okCount++;
        totalKeywords += rows.length;
        console.log(`${progress} ✅ ${job.platform}:${job.nodeId} (${job.seedKeyword}) — ${rows.length}개 저장`);
      }
    } catch (err) {
      errorCount++;
      console.log(`${progress} ❌ ${job.platform}:${job.nodeId} — ${err instanceof Error ? err.message : err}`);
    }

    if (i < jobs.length - 1) await sleep(CALL_DELAY_MS);
  }

  const elapsedMin = ((Date.now() - startedAt) / 60000).toFixed(1);

  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("완료 요약");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`✅ 성공: ${okCount} / ${jobs.length}`);
  console.log(`⚠️  빈 결과: ${emptyCount}`);
  console.log(`❌ 에러: ${errorCount}`);
  console.log(`📦 누적 저장 키워드: ${totalKeywords.toLocaleString()}개`);
  console.log(`⏱️  소요 시간: ${elapsedMin}분`);
  console.log("");
  if (dryRun) console.log("🔎 드라이런 모드 — 실제 DB 쓰기 없음");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
