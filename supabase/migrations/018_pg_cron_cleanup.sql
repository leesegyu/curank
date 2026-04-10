-- ============================================================
-- pg_cron 자동 정리 스크립트
-- Supabase Dashboard → SQL Editor 에서 실행
--
-- 사전 조건: pg_cron 확장이 활성화되어 있어야 함
--   → Dashboard > Database > Extensions > pg_cron 활성화
-- ============================================================

-- 1) pg_cron 확장 활성화 (이미 있으면 무시)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================
-- Job 1: rl_episodes 30일 이상 & 클릭 안 된 데이터 삭제
--         매일 새벽 4시(UTC) 실행
-- ============================================================
SELECT cron.schedule(
  'cleanup-rl-episodes',
  '0 4 * * *',   -- 매일 04:00 UTC (한국 13:00)
  $$
    DELETE FROM rl_episodes
    WHERE exposed_at < NOW() - INTERVAL '30 days'
      AND was_clicked = FALSE;
  $$
);

-- ============================================================
-- Job 2: analysis_snapshots 90일 초과 오래된 스냅샷 삭제
--         매주 일요일 새벽 3시(UTC) 실행
-- ============================================================
SELECT cron.schedule(
  'cleanup-old-snapshots',
  '0 3 * * 0',   -- 매주 일요일 03:00 UTC
  $$
    DELETE FROM analysis_snapshots
    WHERE created_at < NOW() - INTERVAL '90 days';
  $$
);

-- ============================================================
-- Job 3: analysis_snapshots raw data 슬림화 (기존 데이터 마이그레이션)
--         1회성 — 기존 스냅샷에서 products 배열과 naverScoreData 제거
--         실행 후 아래 unschedule 명령으로 제거
-- ============================================================
SELECT cron.schedule(
  'slim-existing-snapshots',
  '30 3 * * 0',  -- 일요일 03:30 UTC (cleanup 직후)
  $$
    UPDATE analysis_snapshots
    SET snapshot = snapshot
      #- '{result,products}'
      #- '{result,relatedKeywords}'
      - 'naverScoreData'
    WHERE snapshot->'result' ? 'products'
       OR snapshot ? 'naverScoreData';
  $$
);

-- ============================================================
-- Job 4: user_events 90일 초과 이벤트 삭제
--         매주 일요일 새벽 3시 30분(UTC) 실행
-- ============================================================
SELECT cron.schedule(
  'cleanup-old-events',
  '30 3 * * 0',  -- 매주 일요일 03:30 UTC
  $$
    DELETE FROM user_events
    WHERE created_at < NOW() - INTERVAL '90 days';
  $$
);

-- ============================================================
-- 등록된 cron job 확인
-- ============================================================
-- SELECT * FROM cron.job;

-- ============================================================
-- 슬림화 1회 완료 후 제거:
-- SELECT cron.unschedule('slim-existing-snapshots');
-- ============================================================
