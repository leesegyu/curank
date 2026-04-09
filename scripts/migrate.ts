/**
 * Supabase 키워드 그래프 테이블 마이그레이션
 * 실행: npx tsx scripts/migrate.ts
 */

import { createClient } from "@supabase/supabase-js";

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!url || !key) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 미설정");
  process.exit(1);
}

const supabase = createClient(url, key);

const SQL_STEPS = [
  {
    name: "keyword_nodes 테이블 생성",
    sql: `
      CREATE TABLE IF NOT EXISTS keyword_nodes (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        text           TEXT UNIQUE NOT NULL,
        search_volume  INT,
        competition    INT,
        trend_direction TEXT,
        updated_at     TIMESTAMPTZ DEFAULT NOW()
      )
    `,
  },
  {
    name: "keyword_edges 테이블 생성",
    sql: `
      CREATE TABLE IF NOT EXISTS keyword_edges (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_text   TEXT NOT NULL,
        target_text   TEXT NOT NULL,
        relation_type TEXT NOT NULL,
        weight        FLOAT DEFAULT 1.0,
        created_at    TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(source_text, target_text, relation_type)
      )
    `,
  },
  {
    name: "인덱스 생성 (source)",
    sql: `CREATE INDEX IF NOT EXISTS idx_edges_source ON keyword_edges(source_text)`,
  },
  {
    name: "인덱스 생성 (target)",
    sql: `CREATE INDEX IF NOT EXISTS idx_edges_target ON keyword_edges(target_text)`,
  },
  {
    name: "인덱스 생성 (relation)",
    sql: `CREATE INDEX IF NOT EXISTS idx_edges_relation ON keyword_edges(relation_type)`,
  },
  {
    name: "인덱스 생성 (nodes text)",
    sql: `CREATE INDEX IF NOT EXISTS idx_nodes_text ON keyword_nodes(text)`,
  },
  {
    name: "upsert_keyword_edge 함수 생성",
    sql: `
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
      $$
    `,
  },
];

async function run() {
  console.log("🚀 Supabase 마이그레이션 시작\n");

  for (const step of SQL_STEPS) {
    process.stdout.write(`  ⏳ ${step.name}... `);
    const { error } = await supabase.rpc("exec_sql", { query: step.sql });
    if (error) {
      // exec_sql RPC가 없는 경우 → PostgreSQL REST /sql 직접 호출 시도
      const res = await fetch(`${url}/rest/v1/`, {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ query: step.sql }),
      });
      if (!res.ok) {
        console.log("❌");
        console.error(`     오류: ${error.message}`);
        console.error("     → service_role 키 또는 Supabase SQL 에디터에서 직접 실행 필요");
        process.exit(1);
      }
    }
    console.log("✅");
  }

  // 연결 검증
  const { data, error: chk } = await supabase
    .from("keyword_edges")
    .select("id")
    .limit(1);

  if (chk) {
    console.error("\n❌ 테이블 접근 실패:", chk.message);
    process.exit(1);
  }

  console.log("\n✅ 마이그레이션 완료! keyword_nodes, keyword_edges 테이블 준비됨");
}

run().catch((e) => {
  console.error("❌ 예외:", e);
  process.exit(1);
});
