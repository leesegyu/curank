-- 기존 check constraint 제거 후 모든 플랜 허용
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_plan_check;
ALTER TABLE users ADD CONSTRAINT users_plan_check
  CHECK (plan IN ('free', 'standard', 'business', 'premium', 'membership'));
