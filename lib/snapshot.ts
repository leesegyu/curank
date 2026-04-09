/**
 * 분석 결과 스냅샷 — 과거 분석 재방문 시 API 재호출 없이 즉시 로드
 */
import { supabase } from "./db";

export interface AnalysisSnapshot {
  result: unknown;
  trend: unknown;
  naverScoreData: unknown;
  demographics?: unknown;
  // 키워드 추천 데이터 (재방문 시 API 호출 0)
  keywordsV1?: unknown;      // Blue Ocean
  keywordsV2?: unknown;      // AI 심층 비교
  keywordsCreative?: unknown; // 크리에이티브 발굴
  keywordsGraph?: unknown;   // 그래프 연관
  factorScore?: unknown;     // 판매 성공 지표
  keywordsHistorical?: unknown; // 1년전 인기 키워드
  competitorThreat?: unknown; // 경쟁 위협도
  brandDistribution?: unknown; // 브랜드/상호명 분포
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
