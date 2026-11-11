// BaxxStock – Chrome Extension Popup
const MARKETS = [
  { group: "Deutschland", items: [
    ["^GDAXI", "DAX"], ["^MDAXI", "MDAX"], ["^TECDAX", "TecDAX"], ["^SDAXI", "SDAX"] ] },
  { group: "Europa & Welt", items: [
    ["^STOXX50E", "Euro Stoxx 50"], ["^DJI", "Dow Jones"], ["^GSPC", "S&P 500"],
    ["^NDX", "Nasdaq 100"], ["^N225", "Nikkei 225"], ["^HSI", "Hang Seng"] ] },
  { group: "Devisen & Rohstoffe", items: [
    ["EURUSD=X", "EUR/USD"], ["GC=F", "Gold (USD)"], ["SI=F", "Silber (USD)"],
    ["BZ=F", "Öl Brent"], ["BTC-EUR", "Bitcoin (EUR)"] ] }
];
const DEFAULT_WATCH = [["SAP.DE", "SAP"], ["ALV.DE", "Allianz"], ["SIE.DE", "Siemens"]];
const CACHE_MS = 60 * 1000;

const $ = (id) => document.getElementById(id);
const fmt = (n, d = 2) => n.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });

async function getSettings() {
  const s = await chrome.storage.sync.get({ watch: DEFAULT_WATCH, hidden: [] });
  return s;
}
async function saveSettings(patch) { await chrome.storage.sync.set(patch); }
// Positionen (Stück/Wert) bleiben lokal, nicht im Chrome Sync: { SYMBOL: { isin, qty, value } }
async function getPositions() { return (await chrome.storage.local.get({ positions: {} })).positions; }

const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function posText(p) {
  const parts = [];
  if (p.qty != null) parts.push(`${p.qty.toLocaleString("de-DE", { maximumFractionDigits: 4 })} Stk.`);
  if (p.value != null) parts.push(`Wert ${fmt(p.value)}`);
  return parts.join(" · ");
}

async function pool(items, limit, fn) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; await fn(items[i], i); }
  }));
}

async function resolveIsin(isin) {
  const res = await fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${isin}&quotesCount=5&newsCount=0&listsCount=0`);
  if (!res.ok) throw new Error(res.status);
  const q = (await res.json()).quotes?.find((x) => x.symbol);
  return q ? { symbol: q.symbol, name: q.longname || q.shortname || q.symbol } : null;
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
           currency: m.currency, closes, time: m.regularMarketTime, period: m.currentTradingPeriod };
}

async function fetchAll(symbols) {
  const { cache = {} } = await chrome.storage.local.get("cache");
  const now = Date.now();
  const out = {};
  await pool(symbols, 6, async (s) => { // begrenzt parallel, sonst drosselt Yahoo bei langen Listen
    if (cache[s] && cache[s].q?.period && now - cache[s].t < CACHE_MS) { out[s] = cache[s].q; return; }
    try { const q = await fetchQuote(s); out[s] = q; cache[s] = { t: now, q }; }
    catch { out[s] = cache[s]?.q || null; }
  });
  await chrome.storage.local.set({ cache });
  return out;
}

function sparkline(values, up) {
  if (!values || values.length < 2) return "";
  const w = 60, h = 20, min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / span) * (h - 2) - 1}`).join(" ");
  const color = up ? "var(--up)" : "var(--down)";
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.3"/></svg>`;
}

function marketStatus(q) {
  const now = Date.now() / 1000, p = q.period;
  const inP = (x) => x && now >= x.start && now < x.end;
  if (!p) return ["closed", "unbekannt"];
  if (inP(p.regular)) return ["open", "handelt"];
  if (inP(p.pre)) return ["pre", "vorbörslich"];
  if (inP(p.post)) return ["pre", "nachbörslich"];
  return ["closed", "geschlossen"];
}

function fmtTime(ts) {
  if (!ts) return "";
  const d = new Date(ts * 1000), now = new Date();
  const t = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === now.toDateString()) return t;
  return d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" }) + " " + t;
}

function fmtDateTime(ts) {
  if (!ts) return "unbekannt";
  const d = new Date(ts * 1000);
  return d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }) +
    ", " + d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr";
}

function rowHtml(name, q, pos) {
  name = esc(name);
  const posInfo = pos ? ` · ${posText(pos)}` : "";
  if (!q) return `<tr><td class="name" title="${pos ? posText(pos) : ""}"><span class="dot"></span>${name}</td><td class="spark"></td><td class="price err">n/v</td><td class="chg err">–</td></tr>`;
  const up = q.change >= 0, cls = up ? "up" : "down", sign = up ? "+" : "";
  const dec = q.price < 10 ? 4 : 2;
  const [st, stLabel] = marketStatus(q);
  return `<tr title="${fmt(q.change, dec)} ${q.currency || ""}">
    <td class="name" title="${stLabel} · Kurs vom ${fmtDateTime(q.time)}${posInfo}"><span class="dot ${st}"></span>${name}</td>
    <td class="spark">${sparkline(q.closes, up)}</td>
    <td class="price">${fmt(q.price, dec)}</td>
    <td class="chg ${cls}">${sign}${fmt(q.pct)} %</td></tr>`;
}

async function render(force = false) {
  if (force) await chrome.storage.local.remove("cache");
  const s = await getSettings();
  const positions = await getPositions();
  const groups = [];
  if (s.watch.length) groups.push({ group: "Meine Werte", items: s.watch });
  for (const g of MARKETS) {
    const items = g.items.filter(([sym]) => !s.hidden.includes(sym));
    if (items.length) groups.push({ group: g.group, items });
  }
  const symbols = groups.flatMap((g) => g.items.map((i) => i[0]));
  if (!symbols.length) { $("content").innerHTML = `<div class="empty">Keine Werte ausgewählt.</div>`; return; }
  $("updated").textContent = "lädt …";
  $("refresh").classList.add("spinning");
  const data = await fetchAll(symbols);
  $("refresh").classList.remove("spinning");
  $("content").innerHTML = groups.map((g) =>
    `<span class="caption">${g.group}</span><table>${g.items.map(([sym, name]) => rowHtml(name || sym, data[sym], positions[sym])).join("")}</table>`
  ).join("");
  $("updated").textContent = "Stand " + new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

async function renderEditor() {
  const s = await getSettings();
  const positions = await getPositions();
  $("marketList").innerHTML = MARKETS.map((g) => `<div class="mgroup"><div class="mhead">${g.group}</div>` +
    g.items.map(([sym, name]) => `<label class="mitem"><input type="checkbox" data-sym="${sym}" ${s.hidden.includes(sym) ? "" : "checked"}> ${name}</label>`).join("") +
    `</div>`).join("");
  $("watchList").innerHTML = s.watch.map(([sym, name], i) =>
    `<li><span>${esc(name)} <small>(${esc(sym)})</small>${positions[sym] ? `<br><small>${posText(positions[sym])}</small>` : ""}</span><button data-i="${i}" title="Entfernen">✕</button></li>`).join("");
}

let view = "content";
function showView(v) {
  view = v;
  $("content").hidden = v !== "content";
  $("editor").hidden = v !== "editor";
  $("info").hidden = v !== "info";
  $("toggleEdit").classList.toggle("active", v === "editor");
  $("toggleInfo").classList.toggle("active", v === "info");
}
$("version").textContent = "v" + chrome.runtime.getManifest().version;
document.querySelectorAll("[data-back]").forEach((b) => b.addEventListener("click", () => showView("content")));
$("refresh").addEventListener("click", () => { showView("content"); render(true); });
$("toggleEdit").addEventListener("click", () => { showView(view === "editor" ? "content" : "editor"); if (view === "editor") renderEditor(); });
$("toggleInfo").addEventListener("click", () => showView(view === "info" ? "content" : "info"));
$("addForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const raw = $("symbolInput").value.trim();
  if (!raw) return;
  const [sym, ...rest] = raw.split(/\s+/);
  const name = rest.join(" ");
  const symbol = sym.toUpperCase();
  try { await fetchQuote(symbol); } catch { alert(`Symbol "${symbol}" nicht gefunden.`); return; }
  const s = await getSettings();
  s.watch.push([symbol, name.trim() || symbol]);
  await saveSettings({ watch: s.watch });
  $("symbolInput").value = "";
  renderEditor(); render();
});
$("watchList").addEventListener("click", async (e) => {
  const i = e.target.dataset.i;
  if (i === undefined) return;
  const s = await getSettings();
  const [[sym]] = s.watch.splice(Number(i), 1);
  await saveSettings({ watch: s.watch });
  if (!s.watch.some(([x]) => x === sym)) {
    const positions = await getPositions();
    delete positions[sym];
    await chrome.storage.local.set({ positions });
  }
  renderEditor(); render();
});
$("importBtn").addEventListener("click", async () => {
  const status = $("importStatus"), btn = $("importBtn");
  const items = parseDepotList($("importText").value);
  if (!items.length) { status.textContent = "Keine Positionen erkannt. Pro Position wird eine gültige ISIN benötigt."; return; }
  btn.disabled = true;
  const results = new Array(items.length);
  let done = 0;
  await pool(items, 4, async (it, i) => {
    try { results[i] = await resolveIsin(it.isin); } catch { results[i] = null; }
    status.textContent = `Suche Symbole … ${++done}/${items.length}`;
  });
  const failed = items.filter((_, i) => !results[i]);
  try {
    const s = await getSettings(), positions = await getPositions();
    let added = 0;
    items.forEach((it, i) => {
      const r = results[i];
      if (!r) return;
      if (!s.watch.some(([sym]) => sym === r.symbol)) { s.watch.push([r.symbol, it.name || r.name]); added++; }
      positions[r.symbol] = { isin: it.isin, qty: it.qty, value: it.value };
    });
    await saveSettings({ watch: s.watch });
    await chrome.storage.local.set({ positions });
    status.textContent = `${items.length - failed.length} übernommen (${added} neu)` +
      (failed.length ? `, nicht gefunden: ${failed.map((f) => `${f.name || "?"} (${f.isin})`).join(", ")}` : "");
    if (!failed.length) $("importText").value = "";
  } catch (err) {
    status.textContent = "Speichern fehlgeschlagen (Chrome-Sync-Speicher voll?): " + err.message;
  }
  btn.disabled = false;
  renderEditor(); render();
});
$("marketList").addEventListener("change", async (e) => {
  const sym = e.target.dataset.sym;
  if (!sym) return;
  const s = await getSettings();
  const hidden = s.hidden.filter((x) => x !== sym);
  if (!e.target.checked) hidden.push(sym);
  await saveSettings({ hidden });
  render();
});

render();
