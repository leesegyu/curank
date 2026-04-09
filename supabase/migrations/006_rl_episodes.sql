-- rl_episodes: 추천 노출/클릭 RL 데이터 (Supabase serving, nightly export → 로컬)
-- Supabase SQL 에디터에서 실행

CREATE TABLE IF NOT EXISTS rl_episodes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  query_keyword   TEXT NOT NULL,
  candidate_kw    TEXT NOT NULL,
  rank_shown      INT NOT NULL,
  model_version   TEXT NOT NULL DEFAULT 'v1',
  hour_of_day     SMALLINT,
  day_of_week     SMALLINT,
  was_clicked     BOOL NOT NULL DEFAULT FALSE,
  was_analyzed    BOOL NOT NULL DEFAULT FALSE,
  reward          FLOAT,
  exposed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clicked_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rl_user_exposed   ON rl_episodes(user_id, exposed_at);
CREATE INDEX IF NOT EXISTS idx_rl_query_exposed  ON rl_episodes(query_keyword, exposed_at);
CREATE INDEX IF NOT EXISTS idx_rl_unclicked      ON rl_episodes(user_id, query_keyword, candidate_kw, was_clicked)
  WHERE was_clicked = FALSE;
