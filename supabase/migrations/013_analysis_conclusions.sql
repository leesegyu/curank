-- STEP 5 결론 결과 저장 (사용자+키워드+플랫폼별 1개)
CREATE TABLE IF NOT EXISTS analysis_conclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  platform TEXT NOT NULL,
  result JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, keyword, platform)
);

CREATE INDEX idx_conclusions_user ON analysis_conclusions(user_id);
CREATE INDEX idx_conclusions_lookup ON analysis_conclusions(user_id, keyword, platform);
