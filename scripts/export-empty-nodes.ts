/**
 * "결과없음"으로 나온 온톨로지 노드를 CSV로 export
 * — 보스가 수동 보완할 노드 리스트 작성용
 *
 * 실행: npx tsx scripts/export-empty-nodes.ts
 * 출력: ~/Desktop/curank-empty-nodes-YYYY-MM-DD.csv
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { createClient } from "@supabase/supabase-js";
import { getNodesV2 } from "../lib/ontology";
import type { Platform } from "../lib/ontology/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const sb = createClient(url, key);

interface EmptyNode {
  platform: Platform;
  nodeId: string;
  nodeName: string;
  level: number;
  parentName: string;
  variantKeywordsCount: number;
  rowCount: number;
  status: "빈결과" | "빈약(<30)";
}

async function main() {
  const results: EmptyNode[] = [];

  for (const platform of ["smartstore", "coupang"] as const) {
    const nodes = getNodesV2(platform);
    const l3plus = nodes.filter((n) => n.level >= 3);

    for (const node of l3plus) {
      const { count } = await sb
        .from("category_keyword_pool")
        .select("*", { count: "exact", head: true })
        .eq("node_id", node.id)
        .eq("platform", platform);

      const rowCount = count ?? 0;
      if (rowCount >= 30) continue;

      const parent = nodes.find((n) => n.id === node.parent);
      results.push({
        platform,
        nodeId: node.id,
        nodeName: node.name,
        level: node.level,
        parentName: parent?.name ?? "",
        variantKeywordsCount: node.variantKeywords?.length ?? 0,
        rowCount,
        status: rowCount === 0 ? "빈결과" : "빈약(<30)",
      });
    }
  }

  // CSV 생성
  const header = "플랫폼,노드ID,노드명,레벨,부모,Variant수,현재수집수,상태,보완방법\n";
  const rows = results.map((r) => {
    const fixHint = r.rowCount === 0
      ? "noden.name 또는 variantKeywords[0]가 Ad API에서 거부됨 — matchKeywords 확장 또는 L3 대체"
      : "variantKeywords 확장 + 재배치";
    return `${r.platform},${r.nodeId},${r.nodeName},${r.level},${r.parentName},${r.variantKeywordsCount},${r.rowCount},${r.status},"${fixHint}"`;
  });
  const csv = header + rows.join("\n");

  const today = new Date().toISOString().slice(0, 10);
  const filename = `curank-empty-nodes-${today}.csv`;
  const outPath = path.join(os.homedir(), "Desktop", filename);
  fs.writeFileSync(outPath, "\ufeff" + csv, "utf-8"); // BOM for Excel Korean

  console.log(`✅ 저장 완료: ${outPath}`);
  console.log(`총 ${results.length}개 노드 — 빈결과 ${results.filter(r => r.status === "빈결과").length} / 빈약 ${results.filter(r => r.status === "빈약(<30)").length}`);
  console.log("\n플랫폼별:");
  console.log(`  smartstore: ${results.filter(r => r.platform === "smartstore").length}`);
  console.log(`  coupang: ${results.filter(r => r.platform === "coupang").length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
