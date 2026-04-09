-- ─── 회원 테이블 (Auth.js Credentials 방식, Supabase Auth 우회) ───
-- Supabase Auth의 50K MAU 한도를 완전히 우회 → 무제한 회원
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  name          TEXT,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ─── 분석 결과 캐시 (L2 캐시, Naver API 호출 90% 절감) ────────────
-- L1: node-cache (1시간, 인메모리)
-- L2: 이 테이블 (24시간, 영구 저장)
CREATE TABLE IF NOT EXISTS analysis_cache (
  keyword     TEXT NOT NULL,
  cache_type  TEXT NOT NULL,   -- 'keywords' | 'keywords_v2'
  result      JSONB NOT NULL,
  cached_at   TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (keyword, cache_type)
);

CREATE INDEX IF NOT EXISTS idx_analysis_cache_expires ON analysis_cache(expires_at);
