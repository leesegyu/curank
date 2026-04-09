-- Resend 이메일 발송 로그 (한도 모니터링용)
CREATE TABLE IF NOT EXISTS email_send_log (
  id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 일간/월간 집계 쿼리 최적화
CREATE INDEX IF NOT EXISTS idx_email_send_log_sent_at
  ON email_send_log(sent_at);
