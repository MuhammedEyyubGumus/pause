// RFC 4180 CSV. Excel'in Türkçe sürümü noktalı virgülle ayrılmış dosya bekler,
// bu yüzden ayırıcı dile göre seçilir. Başa eklenen BOM, Türkçe karakterlerin
// Excel'de doğru görünmesini sağlar.
export function toCsv(rows: (string | number | null | undefined)[][], delimiter: "," | ";"): string {
  const cell = (v: string | number | null | undefined) => {
    if (v == null) return "";
    const s = String(v);
    // Formül enjeksiyonunu önle (=, +, -, @ ile başlayan metinler Excel'de çalıştırılır)
    const safe = /^[=+\-@]/.test(s) && Number.isNaN(Number(s)) ? `'${s}` : s;
    return /[",;\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return "﻿" + rows.map((r) => r.map(cell).join(delimiter)).join("\r\n") + "\r\n";
}
