# Handover — BaxxStock
Stand: 2026-11-13

## Aktueller Stand
Chrome-Erweiterung (MV3) mit Märkte-Übersicht und eigener Watchlist im Popup, Version 1.10.1. Neu: Tagesentwicklung der eigenen Positionen gesamt (heute vs. Vortagesschluss) als Karte im Tab „Meine Werte“ und als Dot am Toolbar-Icon (grün ▲ / rot ▼). Der Dot wird per Service Worker (`background.js`, Alarm alle 15 min) aktualisiert; Logik in `core.js`. Branch `main`. 1.10.1 (nicht committet): Plausibilitätsprüfung und Detailliste, weil bei echten Daten ein unplausibler Gesamtwert (~10,9 Mio €) erschien.

## Zuletzt erledigt
- Fix 1.10.1: Stück × Kurs weicht um mehr als Faktor 2 vom importierten Wert ab → importierter Wert wird verwendet (Position mit ⚠ markiert); doppelte Symbole zählen nur einmal; „Details je Position“ (Top 15 nach |Δ|) in der Summary-Karte; Icon-Dot größer (Radius 38 %)
- `core.js` neu: `fetchQuote`/`fetchAll`/`pool` aus `popup.js` verschoben, dazu `computeSummary` (qty × Kurs, Fremdwährung via Yahoo `<CUR>EUR=X`, GBp → GBP; nur Wert → Wert als aktuell, Vortag über Tages-%), `updateIcon` (OffscreenCanvas)
- `background.js` neu, Manifest: Permission `alarms`, Service Worker, Version 1.10.1
- Popup: Summary-Karte (Δ €, Δ %, Gesamtwert, Vortagesschluss, „x von y Positionen“), Info-Text, README
- Geprüft: `computeSummary` in Node (EUR/USD/GBp/nur Wert/fehlende Daten), Popup im Browser mit gemocktem Chrome/Yahoo, Icon-Rendering 16/32 px, Service-Worker-Ablauf mit Mock

## Offen
- [ ] Ursache des unplausiblen Gesamtwerts mit echten Daten klären: Details je Position öffnen, ⚠-Positionen ansehen (vermutlich falsches Symbol/Nominal bei Anleihen/Fonds oder falsche Stückzahl aus dem Import)
- [ ] In echtem Chrome (entpackte Erweiterung) prüfen: Dot am Icon, Alarm im Hintergrund, echte Yahoo-FX-Kurse, Drosselung durch 15-min-Abfragen
- [ ] Import mit echten Depotansichten der Bank(en) testen und Parser nachschärfen
- [ ] Sync-Limit bei sehr langen Listen prüfen
- [ ] Screenshots in `docs/screenshots/` zeigen die neue Summary-Karte noch nicht

## Nächster Schritt
Erweiterung in Chrome neu laden (neue Permission `alarms` bestätigen) und prüfen, ob der Dot am Icon erscheint.
