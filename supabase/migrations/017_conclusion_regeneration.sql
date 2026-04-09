-- 결론 재생성 횟수 추적
ALTER TABLE analysis_conclusions
  ADD COLUMN IF NOT EXISTS regeneration_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_regenerated_at TIMESTAMPTZ;
