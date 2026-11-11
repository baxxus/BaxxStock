# Handover — BaxxStock
Stand: 2026-11-11

## Aktueller Stand
Chrome-Erweiterung (MV3) mit Märkte-Übersicht und eigener Watchlist im Popup, Version 1.9.0. Neu: Listen-Import per Textarea in den Einstellungen (`import.js` parst, `popup.js` löst ISINs über die Yahoo-Suche zu Symbolen auf). Popup zeigt eigene Werte und Standard-Werte getrennt in zwei Tabs. Branch `main`, Tabs noch nicht committet.

## Zuletzt erledigt
- Zwei Tabs „Meine Werte“ / „Märkte“ (nur bei vorhandenen eigenen Werten), gewählter Tab wird gemerkt, geladen wird nur der aktive Tab
- Listen-Import: Depot-Freitext (Name → ISIN → Stück → Wert) und Tabellen mit Tab/Semikolon
- Stück/Wert lokal in `chrome.storage.local` (`positions`), Anzeige in Einstellungen und als Tooltip am Namen
- Kursabfragen auf max. 6 parallel begrenzt, Namen werden HTML-escaped
- Parser mit Beispielen in Node geprüft, Import-Ablauf im Browser mit gemocktem Chrome/Yahoo-Search geprüft

## Offen
- [ ] Import mit echten Depotansichten der Bank(en) testen und Parser nachschärfen
- [ ] In echtem Chrome (entpackte Erweiterung) prüfen: echte Yahoo-ISIN-Suche, Sync-Limit bei sehr langen Listen
- [ ] Optional: Gesamtwert/Depotsumme im Popup anzeigen

## Nächster Schritt
Erweiterung in Chrome neu laden und mit einer echten Depotansicht importieren.
