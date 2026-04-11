-- ============================================================
-- 019: 온톨로지 L3 노드별 Ad API 키워드 풀 캐시
--
-- 목적: 카테고리별 연관 키워드 + 월 검색량·경쟁도를 사전 배치로 수집해
--       분석 요청 시 실시간 Ad API 호출을 대폭 줄인다 (월 70~80% 절감).
--
-- 수집 출처: 네이버 검색광고 API /keywordstool (공식·합법)
-- 수집 주기: 월 2회 (1일/15일 새벽 — pg_cron 밖, 수동 또는 외부 cron)
-- ============================================================

CREATE TABLE IF NOT EXISTS category_keyword_pool (
  id              BIGSERIAL PRIMARY KEY,
  node_id         TEXT NOT NULL,      -- 온톨로지 V2 노드 ID (ex: ss.food.meat.pork)
  platform        TEXT NOT NULL,      -- 'smartstore' | 'coupang'
  keyword         TEXT NOT NULL,
  monthly_pc      INT  NOT NULL DEFAULT 0,
  monthly_mobile  INT  NOT NULL DEFAULT 0,
  monthly_total   INT  GENERATED ALWAYS AS (monthly_pc + monthly_mobile) STORED,
  comp_idx        TEXT,               -- '낮음' | '중간' | '높음'
  ad_depth        NUMERIC(5,2),       -- plAvgDepth (평균 광고 노출 위치)
  rank            INT  NOT NULL,      -- 풀 내 순위 (검색량 기준 내림차순)
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (node_id, platform, keyword)
);

-- 조회 인덱스: 노드/플랫폼 조합으로 순위순 탐색
CREATE INDEX IF NOT EXISTS idx_ckp_node_platform_rank
  ON category_keyword_pool (node_id, platform, rank);

-- 키워드 역탐색 (특정 키워드가 어느 노드 풀에 포함되는지)
CREATE INDEX IF NOT EXISTS idx_ckp_keyword
  ON category_keyword_pool (keyword);

-- 신선도 표시용
CREATE INDEX IF NOT EXISTS idx_ckp_fetched_at
  ON category_keyword_pool (fetched_at DESC);

COMMENT ON TABLE  category_keyword_pool IS '온톨로지 L3 노드별 Ad API 키워드 풀 캐시 — 분석 시 실시간 호출 대체';
COMMENT ON COLUMN category_keyword_pool.monthly_total IS 'PC + Mobile 합산 월 검색량 (계산 컬럼)';
COMMENT ON COLUMN category_keyword_pool.rank IS '해당 노드 풀 내 월 검색량 순위 (1부터)';
