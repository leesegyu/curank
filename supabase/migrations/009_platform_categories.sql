-- users 테이블에 플랫폼별 관심 카테고리 JSONB 추가
-- 기존 main_categories (TEXT[])는 하위 호환 유지
-- 새 필드: platform_categories JSONB
-- 구조: {"smartstore": ["ss.food", "ss.food.fruit"], "coupang": ["cp.digital.audio"]}
-- Supabase SQL 에디터에서 실행

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS platform_categories JSONB DEFAULT '{"smartstore":[], "coupang":[]}';
