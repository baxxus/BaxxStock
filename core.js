// BaxxStock – gemeinsamer Code für Popup und Service Worker (kein DOM-Zugriff)
const CACHE_MS = 60 * 1000;

async function pool(items, limit, fn) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; await fn(items[i], i); }
  }));
}

async function fetchQuote(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=15m`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(res.status);
  const json = await res.json();
  const r = json?.chart?.result?.[0];
  if (!r) throw new Error("no data");
  const m = r.meta;
  const price = m.regularMarketPrice;
  const prev = m.chartPreviousClose ?? m.previousClose;
  const closes = (r.indicators?.quote?.[0]?.close || []).filter((v) => v != null);
  return { price, prev, change: price - prev, pct: prev ? ((price - prev) / prev) * 100 : 0,
           currency: m.currency, type: m.instrumentType || "", closes, time: m.regularMarketTime, period: m.currentTradingPeriod };
}

async function fetchAll(symbols) {
  const { cache = {} } = await chrome.storage.local.get("cache");
  const now = Date.now();
  const out = {};
  await pool(symbols, 6, async (s) => { // begrenzt parallel, sonst drosselt Yahoo bei langen Listen
    if (cache[s] && cache[s].q?.period && cache[s].q.type !== undefined && now - cache[s].t < CACHE_MS) { out[s] = cache[s].q; return; }
    try { const q = await fetchQuote(s); out[s] = q; cache[s] = { t: now, q }; }
    catch { out[s] = cache[s]?.q || null; }
  });
  await chrome.storage.local.set({ cache });
  return out;
}

// Währung einer Notierung → [Faktor auf Hauptwährung, Währungscode] (Pence → Pfund)
function currencyOf(q) {
  const c = q.currency || "EUR";
  return c === "GBp" || c === "GBX" ? [0.01, "GBP"] : [1, c];
}

// Yahoo-Symbole für Wechselkurse (→ EUR), die für die Positionen nötig sind
function fxSymbols(watch, positions, quotes) {
  const out = new Set();
  for (const [sym] of watch) {
    const q = quotes[sym], p = positions[sym];
    if (!q || !p || p.qty == null) continue;
    const cur = currencyOf(q)[1];
    if (cur !== "EUR") out.add(`${cur}EUR=X`);
  }
  return [...out];
}

// Gesamtentwicklung der eigenen Werte heute vs. Vortagesschluss, in EUR.
// Mit Stückzahl: qty × Kurs (Fremdwährung per fx). Weicht das um mehr als Faktor 2 vom importierten Wert ab
// (falsche Börse/Einheit, Nominal statt Stück …), gilt stattdessen der importierte Wert (flag = true).
// Nur mit Wert: Wert gilt als aktuell, Vortag über die Tagesveränderung.
// Positionen ohne Daten werden ausgelassen (used < total). Ohne verwertbare Position: null.
function computeSummary(watch, positions, quotes, fx = {}) {
  let now = 0, prev = 0, total = 0;
  const rows = [], seen = new Set();
  for (const [sym, name] of watch) {
    const p = positions[sym];
    if (seen.has(sym) || !p || (p.qty == null && p.value == null)) continue;
    seen.add(sym);
    total++;
    const q = quotes[sym];
    if (!q || !Number.isFinite(q.price) || !Number.isFinite(q.prev) || q.prev === 0) continue;
    let n = null, pv = null, flag = false;
    if (p.qty != null) {
      const [f, cur] = currencyOf(q);
      const rate = cur === "EUR" ? 1 : fx[`${cur}EUR=X`]?.price;
      if (Number.isFinite(rate)) { n = p.qty * q.price * f * rate; pv = p.qty * q.prev * f * rate; }
      if (p.value > 0 && !(n > p.value / 2 && n < p.value * 2)) { n = null; flag = true; }
    }
    if (n === null) {
      if (p.value == null) continue;
      n = p.value; pv = p.value / (1 + q.pct / 100);
    }
    now += n; prev += pv;
    rows.push({ sym, name: name || sym, now: n, delta: n - pv, flag });
  }
  if (!rows.length) return null;
  rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const delta = now - prev;
  const dir = Math.abs(delta) < 0.005 ? 0 : delta > 0 ? 1 : -1;
  return { now, prev, delta, pct: prev ? (delta / prev) * 100 : 0, used: rows.length, total, dir, rows };
}

async function loadSummary(watch, positions, quotes) {
  const syms = fxSymbols(watch, positions, quotes);
  const fx = syms.length ? await fetchAll(syms) : {};
  return computeSummary(watch, positions, quotes, fx);
}

// Toolbar-Icon: Dot unten rechts (grün ▲ / rot ▼); ohne Richtung Standard-Icon
async function updateIcon(summary) {
  const sizes = [16, 32, 48, 128];
  if (!summary?.dir) {
    await chrome.action.setIcon({ path: Object.fromEntries(sizes.map((s) => [s, `icons/icon${s}.png`])) });
    return;
  }
  const up = summary.dir > 0;
  const imageData = {};
  for (const size of [16, 32]) {
    const blob = await (await fetch(chrome.runtime.getURL(`icons/icon${size}.png`))).blob();
    const bmp = await createImageBitmap(blob);
    const c = new OffscreenCanvas(size, size), g = c.getContext("2d");
    g.drawImage(bmp, 0, 0, size, size);
    const r = size * 0.38, cx = size - r, cy = size - r;
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fillStyle = up ? "#5fe3a1" : "#ff7078"; g.fill();
    g.lineWidth = Math.max(1, size / 16); g.strokeStyle = "#14191d"; g.stroke();
    const k = r * 0.66, s = up ? 1 : -1; // Pfeil, nach unten gespiegelt
    const pts = [[0, -1], [0.95, 0], [0.38, 0], [0.38, 0.95], [-0.38, 0.95], [-0.38, 0], [-0.95, 0]];
    g.beginPath();
    pts.forEach(([x, y], i) => g[i ? "lineTo" : "moveTo"](cx + x * k, cy + y * k * s));
    g.closePath(); g.fillStyle = "#0b1f16"; g.fill();
    imageData[size] = g.getImageData(0, 0, size, size);
  }
  await chrome.action.setIcon({ imageData });
}
