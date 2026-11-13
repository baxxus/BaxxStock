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

async function resolveIsin(isin) {
  const res = await fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${isin}&quotesCount=5&newsCount=0&listsCount=0`);
  if (!res.ok) throw new Error(res.status);
  const q = (await res.json()).quotes?.find((x) => x.symbol);
  return q ? { symbol: q.symbol, name: q.longname || q.shortname || q.symbol } : null;
}

function sparkline(values, up, w = 60, h = 20) {
  if (!values || values.length < 2) return "";
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
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

// ── Meine Werte: Depot-Übersicht, zweizeilige Positionen, einklappbare Gruppen ──
const GROUPS = [["stocks", "Einzelaktien", ["EQUITY"]], ["etfs", "ETFs", ["ETF", "MUTUALFUND"]], ["other", "Sonstige", null]];
// [Schlüssel, Label, erste Richtung, braucht Positionen]; "today" = Veränderung in €, "pct" = Veränderung in %
const SORTS = [["name", "Name", "asc", false], ["value", "Wert", "desc", true], ["today", "Heute €", "desc", true], ["pct", "Heute %", "desc", false]];
const signed = (n, d = 2) => (n >= 0 ? "+" : "") + fmt(n, d);

// Eigene Werte nach Yahoo-instrumentType gruppieren (Anleihen kennt Yahoo nicht)
function splitByType(watch, data) {
  const known = GROUPS.flatMap(([, , types]) => types || []);
  return GROUPS.map(([key, group, types]) => ({ key, group,
    items: watch.filter(([sym]) => (types ? types.includes(data[sym]?.type) : !known.includes(data[sym]?.type))) }))
    .filter((g) => g.items.length);
}

// Sortierung innerhalb der Gruppen: "<name|value|today>-<asc|desc>" oder "" (Reihenfolge der Liste).
// metric(sym) liefert die Kennzahl; Werte ohne Kennzahl stehen immer am Ende.
const collator = new Intl.Collator("de", { sensitivity: "base", numeric: true });
function sortItems(items, sort, metric) {
  const [key, dir] = sort.split("-");
  if (!key) return items;
  const m = dir === "desc" ? -1 : 1, byName = (a, b) => collator.compare(a[1] || a[0], b[1] || b[0]);
  return [...items].sort((a, b) => {
    if (key === "name") return byName(a, b) * m;
    const va = metric(a[0]), vb = metric(b[0]);
    if (va == null || vb == null) return va == null && vb == null ? byName(a, b) : va == null ? 1 : -1;
    return (va - vb) * m || byName(a, b);
  });
}

function sortBarHtml(sort, hasValues) {
  const [key, dir] = sort.split("-");
  return `<div class="sortbar"><span>Sortieren</span><div class="seg">${SORTS.filter(([, , , needsPos]) => hasValues || !needsPos).map(([k, label, first]) => {
    const active = key === k, next = active ? (dir === "asc" ? "desc" : "asc") : first;
    return `<button type="button" data-sort="${k}" data-dir="${next}" aria-pressed="${active}" class="${active ? "active" : ""}" title="${label} ${next === "asc" ? "aufsteigend" : "absteigend"} sortieren">${label}${active ? (dir === "asc" ? " ↑" : " ↓") : ""}</button>`;
  }).join("")}</div></div>`;
}

function heroHtml(s, groups, animate) {
  if (!s) return "";
  const cls = s.dir > 0 ? "up" : s.dir < 0 ? "down" : "", arrow = s.dir > 0 ? "▲" : s.dir < 0 ? "▼" : "–";
  const parts = groups.filter((g) => g.now > 0).map((g) => ({ ...g, share: (g.now / s.now) * 100 }));
  const note = s.used < s.total ? `<div class="hero-note">${s.used} von ${s.total} Positionen berücksichtigt (Rest ohne Kurs oder Stückzahl)</div>` : "";
  return `<section class="hero">
    <div class="hero-top"><div><span class="caption">Depotwert · ${s.used} ${s.used === 1 ? "Position" : "Positionen"}</span>
      <div class="hero-value">${fmt(s.now)} <small>€</small></div></div>
      <div class="pill ${cls}" title="Veränderung gegenüber dem Vortagesschluss"><span aria-hidden="true">${arrow}</span> ${signed(s.pct)} %</div></div>
    <div class="hero-sub"><b class="${cls}">${signed(s.delta)} €</b> heute · Vortag ${fmt(s.prev)} €</div>
    <div class="alloc${animate ? " anim" : ""}" role="img" aria-label="Aufteilung: ${parts.map((g) => `${g.group} ${fmt(g.share, 0)} %`).join(", ")}">${parts.map((g) =>
      `<i data-g="${g.key}" style="width:${g.share}%"></i>`).join("")}</div>
    <div class="alloc-legend">${parts.map((g) => `<span data-g="${g.key}"><i></i>${g.group} ${fmt(g.share, 0)} %</span>`).join("")}</div>${note}</section>`;
}

// Zeile 1: Name + Hauptzahl (Positionswert, sonst Kurs). Zeile 2: Bestand/Status + Mini-Kurve + Tagesveränderung.
function posRowHtml(name, q, pos, row) {
  name = esc(name);
  if (!q) return `<div class="pos" title="${name}"><div class="p-l1"><span class="p-name"><span class="dot"></span>${name}</span><span class="p-val err">n/v</span></div>
    <div class="p-l2"><span class="p-meta">${pos ? posText(pos) : "kein Kurs verfügbar"}</span></div></div>`;
  const up = q.change >= 0, dec = q.price < 10 ? 4 : 2;
  const [st, stLabel] = marketStatus(q);
  const price = `${fmt(q.price, dec)} ${esc(q.currency || "")}`.trim();
  let val, meta, chg;
  if (row) {
    val = `${fmt(row.now)} €`;
    meta = row.flag ? `<span title="Stück × Kurs weicht stark vom importierten Wert ab – der importierte Wert wird verwendet">Wert laut Import ⚠</span>`
      : pos.qty != null ? `${pos.qty.toLocaleString("de-DE", { maximumFractionDigits: 4 })} Stk. · ${price}` : `Kurs ${price}`;
    chg = `${signed(row.delta)} €`;
  } else {
    val = price;
    meta = pos ? posText(pos) : [stLabel, fmtTime(q.time)].filter(Boolean).join(" · ");
    chg = signed(q.change, dec);
  }
  return `<div class="pos" title="${name}&#10;${stLabel} · Kurs vom ${fmtDateTime(q.time)}${pos ? ` · ${posText(pos)}` : ""}">
    <div class="p-l1"><span class="p-name"><span class="dot ${st}"></span>${name}</span><span class="p-val">${val}</span></div>
    <div class="p-l2"><span class="p-meta">${meta}</span>${sparkline(q.closes, up, 44, 14)}<span class="p-chg ${up ? "up" : "down"}"><span>${chg}</span><span class="p-pct">${signed(q.pct)} %</span></span></div></div>`;
}

function groupHtml(g, open, cells) {
  const sum = g.now > 0 ? `<span class="gsum">${fmt(g.now)} € <b class="${g.delta >= 0 ? "up" : "down"}">${signed(g.pct)} %</b></span>` : "";
  return `<section class="group" data-g="${g.key}">
    <button class="ghead" type="button" data-toggle="${g.key}" aria-expanded="${open}" title="${g.group} ein- oder ausklappen">
      <span class="chev" aria-hidden="true"></span><span class="gname">${g.group}</span><span class="gcount">${g.items.length}</span>${sum}</button>
    <div class="rows"${open ? "" : " hidden"}>${cells}</div></section>`;
}

// Letzte Abfrage merken: Sortieren und Einklappen zeichnen neu, ohne erneut zu laden
let last = null, painted = false;
async function paintWatch() {
  if (!last) return;
  const { watch, positions, data, summary, tabsHtml } = last;
  let { sort, collapsed } = await chrome.storage.local.get({ sort: "", collapsed: [] });
  const rows = Object.fromEntries((summary?.rows || []).map((r) => [r.sym, r]));
  let [key, dir] = sort.split("-");
  if (!summary && (key === "value" || key === "today")) { key = "pct"; sort = `pct-${dir}`; } // ohne Positionen nur Name/Prozent
  const metric = (sym) => (key === "value" ? rows[sym]?.now : key === "today" ? rows[sym]?.delta : data[sym]?.pct);
  const groups = splitByType(watch, data).map((g) => {
    const own = [...new Set(g.items.map(([sym]) => sym))].map((sym) => rows[sym]).filter(Boolean);
    const now = own.reduce((t, r) => t + r.now, 0), delta = own.reduce((t, r) => t + r.delta, 0);
    return { ...g, items: sortItems(g.items, sort, metric), now, delta, pct: now - delta ? (delta / (now - delta)) * 100 : 0 };
  });
  $("content").innerHTML = tabsHtml + heroHtml(summary, groups, !painted) + sortBarHtml(sort, !!summary) + groups.map((g) =>
    groupHtml(g, !collapsed.includes(g.key), g.items.map(([sym, name]) => posRowHtml(name || sym, data[sym], positions[sym], rows[sym])).join(""))).join("");
  painted = true;
}

async function render(force = false) {
  if (force) await chrome.storage.local.remove("cache");
  const s = await getSettings();
  const positions = await getPositions();
  // Eigene Werte und Standard-Werte getrennt in zwei Tabs (Tabs nur, wenn eigene Werte vorhanden)
  const { tab: saved } = await chrome.storage.local.get({ tab: "watch" });
  const tab = s.watch.length && saved !== "markets" ? "watch" : "markets";
  const tabsHtml = s.watch.length
    ? `<div class="tabs" role="tablist">${[["watch", "Meine Werte"], ["markets", "Märkte"]].map(([id, label]) =>
        `<button type="button" role="tab" data-tab="${id}" aria-selected="${tab === id}" class="${tab === id ? "active" : ""}">${label}</button>`).join("")}</div>`
    : "";
  const groups = [];
  if (tab === "watch") groups.push({ group: "", items: s.watch });
  else for (const g of MARKETS) {
    const items = g.items.filter(([sym]) => !s.hidden.includes(sym));
    if (items.length) groups.push({ group: g.group, items });
  }
  const symbols = groups.flatMap((g) => g.items.map((i) => i[0]));
  last = null;
  if (!symbols.length) { $("content").innerHTML = tabsHtml + `<div class="empty">Keine Werte ausgewählt.</div>`; $("updated").textContent = ""; return; }
  $("updated").textContent = "lädt …";
  $("refresh").classList.add("spinning");
  const data = await fetchAll(symbols);
  $("refresh").classList.remove("spinning");
  if (tab === "watch") {
    const summary = await loadSummary(s.watch, positions, data).catch(() => null);
    chrome.storage.local.set({ daySummary: summary });
    updateIcon(summary).catch(() => {});
    last = { watch: s.watch, positions, data, summary, tabsHtml };
    await paintWatch();
  } else {
    $("content").innerHTML = tabsHtml + groups.map((g) =>
      `<span class="caption">${g.group}</span><table>${g.items.map(([sym, name]) => rowHtml(name || sym, data[sym], positions[sym])).join("")}</table>`).join("");
  }
  $("updated").textContent = "Stand " + new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

// ── Einstellungen: Meine Werte (hinzufügen/bearbeiten), Import, Märkte ──
let settingsTab = "values", editing = null, filterText = "", confirmDel = null;
const ICON_EDIT = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4"/></svg>`;
const ICON_DEL = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 11v6M14 11v6M6.5 7l1 12h9l1-12M9.5 7V4.5h5V7"/></svg>`;
// Feld lesen: leer, ungültig oder Zahl (deutsche und englische Schreibweise, z. B. "1.234,56")
const parsedField = (el) => { const t = el.value.trim(); if (!t) return { empty: true }; const n = parseNumber(t); return n === null ? { bad: true } : { n }; };

function setMsg(text, kind = "") { const m = $("formMsg"); m.textContent = text; m.className = "form-msg" + (kind ? " " + kind : ""); }
function resetForm() {
  editing = null;
  $("addForm").reset();
  $("symbolInput").readOnly = false;
  $("formTitle").textContent = "Wert hinzufügen";
  $("addBtn").textContent = "Hinzufügen";
  $("cancelEdit").hidden = true;
  setMsg("");
}
function startEdit(sym, s, positions) {
  const entry = s.watch.find(([x]) => x === sym), p = positions[sym] || {};
  if (!entry) return;
  editing = sym;
  $("symbolInput").value = sym; $("symbolInput").readOnly = true;
  $("nameInput").value = entry[1] === sym ? "" : entry[1];
  $("qtyInput").value = p.qty != null ? String(p.qty).replace(".", ",") : "";
  $("valueInput").value = p.value != null ? p.value.toLocaleString("de-DE", { maximumFractionDigits: 2 }) : "";
  $("formTitle").textContent = `Bearbeiten: ${entry[1]}`;
  $("addBtn").textContent = "Speichern";
  $("cancelEdit").hidden = false;
  setMsg("");
  $("qtyInput").focus();
}

function switchSettingsTab(t) {
  settingsTab = t;
  document.querySelectorAll("#settingsTabs [data-stab]").forEach((b) => {
    const on = b.dataset.stab === t;
    b.classList.toggle("active", on); b.setAttribute("aria-selected", on);
  });
  for (const id of ["values", "import", "markets"]) $("pane-" + id).hidden = id !== t;
}

function watchListHtml(s, positions) {
  const q = filterText.trim().toLowerCase();
  const rows = s.watch.map((w, i) => [...w, i]).filter(([sym, name]) => !q || `${sym} ${name}`.toLowerCase().includes(q));
  if (!rows.length) return `<li class="empty-list">${s.watch.length ? "Kein Treffer." : "Noch keine eigenen Werte. Oben ein Symbol eintragen oder im Tab „Import“ ein Depot einfügen."}</li>`;
  return rows.map(([sym, name, i]) => {
    const p = positions[sym], del = confirmDel === sym;
    return `<li class="${editing === sym ? "editing" : ""}"><span class="w-main"><span class="w-name" title="${esc(name)}">${esc(name)}</span>
      <span class="w-sub">${esc(sym)} · ${p && (p.qty != null || p.value != null) ? posText(p) : `<span class="none">keine Position</span>`}</span></span>
      <span class="w-actions"><button type="button" data-edit="${esc(sym)}" title="Name, Stück und Wert bearbeiten" aria-label="${esc(name)} bearbeiten">${ICON_EDIT}</button>
      <button type="button" data-del="${esc(sym)}" class="${del ? "confirm" : ""}" title="${del ? "Zum Entfernen erneut klicken" : "Entfernen"}" aria-label="${esc(name)} entfernen">${del ? "Entfernen?" : ICON_DEL}</button></span></li>`;
  }).join("");
}

async function renderEditor() {
  const s = await getSettings();
  const positions = await getPositions();
  $("marketList").innerHTML = MARKETS.map((g) => `<div class="mgroup"><div class="mhead">${g.group}</div>` +
    g.items.map(([sym, name]) => `<label class="mitem"><input type="checkbox" data-sym="${sym}" ${s.hidden.includes(sym) ? "" : "checked"}> ${name}</label>`).join("") +
    `</div>`).join("");
  $("watchCount").textContent = s.watch.length || "";
  $("listCount").textContent = s.watch.length ? `· ${s.watch.length}` : "";
  $("watchFilter").hidden = s.watch.length <= 6;
  if (s.watch.length <= 6) filterText = "";
  $("watchList").innerHTML = watchListHtml(s, positions);
  switchSettingsTab(settingsTab);
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
$("content").addEventListener("click", async (e) => {
  const sortBtn = e.target.closest("[data-sort]");
  if (sortBtn) { // data-dir trägt die Richtung, die der Klick auslöst
    const k = sortBtn.dataset.sort;
    await chrome.storage.local.set({ sort: `${k}-${sortBtn.dataset.dir}` });
    await paintWatch();
    $("content").querySelector(`[data-sort="${k}"]`)?.focus();
    return;
  }
  const head = e.target.closest("[data-toggle]");
  if (head) {
    const open = head.getAttribute("aria-expanded") !== "true", key = head.dataset.toggle;
    head.setAttribute("aria-expanded", open);
    head.nextElementSibling.hidden = !open;
    const { collapsed } = await chrome.storage.local.get({ collapsed: [] });
    await chrome.storage.local.set({ collapsed: open ? collapsed.filter((x) => x !== key) : [...new Set([...collapsed, key])] });
    return;
  }
  const t = e.target.closest("[data-tab]")?.dataset.tab;
  if (!t) return;
  await chrome.storage.local.set({ tab: t });
  render();
});
$("refresh").addEventListener("click", () => { showView("content"); render(true); });
$("toggleEdit").addEventListener("click", () => { showView(view === "editor" ? "content" : "editor"); if (view === "editor") renderEditor(); });
$("toggleInfo").addEventListener("click", () => showView(view === "info" ? "content" : "info"));
$("settingsTabs").addEventListener("click", (e) => {
  const t = e.target.closest("[data-stab]")?.dataset.stab;
  if (t) switchSettingsTab(t);
});
$("cancelEdit").addEventListener("click", () => { resetForm(); renderEditor(); });
$("watchFilter").addEventListener("input", async (e) => {
  filterText = e.target.value;
  $("watchList").innerHTML = watchListHtml(await getSettings(), await getPositions());
});
$("addForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("addBtn");
  // Symbol, Name, Stück, Wert prüfen – Fehler stehen im Formular statt in einem Dialog
  let [sym, ...rest] = $("symbolInput").value.trim().split(/\s+/);
  const symbol = (sym || "").toUpperCase();
  const name = ($("nameInput").value.trim() || rest.join(" ")).trim();
  if (!symbol) { setMsg("Bitte ein Symbol eintragen.", "error"); $("symbolInput").focus(); return; }
  const qty = parsedField($("qtyInput")), value = parsedField($("valueInput"));
  if (qty.bad || (qty.n != null && qty.n <= 0)) { setMsg("Stück: bitte eine Zahl größer 0 eintragen, z. B. 10 oder 2,5.", "error"); $("qtyInput").focus(); return; }
  if (value.bad || (value.n != null && value.n < 0)) { setMsg("Wert: bitte einen Betrag in Euro eintragen, z. B. 1.234,56.", "error"); $("valueInput").focus(); return; }
  const s = await getSettings(), positions = await getPositions();
  const known = s.watch.findIndex(([x]) => x === symbol);
  if (editing === null && known < 0) {
    btn.disabled = true; setMsg("Prüfe Symbol …");
    try { await fetchQuote(symbol); } catch { btn.disabled = false; setMsg(`Symbol „${symbol}“ nicht gefunden. Tipp: Xetra-Werte enden auf .DE, z. B. SAP.DE.`, "error"); $("symbolInput").focus(); return; }
    btn.disabled = false;
  }
  let msg;
  if (known < 0) { s.watch.push([symbol, name || symbol]); msg = `${name || symbol} hinzugefügt.`; }
  else {
    if (name || editing !== null) s.watch[known][1] = name || symbol;
    msg = editing !== null ? `${s.watch[known][1]} gespeichert.` : `${symbol} war schon in der Liste – Angaben aktualisiert.`;
  }
  // Position: nur mit Angaben anlegen/ändern; beim Bearbeiten löschen leere Felder die Position (ISIN aus dem Import bleibt unberührt)
  if (qty.n != null || value.n != null) positions[symbol] = { ...positions[symbol], qty: qty.n ?? null, value: value.n ?? null };
  else if (editing !== null) delete positions[symbol];
  try {
    await saveSettings({ watch: s.watch });
    await chrome.storage.local.set({ positions });
  } catch (err) { setMsg("Speichern fehlgeschlagen (Chrome-Sync-Speicher voll?): " + err.message, "error"); return; }
  resetForm(); setMsg(msg, "ok");
  $("symbolInput").focus();
  renderEditor(); render();
});
$("watchList").addEventListener("click", async (e) => {
  const editBtn = e.target.closest("[data-edit]"), delBtn = e.target.closest("[data-del]");
  if (editBtn) { startEdit(editBtn.dataset.edit, await getSettings(), await getPositions()); renderEditor(); return; }
  if (!delBtn) return;
  const sym = delBtn.dataset.del;
  if (confirmDel !== sym) { // zweistufig: erster Klick fragt nach, zweiter entfernt
    confirmDel = sym;
    setTimeout(() => { if (confirmDel === sym) { confirmDel = null; renderEditor(); } }, 3000);
    renderEditor(); return;
  }
  confirmDel = null;
  const s = await getSettings();
  s.watch = s.watch.filter(([x]) => x !== sym);
  await saveSettings({ watch: s.watch });
  const positions = await getPositions();
  delete positions[sym];
  await chrome.storage.local.set({ positions });
  if (editing === sym) resetForm();
  setMsg("Entfernt.");
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
$("pane-markets").addEventListener("click", async (e) => {
  const all = e.target.closest("[data-all]")?.dataset.all;
  if (!all) return;
  await saveSettings({ hidden: all === "on" ? [] : MARKETS.flatMap((g) => g.items.map(([sym]) => sym)) });
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
