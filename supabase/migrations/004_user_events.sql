-- Supabase (serving) — 이벤트 임시 수집 테이블
-- nightly export 후 삭제 → 500MB 한도 유지
-- 실행: Supabase SQL 에디터에서 수동 실행

CREATE TABLE IF NOT EXISTS user_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  event_type  TEXT NOT NULL,  -- 'search'|'analyze'|'copy_keyword'|'click_recommendation'
  keyword     TEXT,
  metadata    JSONB,          -- {position, source, session_id, ...}
  ts          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_events_user_ts ON user_events(user_id, ts);
CREATE INDEX IF NOT EXISTS idx_user_events_type    ON user_events(event_type);
CREATE INDEX IF NOT EXISTS idx_user_events_keyword ON user_events(keyword);

-- 30일 이상 오래된 데이터 자동 삭제 (Supabase pg_cron 사용 가능 시)
-- SELECT cron.schedule('0 3 * * *', $$DELETE FROM user_events WHERE ts < NOW() - INTERVAL '30 days'$$);
