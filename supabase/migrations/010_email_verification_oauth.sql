-- 1단계: 이메일 인증 컬럼 추가
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified       BOOLEAN     DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_verify_token   TEXT,
  ADD COLUMN IF NOT EXISTS email_verify_expires TIMESTAMPTZ;

-- 기존 사용자(이미 가입한 유저)는 인증된 것으로 처리
UPDATE users SET email_verified = true WHERE email_verified = false;

-- 토큰 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_users_email_verify_token
  ON users(email_verify_token)
  WHERE email_verify_token IS NOT NULL;

-- 3단계: 크로스 OAuth 다중 프로바이더 지원
-- oauth_providers: [{"provider":"google","id":"123"},{"provider":"kakao","id":"456"}]
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS oauth_providers JSONB DEFAULT '[]';

-- 기존 oauth_provider/oauth_id 데이터를 oauth_providers 배열로 마이그레이션
UPDATE users
SET oauth_providers = jsonb_build_array(
  jsonb_build_object('provider', oauth_provider, 'id', oauth_id)
)
WHERE oauth_provider IS NOT NULL
  AND oauth_id IS NOT NULL
  AND (oauth_providers IS NULL OR oauth_providers = '[]');

-- oauth_providers 내부 검색용 GIN 인덱스
CREATE INDEX IF NOT EXISTS idx_users_oauth_providers
  ON users USING GIN (oauth_providers);
