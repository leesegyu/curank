-- ============================================================
-- curank_ml (로컬 PostgreSQL) — 온톨로지 추적 테이블 추가
-- 실행: psql curank_ml -f 008_ontology_local_schema.sql
-- ============================================================

-- ① 유저별 온톨로지 가중치 주간 스냅샷 (Cold 계층, ML학습용)
-- 유저의 관심사 변화 추적: "3개월 전 캠핑 → 현재 헬스" 패턴 학습
CREATE TABLE IF NOT EXISTS user_ontology_history (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL,
  weights_json  JSONB NOT NULL,
  -- {"smartstore": {"ss.food.meat.pork": 5.2}, "coupang": {...}}
  snapshot_week TEXT NOT NULL,              -- ISO week: '2026-W14'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, snapshot_week)
);
CREATE INDEX IF NOT EXISTS idx_uoh_user_week ON user_ontology_history(user_id, snapshot_week DESC);

-- ② 키워드 → 온톨로지 경로 매핑 캐시
-- 한번 분류된 키워드-경로 쌍 영구 저장 → 분류 속도 최적화
CREATE TABLE IF NOT EXISTS keyword_ontology_map (
  keyword       TEXT NOT NULL,
  platform      TEXT NOT NULL,             -- 'smartstore' | 'coupang'
  ontology_path TEXT NOT NULL,             -- 'ss.food.meat.pork.belly'
  confidence    FLOAT NOT NULL DEFAULT 1.0,-- 1.0 = 정확 매칭, 0.5 = 추정
  classified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (keyword, platform)
);
CREATE INDEX IF NOT EXISTS idx_kom_path ON keyword_ontology_map(ontology_path);
