-- ============================================================
-- curank_ml (로컬 PostgreSQL) — AI 학습 전용 스키마
-- 실행: psql curank_ml -f 003_ml_local_schema.sql
-- ============================================================

-- ① 세션 이벤트 (SASRec 학습용)
-- user가 한 세션 내에서 어떤 순서로 키워드를 탐색했는지 기록
CREATE TABLE IF NOT EXISTS user_sessions (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL,
  session_id  UUID NOT NULL,           -- 30분 비활동 = 새 세션
  keyword     TEXT NOT NULL,
  action      TEXT NOT NULL,           -- 'search'|'analyze'|'copy_keyword'|'click_recommendation'
  position    INT,                     -- 추천 리스트에서의 노출 순위 (없으면 NULL)
  dwell_ms    INT,                     -- 페이지 체류 시간 ms (없으면 NULL)
  source      TEXT,                    -- 'direct'|'recommendation_blue'|'recommendation_v2'|'category'
  ts          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_ts   ON user_sessions(user_id, ts);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session   ON user_sessions(session_id, ts);
CREATE INDEX IF NOT EXISTS idx_user_sessions_keyword   ON user_sessions(keyword);

-- ② 유저-키워드 상호작용 집계 (LightGCN 학습용)
-- user-keyword 이분 그래프의 가중치 엣지
CREATE TABLE IF NOT EXISTS user_keyword_interactions (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL,
  keyword     TEXT NOT NULL,
  weight      FLOAT NOT NULL DEFAULT 1.0,
  -- weight 산정: search=1, analyze=3, copy_keyword=5, click_recommendation=2
  interact_count INT NOT NULL DEFAULT 1,
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, keyword)
);
CREATE INDEX IF NOT EXISTS idx_uki_user    ON user_keyword_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_uki_keyword ON user_keyword_interactions(keyword);
CREATE INDEX IF NOT EXISTS idx_uki_weight  ON user_keyword_interactions(weight DESC);

-- ③ RL 에피소드 (Neural Contextual Bandit 학습용)
-- 추천 노출 → 클릭/무시 reward 기록
CREATE TABLE IF NOT EXISTS rl_episodes (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL,
  query_keyword   TEXT NOT NULL,          -- 사용자가 입력한 키워드
  candidate_kw    TEXT NOT NULL,          -- 추천된 후보 키워드
  rank_shown      INT NOT NULL,           -- 추천 리스트에서 보여진 순위 (1-based)
  model_version   TEXT NOT NULL DEFAULT 'v1',
  -- context features
  user_history_len INT,                   -- 이 세션에서 지금까지 본 키워드 수
  hour_of_day     SMALLINT,              -- 0-23
  day_of_week     SMALLINT,              -- 0(월)-6(일)
  -- reward signals (나중에 채워짐)
  was_clicked     BOOL NOT NULL DEFAULT FALSE,    -- 후보 키워드를 클릭했는지
  was_analyzed    BOOL NOT NULL DEFAULT FALSE,    -- /analyze로 이동했는지
  dwell_ms        INT,                            -- 클릭 후 체류 시간
  reward          FLOAT,                          -- 계산된 최종 reward (후처리)
  -- 메타
  exposed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clicked_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_rl_query_ts  ON rl_episodes(query_keyword, exposed_at);
CREATE INDEX IF NOT EXISTS idx_rl_user_ts   ON rl_episodes(user_id, exposed_at);
CREATE INDEX IF NOT EXISTS idx_rl_reward    ON rl_episodes(reward) WHERE reward IS NOT NULL;

-- ④ 키워드 임베딩 캐시 (LightGCN / SASRec 추론 결과)
CREATE TABLE IF NOT EXISTS keyword_embeddings (
  keyword       TEXT PRIMARY KEY,
  embedding     FLOAT[] NOT NULL,       -- 64차원 벡터
  model_version TEXT NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ⑤ 모델 학습 실험 추적
CREATE TABLE IF NOT EXISTS model_runs (
  id            BIGSERIAL PRIMARY KEY,
  model_type    TEXT NOT NULL,          -- 'sasrec'|'lightgcn'|'neural_bandit'
  version       TEXT NOT NULL,
  train_samples INT,
  val_samples   INT,
  metrics_json  JSONB,                  -- {ndcg@10, hit@10, loss, ...}
  hyperparams   JSONB,
  artifact_path TEXT,                   -- 모델 파일 경로
  trained_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ⑥ Supabase에서 이관된 원본 이벤트 (감사 로그)
-- Supabase의 user_events 테이블을 nightly export해서 여기에 저장
CREATE TABLE IF NOT EXISTS raw_events (
  id          BIGSERIAL PRIMARY KEY,
  supabase_id UUID,                     -- Supabase 원본 ID
  user_id     UUID NOT NULL,
  event_type  TEXT NOT NULL,
  keyword     TEXT,
  metadata    JSONB,
  ts          TIMESTAMPTZ NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_raw_events_user_ts ON raw_events(user_id, ts);
CREATE INDEX IF NOT EXISTS idx_raw_events_type    ON raw_events(event_type);
