/**
 * 분석 결과 스냅샷 — 과거 분석 재방문 시 API 재호출 없이 즉시 로드
 */
import { supabase } from "./db";

export interface AnalysisSnapshot {
  result: unknown;
  trend: unknown;
  naverScoreData: unknown;
  demographics?: unknown;
}

export interface SnapshotRow {
  snapshot: AnalysisSnapshot;
  created_at: string;
}

/** 스냅샷 조회 */
export async function getSnapshot(
  userId: string,
  keyword: string,
  platform: string
): Promise<SnapshotRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("analysis_snapshots")
    .select("snapshot, created_at")
    .eq("user_id", userId)
    .eq("keyword", keyword)
    .eq("platform", platform)
    .single();

  if (error || !data) return null;
  return data as SnapshotRow;
}

/** 스냅샷 저장 (upsert) */
export async function saveSnapshot(
  userId: string,
  keyword: string,
  platform: string,
  snapshot: AnalysisSnapshot
): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("analysis_snapshots")
    .upsert(
      {
        user_id: userId,
        keyword,
        platform,
        snapshot,
        created_at: new Date().toISOString(),
      },
      { onConflict: "user_id,keyword,platform" }
    );
}
