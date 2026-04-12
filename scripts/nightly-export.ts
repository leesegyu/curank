#!/usr/bin/env npx tsx
/**
 * nightly-export.ts — Hot/Cold 2계층 데이터 파이프라인
 *
 * [매일 새벽 3시 실행]
 * 1. Supabase user_events → 로컬 curank_ml DB 이관 (raw_events, user_sessions 등)
 * 2. Supabase user_events 7일 초과 삭제 (500MB 한도 유지)
 * 3. 최근 7일 user_events → users.category_weights JSONB 재계산 (온톨로지 기반)
 * 4. 주 1회(월요일): category_weights 스냅샷 → curank_ml.user_ontology_history
 *
 * 크론: 0 3 * * * cd /Users/segyu/Desktop/curank && npx tsx scripts/nightly-export.ts >> /tmp/curank-export.log 2>&1
 */

import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import "dotenv/config";
import { classifyKeyword } from "../lib/ontology/index";

const BATCH_SIZE = 500;
const HOT_RETENTION_DAYS = 7;  // Supabase: 7일만 보관 (피드 생성용)

// ── 이벤트별 가중치 (온톨로지 가중치 계산용) ─────────────────────
const EVENT_WEIGHTS: Record<string, number> = {
  search: 1.0,
  analyze: 2.0,
  analyze_dwell: 3.0,  // 체류시간 기록 = 높은 관심도
  copy_keyword: 4.0,
  click_recommendation: 2.0,
};

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const localDb = new pg.Client({
    host: "127.0.0.1",
    port: 5432,
    database: "curank_ml",
    user: process.env.USER || "segyu",
  });
  await localDb.connect();

  console.log(`[${ts()}] nightly export 시작`);

  // ══════════════════════════════════════════════════════════════
  // STEP 1: Supabase → 로컬 DB 이관
  // ══════════════════════════════════════════════════════════════
  let exported = 0;
  let cursor: string | null = null;

  while (true) {
    let query = supabase
      .from("user_events")
      .select("id, user_id, event_type, keyword, metadata, ts")
      .order("ts", { ascending: true })
      .limit(BATCH_SIZE);

    if (cursor) query = query.gt("ts", cursor);

    const { data, error } = await query;
    if (error) { console.error("Supabase 조회 오류:", error.message); break; }
    if (!data || data.length === 0) break;

    for (const event of data) {
      // raw_events (감사 로그)
      await localDb.query(
        `INSERT INTO raw_events (supabase_id, user_id, event_type, keyword, metadata, ts)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (supabase_id) DO NOTHING`,
        [event.id, event.user_id, event.event_type, event.keyword, event.metadata, event.ts]
      ).catch(() => {});

      if (!event.keyword || !event.user_id) continue;
      const meta = (event.metadata as Record<string, unknown>) ?? {};
      const sessionId = (meta.session_id as string) || event.user_id;

      // user_sessions (SASRec)
      await localDb.query(
        `INSERT INTO user_sessions (user_id, session_id, keyword, action, position, source, ts)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [event.user_id, sessionId, event.keyword, event.event_type,
         (meta.position as number) ?? null, (meta.source as string) ?? "direct", event.ts]
      ).catch(() => {});

      // user_keyword_interactions (LightGCN)
      const weight = EVENT_WEIGHTS[event.event_type] ?? 1;
      await localDb.query(
        `INSERT INTO user_keyword_interactions (user_id, keyword, weight, interact_count, last_seen)
         VALUES ($1, $2, $3, 1, $4)
         ON CONFLICT (user_id, keyword) DO UPDATE SET
           weight = user_keyword_interactions.weight + EXCLUDED.weight,
           interact_count = user_keyword_interactions.interact_count + 1,
           last_seen = GREATEST(user_keyword_interactions.last_seen, EXCLUDED.last_seen)`,
        [event.user_id, event.keyword, weight, event.ts]
      ).catch(() => {});

      // keyword_ontology_map 캐시 (한번 분류 → 영구 저장)
      const classified = classifyKeyword(event.keyword);
      if (classified) {
        await localDb.query(
          `INSERT INTO keyword_ontology_map (keyword, platform, ontology_path)
           VALUES ($1, $2, $3) ON CONFLICT (keyword, platform) DO NOTHING`,
          [event.keyword, classified.platform, classified.path]
        ).catch(() => {});
      }
    }

    exported += data.length;
    cursor = data[data.length - 1].ts;
    console.log(`  → ${exported}개 이관됨`);
    if (data.length < BATCH_SIZE) break;
  }

  // ══════════════════════════════════════════════════════════════
  // STEP 2: Supabase 7일 초과 이벤트 삭제
  // ══════════════════════════════════════════════════════════════
  const cutoff = new Date(Date.now() - HOT_RETENTION_DAYS * 86400_000).toISOString();
  const { count, error: delError } = await supabase
    .from("user_events")
    .delete({ count: "exact" })
    .lt("ts", cutoff);

  if (delError) console.error("삭제 오류:", delError.message);
  else console.log(`  → Supabase에서 ${count ?? 0}개 삭제 (${HOT_RETENTION_DAYS}일 초과)`);

  // ══════════════════════════════════════════════════════════════
  // STEP 2.5: 만료 스냅샷/결론/캐시 정리 (snapshotDays 기반)
  // ══════════════════════════════════════════════════════════════
  console.log(`  → 만료 스냅샷/결론/캐시 정리 시작`);

  // 플랜별 snapshotDays: free=10, standard=30, business/premium/membership=90
  const SNAPSHOT_CLEANUP_RULES = [
    { plan: "free", days: 10 },
    { plan: "standard", days: 30 },
    { plan: "business", days: 90 },
    { plan: "premium", days: 90 },
    { plan: "membership", days: 90 },
  ];

  let snapshotsCleaned = 0;
  for (const rule of SNAPSHOT_CLEANUP_RULES) {
    const snapshotCutoff = new Date(Date.now() - rule.days * 86400_000).toISOString();
    // 해당 플랜 유저의 만료 스냅샷 삭제
    const { count: snapCount } = await supabase
      .from("analysis_snapshots")
      .delete({ count: "exact" })
      .lt("created_at", snapshotCutoff)
      .in("user_id",
        (await supabase.from("users").select("id").eq("plan", rule.plan).limit(10000))
          .data?.map((u) => u.id) ?? []
      );
    // 해당 플랜 유저의 만료 결론 삭제
    const { count: concCount } = await supabase
      .from("analysis_conclusions")
      .delete({ count: "exact" })
      .lt("generated_at", snapshotCutoff)
      .in("user_id",
        (await supabase.from("users").select("id").eq("plan", rule.plan).limit(10000))
          .data?.map((u) => u.id) ?? []
      );
    // 해당 플랜 유저의 만료 분석 이력 삭제
    const { count: histCount } = await supabase
      .from("analysis_history")
      .delete({ count: "exact" })
      .lt("analyzed_at", snapshotCutoff)
      .in("user_id",
        (await supabase.from("users").select("id").eq("plan", rule.plan).limit(10000))
          .data?.map((u) => u.id) ?? []
      );
    snapshotsCleaned += (snapCount ?? 0) + (concCount ?? 0) + (histCount ?? 0);
  }
  console.log(`  → 만료 스냅샷/결론/이력 ${snapshotsCleaned}개 삭제`);

  // 만료된 analysis_cache 정리
  const { count: cacheCount } = await supabase
    .from("analysis_cache")
    .delete({ count: "exact" })
    .lt("expires_at", new Date().toISOString());
  console.log(`  → 만료 analysis_cache ${cacheCount ?? 0}개 삭제`);

  // 30일 이상 미사용 keyword_cache 정리
  const kwCacheCutoff = new Date(Date.now() - 30 * 86400_000).toISOString();
  const { count: kwCacheCount } = await supabase
    .from("keyword_cache")
    .delete({ count: "exact" })
    .lt("updated_at", kwCacheCutoff);
  console.log(`  → 오래된 keyword_cache ${kwCacheCount ?? 0}개 삭제`);

  // ══════════════════════════════════════════════════════════════
  // STEP 3: users.category_weights JSONB 재계산
  //   최근 7일 user_events → 온톨로지 경로 매핑 → 가중치 집계
  //   weight = Σ(event_score × recency_decay)
  //   recency_decay = exp(-0.1 × days_ago)
  // ══════════════════════════════════════════════════════════════
  console.log(`  → category_weights 재계산 시작`);

  // 최근 7일 이벤트를 유저별로 그룹 조회
  const { data: recentEvents } = await supabase
    .from("user_events")
    .select("user_id, event_type, keyword, ts")
    .order("ts", { ascending: false })
    .limit(10000); // 7일이면 충분

  if (recentEvents && recentEvents.length > 0) {
    // 유저별 가중치 집계
    const userWeights = new Map<string, { smartstore: Record<string, number>; coupang: Record<string, number> }>();

    const now = Date.now();
    for (const evt of recentEvents) {
      if (!evt.keyword || !evt.user_id) continue;

      const eventScore = EVENT_WEIGHTS[evt.event_type] ?? 1;
      const daysAgo = (now - new Date(evt.ts).getTime()) / 86400_000;
      const recencyDecay = Math.exp(-0.1 * daysAgo); // 7일전 → 0.5, 당일 → 1.0
      const weightedScore = eventScore * recencyDecay;

      // 온톨로지 분류
      const classified = classifyKeyword(evt.keyword);
      if (!classified) continue;

      if (!userWeights.has(evt.user_id)) {
        userWeights.set(evt.user_id, { smartstore: {}, coupang: {} });
      }
      const uw = userWeights.get(evt.user_id)!;
      const platformWeights = uw[classified.platform];
      platformWeights[classified.path] = (platformWeights[classified.path] ?? 0) + weightedScore;
    }

    // Supabase users 테이블 업데이트
    let updated = 0;
    for (const [userId, weights] of userWeights) {
      const weightsJson = {
        smartstore: weights.smartstore,
        coupang: weights.coupang,
        updated_at: new Date().toISOString(),
      };

      await supabase
        .from("users")
        .update({ category_weights: weightsJson })
        .eq("id", userId);

      updated++;
    }
    console.log(`  → ${updated}명의 category_weights 업데이트`);
  }

  // ══════════════════════════════════════════════════════════════
  // STEP 4: 주 1회(월요일) — category_weights 스냅샷 아카이브
  // ══════════════════════════════════════════════════════════════
  const today = new Date();
  if (today.getDay() === 1) { // 월요일
    const isoWeek = getISOWeek(today);
    console.log(`  → 주간 스냅샷 (${isoWeek}) 시작`);

    // Supabase에서 전체 유저의 category_weights 조회
    const { data: allUsers } = await supabase
      .from("users")
      .select("id, category_weights")
      .not("category_weights", "is", null);

    let snapshots = 0;
    if (allUsers) {
      for (const user of allUsers) {
        if (!user.category_weights) continue;
        await localDb.query(
          `INSERT INTO user_ontology_history (user_id, weights_json, snapshot_week)
           VALUES ($1, $2, $3) ON CONFLICT (user_id, snapshot_week) DO UPDATE SET
           weights_json = EXCLUDED.weights_json`,
          [user.id, JSON.stringify(user.category_weights), isoWeek]
        ).catch(() => {});
        snapshots++;
      }
    }
    console.log(`  → ${snapshots}명 스냅샷 저장`);
  }

  await localDb.end();
  console.log(`[${ts()}] 완료. 이관 ${exported}개`);
}

function ts(): string {
  return new Date().toISOString();
}

function getISOWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400_000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

main().catch((e) => {
  console.error("nightly export 실패:", e);
  process.exit(1);
});
