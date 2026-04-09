-- 사용량 추적 + 플랜 컬럼
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS plan           TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS monthly_usage  INT  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS usage_reset_at TIMESTAMPTZ DEFAULT NOW();

-- 기존 사용자 초기화
UPDATE users
SET plan = 'free',
    monthly_usage = 0,
    usage_reset_at = date_trunc('month', NOW())
WHERE plan IS NULL OR monthly_usage IS NULL;
