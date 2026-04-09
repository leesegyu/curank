-- users 테이블 셀러 프로필 + OAuth 컬럼 추가
-- Supabase SQL 에디터에서 실행

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS selling_experience TEXT,
  -- 'beginner'(초보: 6개월 미만) | 'intermediate'(중급: 6개월~2년) | 'expert'(고수: 2년 이상)

  ADD COLUMN IF NOT EXISTS main_categories TEXT[] DEFAULT '{}',
  -- CATEGORIES 코드 배열: ['50000000','50000003', ...]

  ADD COLUMN IF NOT EXISTS main_platform TEXT,
  -- 'coupang' | 'smartstore' | 'both' | 'other'

  ADD COLUMN IF NOT EXISTS oauth_provider TEXT,
  -- 'google' | 'kakao' | null(이메일 가입)

  ADD COLUMN IF NOT EXISTS oauth_id TEXT,
  -- OAuth 제공자의 고유 사용자 ID (중복 방지용)

  ADD COLUMN IF NOT EXISTS avatar_url TEXT;
  -- OAuth 프로필 이미지 URL

-- OAuth 중복 방지: provider + id 조합 unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth
  ON users(oauth_provider, oauth_id)
  WHERE oauth_provider IS NOT NULL AND oauth_id IS NOT NULL;

-- 이메일 소문자 정규화 인덱스 (이미 있을 수 있음)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower
  ON users(lower(email));
