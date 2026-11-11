// BaxxStock – Parser für Depot-Listen (Textarea-Import)
// Liefert [{ isin, name, qty, value }]. Erkennt Positionen über die ISIN.
// Tabellen (Tab/Semikolon): eine Position pro Zeile. Freitext (Bank-Depotansicht):
// Reihenfolge je Position Name → ISIN → Zahlen (erste Zahl = Stück, größte weitere = Wert).

const ISIN_RE = /\b[A-Z]{2}[A-Z0-9]{9}[0-9]\b/g;
const HEADER_RE = /^(name|bezeichnung|wertpapier|titel|isin|wkn|st(ü|ue)ck(\s*\/\s*nominal)?|stk\.?|nominal|anzahl|bestand|wert|kurswert|marktwert|kurs|währung|gewinn.*|verlust.*)$/i;
const NOISE_RE = /^(eur|usd|chf|gbp|€|\$|stk\.?|st\.?|stück)$|%$|^\d{1,2}\.\d{1,2}\.(\d{2}|\d{4})$|^\d{1,2}:\d{2}/i;

function isinValid(s) { // Prüfziffer (Luhn über die Ziffernfolge)
  const digits = [...s].map((c) => (/\d/.test(c) ? c : String(c.charCodeAt(0) - 55))).join("");
  let sum = 0, dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d; dbl = !dbl;
  }
  return sum % 10 === 0;
}

function findIsin(text) {
  for (const m of text.matchAll(ISIN_RE)) if (isinValid(m[0])) return { isin: m[0], index: m.index };
  return null;
}

// "1.234,56" / "1234,5" / "1,234.56" / "10 Stk." / "1.234,00 €" → Zahl, sonst null
function parseNumber(s) {
  const t = s.replace(/(stk\.?|stück|st\.|eur|usd|chf|gbp)/gi, "").replace(/[€$\s ]/g, "");
  if (/^[+-]?(\d{1,3}(\.\d{3})+|\d+)(,\d+)?$/.test(t)) return Number(t.replace(/\./g, "").replace(",", "."));
  if (/^[+-]?(\d{1,3}(,\d{3})+|\d+)\.\d+$/.test(t)) return Number(t.replace(/,/g, ""));
  return null;
}

function toCells(text) {
  const lines = text.split(/\r?\n/);
  const table = lines.some((l) => l.includes("\t") || l.includes(";"));
  const cells = [];
  lines.forEach((line, row) => {
    const parts = table ? line.split(line.includes("\t") ? "\t" : ";") : line.split(/\s{2,}/);
    for (const p of parts) { const t = p.trim().replace(/^"(.*)"$/, "$1").trim(); if (t) cells.push({ text: t, row }); }
  });
  return { cells, table };
}

// Zelle mit ISIN und weiterem Text ("SAP SE DE0007164600 10 1.234,00 €") in Einzelzellen zerlegen
function expand(cells) {
  const out = [];
  for (const c of cells) {
    const m = findIsin(c.text);
    if (!m || c.text === m.isin) { out.push(c); continue; }
    const before = c.text.slice(0, m.index).replace(/^[\s\-–\/(:,]+|[\s\-–\/(:,]+$/g, "");
    if (/[A-Za-zÄÖÜäöü]/.test(before)) out.push({ text: before, row: c.row });
    out.push({ text: m.isin, row: c.row });
    const rest = c.text.slice(m.index + 12).replace(/wkn:?\s*\w{6}/gi, " ");
    for (const n of rest.match(/[+-]?\d[\d.,]*/g) || []) out.push({ text: n.replace(/[.,]+$/, ""), row: c.row });
  }
  return out;
}

function parseDepotList(text) {
  const { cells: raw, table } = toCells(text || "");
  const cells = expand(raw)
    .filter((c) => !HEADER_RE.test(c.text) && !NOISE_RE.test(c.text))
    .map((c) => {
      const isin = findIsin(c.text);
      if (isin && isin.isin === c.text) return { ...c, kind: "isin" };
      const num = parseNumber(c.text);
      return num !== null ? { ...c, kind: "num", num } : { ...c, kind: "text" };
    })
    .filter((c) => !(c.kind === "text" && /^(?=.*\d)(?=.*[A-Z])[A-Z0-9]{6}$/.test(c.text))); // WKN
  // WKN als reine 6-stellige Zahl direkt neben der ISIN entfernen
  const clean = cells.filter((c, i) => !(c.kind === "num" && /^\d{6}$/.test(c.text) &&
    (cells[i - 1]?.kind === "isin" || cells[i + 1]?.kind === "isin")));

  const recs = [];
  if (table) {
    const rows = new Map();
    for (const c of clean) { if (!rows.has(c.row)) rows.set(c.row, []); rows.get(c.row).push(c); }
    for (const rc of rows.values()) {
      const isin = rc.find((c) => c.kind === "isin");
      if (!isin) continue;
      recs.push({ isin: isin.text, name: rc.find((c) => c.kind === "text")?.text || "",
                  nums: rc.filter((c) => c.kind === "num").map((c) => c.num) });
    }
  } else {
    let pending = [], cur = null;
    for (const c of clean) {
      if (c.kind === "text") pending.push(c.text);
      else if (c.kind === "isin") { cur = { isin: c.text, name: pending[0] || "", nums: [] }; recs.push(cur); pending = []; }
      else if (cur && !pending.length) cur.nums.push(c.num);
    }
  }

  // gleiche ISIN mehrfach (z. B. mehrere Lots/Depots) → aufsummieren
  const byIsin = new Map();
  for (const r of recs) {
    const qty = r.nums.length ? r.nums[0] : null;
    const value = r.nums.length > 1 ? Math.max(...r.nums.slice(1)) : null;
    const prev = byIsin.get(r.isin);
    if (!prev) byIsin.set(r.isin, { isin: r.isin, name: r.name, qty, value });
    else {
      if (qty !== null) prev.qty = (prev.qty ?? 0) + qty;
      if (value !== null) prev.value = (prev.value ?? 0) + value;
      if (!prev.name) prev.name = r.name;
    }
  }
  return [...byIsin.values()];
}

if (typeof module !== "undefined") module.exports = { parseDepotList, parseNumber, isinValid };
