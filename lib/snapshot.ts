/**
 * 분석 결과 스냅샷 — 과거 분석 재방문 시 API 재호출 없이 즉시 로드
 * ★ 슬림 정책: raw data(products 배열, naverScoreData) 제거, 요약만 저장
 */
import { supabase } from "./db";

export interface AnalysisSnapshot {
  result: unknown;
  trend: unknown;
  naverScoreData?: unknown;   // ← 더 이상 저장하지 않음 (하위 호환용 optional)
  demographics?: unknown;
  // 키워드 추천 데이터 (재방문 시 API 호출 0)
  keywordsV1?: unknown;      // Blue Ocean
  keywordsV2?: unknown;      // AI 심층 비교
  keywordsCreative?: unknown; // 크리에이티브 발굴
  keywordsGraph?: unknown;   // 그래프 연관
  factorScore?: unknown;     // 판매 성공 지표
  keywordsHistorical?: unknown; // 1년전 인기 키워드
  keywordsSeasonOpp?: unknown;  // 시즌 기회 (Historical + V2 융합)
  keywordsVariant?: unknown;   // 변형/품종 키워드
  competitorThreat?: unknown; // 경쟁 위협도
  brandDistribution?: unknown; // 브랜드/상호명 분포
  factorAggregated?: unknown;  // STEP 4 최종 후보 비교 — 사전 계산된 FactorScoreSet[] + 후보 메타
}

/**
 * 스냅샷 저장 전 raw data 제거 — DB 용량 대폭 절감
 * - result.products (상품 목록 전체) 제거
 * - result.relatedKeywords 제거
 * - naverScoreData 제거
 */
function slimSnapshot(snapshot: AnalysisSnapshot): AnalysisSnapshot {
  const slim = { ...snapshot };

  // naverScoreData 는 analyze() 입력값이지 출력이 아님 → 저장 불필요
  delete slim.naverScoreData;

  // result 에서 대용량 배열 제거
  if (slim.result && typeof slim.result === "object") {
    const r = { ...(slim.result as Record<string, unknown>) };
    delete r.products;
    delete r.relatedKeywords;
    slim.result = r;
  }

  return slim;
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

/** 스냅샷 저장 (upsert) — 자동 슬림화 적용 */
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
        snapshot: slimSnapshot(snapshot),
        created_at: new Date().toISOString(),
      },
      { onConflict: "user_id,keyword,platform" }
    );
}
