-- ============================================================
-- users 테이블에 category_weights JSONB 컬럼 추가
-- 유저별 온톨로지 카테고리 가중치 (Hot 계층, 서빙용)
--
-- 구조:
--   {
--     "smartstore": { "ss.food.meat.pork": 5.2, ... },
--     "coupang": { "cp.food.meat.pork": 4.1, ... },
--     "updated_at": "2026-04-05T15:00:00Z"
--   }
--
-- nightly cron에서 최근 7일 user_events 기반으로 매일 재계산
-- Supabase SQL 에디터에서 실행
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS category_weights JSONB DEFAULT '{"smartstore":{}, "coupang":{}, "updated_at":""}';

-- 인덱스: JSONB GIN (가중치 쿼리 최적화)
CREATE INDEX IF NOT EXISTS idx_users_category_weights
  ON users USING GIN (category_weights);
