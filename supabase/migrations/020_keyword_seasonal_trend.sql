-- ============================================================
-- 020: 키워드별 작년 12개월 월별 상대 검색량 사전 저장
--
-- 목적: "시즌 추천 키워드" 카드가 분석마다 DataLab을 호출하지 않도록
--       작년 1년치 월별 곡선을 미리 수집해 DB에 저장.
--
-- 사용 패턴:
--   1) 월 1~2회 scripts/build-seasonal-trends.ts 실행
--      → 각 키워드에 DataLab 1년치 호출 → monthly_ratios 저장
--   2) 분석 시 DB 조회만 수행 → 현재 월 기준 phase 계산 → 추천
--
-- 판별 로직(분석 시점에 계산, 월 단위로 바뀌므로 DB에 저장 X):
--   - current_ratio / peak_ratio 백분율로 phase 판단
--   - 상승 vs 하락은 이전 2개월 평균 비교
--   - "rising(10~30%)" 구간 = 사용자 원하는 추천 구간
-- ============================================================

CREATE TABLE IF NOT EXISTS keyword_seasonal_trend (
  id               BIGSERIAL PRIMARY KEY,
  keyword          TEXT NOT NULL UNIQUE,
  -- 작년 12개월 상대 검색량 (0~100, 연중 최고 = 100)
  -- 형식: [{"month":1,"ratio":23.5},...,{"month":12,"ratio":5.2}]
  monthly_ratios   JSONB NOT NULL,
  -- 피크 월/값 (쿼리 성능)
  peak_month       INT NOT NULL,
  peak_ratio       NUMERIC(5,2) NOT NULL,
  -- 저점 월/값
  trough_month     INT NOT NULL,
  trough_ratio     NUMERIC(5,2) NOT NULL,
  -- 시즌성 지수 (max-min)/avg: 1.0 이상 = 시즌성 강함
  seasonality      NUMERIC(5,2) NOT NULL,
  -- 시즌 타입: 'summer'|'winter'|'spring'|'autumn'|'year_round'|'irregular'
  season_type      TEXT NOT NULL DEFAULT 'year_round',
  -- 수집 메타
  fetched_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 키워드 조회 인덱스 (UNIQUE가 자동 생성)
-- 시즌성 필터용
CREATE INDEX IF NOT EXISTS idx_kst_seasonality
  ON keyword_seasonal_trend (seasonality DESC);
-- 피크 월 기반 쿼리 (예: "현재 달 기준 2~4개월 후 피크")
CREATE INDEX IF NOT EXISTS idx_kst_peak_month
  ON keyword_seasonal_trend (peak_month);
-- 신선도
CREATE INDEX IF NOT EXISTS idx_kst_fetched
  ON keyword_seasonal_trend (fetched_at DESC);

COMMENT ON TABLE  keyword_seasonal_trend IS '작년 1년치 월별 상대 검색량 (DataLab 사전 배치)';
COMMENT ON COLUMN keyword_seasonal_trend.monthly_ratios IS '[{month:1~12, ratio:0~100}] 12개';
COMMENT ON COLUMN keyword_seasonal_trend.seasonality IS '(max-min)/avg. 1.0 이상=시즌성, 0.5 이하=비시즌';
COMMENT ON COLUMN keyword_seasonal_trend.season_type IS 'summer/winter/spring/autumn/year_round/irregular';
