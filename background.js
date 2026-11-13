// BaxxStock – Service Worker: hält das Badge am Toolbar-Icon aktuell (Tagesentwicklung der eigenen Werte)
importScripts("core.js");

const ALARM = "icon-refresh";

async function refresh() {
  try {
    const { watch } = await chrome.storage.sync.get({ watch: [] });
    const { positions = {} } = await chrome.storage.local.get("positions");
    const syms = watch.map(([s]) => s).filter((s) => positions[s]);
    if (!syms.length) { await chrome.storage.local.remove("daySummary"); await updateIcon(null); return; }
    const quotes = await fetchAll(syms);
    const summary = await loadSummary(watch, positions, quotes);
    await chrome.storage.local.set({ daySummary: summary });
    await updateIcon(summary);
  } catch { /* offline o. Ä.: Icon bleibt wie es ist, nächster Alarm versucht es erneut */ }
}

function schedule() {
  chrome.alarms.create(ALARM, { periodInMinutes: 15 });
  refresh();
}

chrome.runtime.onInstalled.addListener(schedule);
chrome.runtime.onStartup.addListener(schedule);
chrome.alarms.onAlarm.addListener((a) => { if (a.name === ALARM) refresh(); });
chrome.storage.onChanged.addListener((changes, area) => {
  if ((area === "sync" && changes.watch) || (area === "local" && changes.positions)) refresh();
});
