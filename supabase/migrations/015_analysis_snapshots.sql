-- 분석 결과 스냅샷 — 과거 분석 재방문 시 API 재호출 없이 즉시 로드
CREATE TABLE IF NOT EXISTS analysis_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  keyword TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'naver',
  snapshot JSONB NOT NULL,          -- { result, trend, naverScoreData }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, keyword, platform)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_user ON analysis_snapshots(user_id, created_at DESC);
