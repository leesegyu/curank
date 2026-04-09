-- 키워드 지식 그래프 테이블
-- Supabase SQL 에디터에서 실행하세요.

-- ─── 노드: 키워드 메타데이터 ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS keyword_nodes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text           TEXT UNIQUE NOT NULL,
  search_volume  INT,                        -- 월간 검색량 (PC + 모바일)
  competition    INT,                        -- Naver Shopping totalCount
  trend_direction TEXT,                      -- '상승'|'하락'|'보합'
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 엣지: 키워드 간 관계 ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS keyword_edges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_text   TEXT NOT NULL,
  target_text   TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  -- CO_AUTOCOMPLETE : 자동완성에서 함께 등장
  -- CO_TITLE        : 같은 상품 타이틀에 공존
  -- TREND_SIMILAR   : 유사한 트렌드 곡선 (피어슨 상관계수 > 0.7)
  weight        FLOAT DEFAULT 1.0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_text, target_text, relation_type)
);

-- ─── 인덱스 ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_edges_source ON keyword_edges(source_text);
CREATE INDEX IF NOT EXISTS idx_edges_target ON keyword_edges(target_text);
CREATE INDEX IF NOT EXISTS idx_edges_relation ON keyword_edges(relation_type);
CREATE INDEX IF NOT EXISTS idx_nodes_text ON keyword_nodes(text);

-- ─── 엣지 가중치 증가 헬퍼 (중복 등장 시 누적) ──────────────────
CREATE OR REPLACE FUNCTION upsert_keyword_edge(
  p_source TEXT,
  p_target TEXT,
  p_relation TEXT,
  p_weight FLOAT DEFAULT 1.0
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO keyword_edges (source_text, target_text, relation_type, weight)
  VALUES (p_source, p_target, p_relation, p_weight)
  ON CONFLICT (source_text, target_text, relation_type)
  DO UPDATE SET weight = keyword_edges.weight + p_weight;
END;
$$;
