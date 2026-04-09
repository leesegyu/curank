/**
 * 확장프로그램 관련 DB 테이블 생성
 * 실행: npx tsx scripts/migrate-ext.ts
 *
 * 생성 테이블:
 *   api_keys   — 발급된 API 키 (해시 저장)
 *   ext_tokens — 로그인 핸드오프용 1회성 토큰
 *
 * users 테이블에 plan 컬럼이 없는 경우 추가
 */

import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !key) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 미설정");
  process.exit(1);
}

const supabase = createClient(url, key);

const STEPS = [
  {
    name: "users 테이블에 plan 컬럼 추가 (없으면)",
    sql: `
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free'
          CHECK (plan IN ('free', 'pro', 'business'));
    `,
  },
  {
    name: "api_keys 테이블 생성",
    sql: `
      CREATE TABLE IF NOT EXISTS api_keys (
        id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        key_hash     TEXT        NOT NULL,
        key_prefix   TEXT        NOT NULL,
        is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_used_at TIMESTAMPTZ,
        UNIQUE (user_id)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys (key_hash);
    `,
  },
  {
    name: "ext_tokens 테이블 생성",
    sql: `
      CREATE TABLE IF NOT EXISTS ext_tokens (
        id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        request_id TEXT        NOT NULL UNIQUE,
        user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '5 minutes'
      );
      CREATE INDEX IF NOT EXISTS idx_ext_tokens_req ON ext_tokens (request_id);
      CREATE INDEX IF NOT EXISTS idx_ext_tokens_exp ON ext_tokens (expires_at);
    `,
  },
  {
    name: "만료된 ext_tokens 자동 삭제 (pg_cron 있는 경우만 — 없으면 무시)",
    sql: `
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
          PERFORM cron.schedule(
            'clean-ext-tokens',
            '*/5 * * * *',
            $$DELETE FROM ext_tokens WHERE expires_at < NOW()$$
          );
        END IF;
      END $$;
    `,
  },
];

async function runSql(sql: string): Promise<void> {
  // Supabase SQL 실행 (service role 필요)
  const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method:  "POST",
    headers: {
      apikey:          key,
      Authorization:   `Bearer ${key}`,
      "Content-Type":  "application/json",
      Prefer:          "return=minimal",
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    // exec_sql RPC 없는 경우 — Supabase SQL Editor에서 직접 실행 필요
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
}

async function main() {
  console.log("🚀 확장프로그램 DB 마이그레이션 시작\n");

  for (const step of STEPS) {
    process.stdout.write(`  ⏳ ${step.name}... `);
    try {
      await runSql(step.sql);
      console.log("✅");
    } catch (e) {
      console.log("⚠️  (Supabase SQL 에디터에서 직접 실행 필요)");
      console.log(`     SQL:\n${step.sql.trim().slice(0, 300)}\n`);
    }
  }

  // 검증
  const { error } = await supabase.from("api_keys").select("id").limit(1);
  if (error) {
    console.error("\n❌ api_keys 테이블 접근 실패:", error.message);
    console.log("\n📋 Supabase SQL 에디터에서 아래 SQL을 직접 실행하세요:");
    STEPS.forEach(s => console.log(s.sql));
    process.exit(1);
  }

  console.log("\n✅ 마이그레이션 완료! api_keys, ext_tokens 테이블 준비됨");
}

main().catch((e) => { console.error("❌", e); process.exit(1); });
