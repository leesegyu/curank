-- 분석 이력 영구 보관 (user_events는 7일 후 삭제되므로 별도 보관)
CREATE TABLE IF NOT EXISTS analysis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  keyword TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'naver',
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, keyword, platform)
);

CREATE INDEX IF NOT EXISTS idx_analysis_history_user ON analysis_history(user_id, analyzed_at DESC);
