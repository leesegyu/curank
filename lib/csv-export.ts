/** 객체 배열을 CSV로 변환 후 다운로드 */
export function downloadCSV(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) return;
  const keys = Object.keys(rows[0]);
  const header = keys.join(",");
  const body = rows.map(row =>
    keys.map(k => {
      const v = row[k];
      const s = v == null ? "" : String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    }).join(",")
  ).join("\n");

  const BOM = "\uFEFF";
  const blob = new Blob([BOM + header + "\n" + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
