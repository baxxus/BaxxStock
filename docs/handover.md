# Handover — BaxxStock
Stand: 2026-11-13

## Aktueller Stand
Chrome-Erweiterung (MV3) mit Märkte-Übersicht und eigener Watchlist im Popup, Version 1.11.0. Tagesentwicklung der eigenen Positionen als Karte im Tab „Meine Werte“ (mit „Details je Position“) und als natives Chrome-Badge am Icon (grün ▲ / rot ▼), Aktualisierung per Service Worker alle 15 min. Neu: Sortierung der eigenen Werte nach Name oder Positionswert, auf-/absteigend. Branch `main`, 1.11.0 nicht committet.

## Zuletzt erledigt
- Sortierleiste „Name“/„Wert“ über der Liste: erster Klick Name ↑ bzw. Wert ↓, erneuter Klick dreht die Richtung; sortiert innerhalb der Gruppen Einzelaktien/ETFs/Sonstige
- Gespeichert in `chrome.storage.local` (`sort`, z. B. `value-desc`); Wert = Positionswert in € aus `computeSummary`, Werte ohne Position immer am Ende
- Geprüft im Browser mit gemocktem Chrome/Yahoo: alle vier Richtungen, Speicherung, Tooltip-Texte

## Offen
- [ ] In echtem Chrome prüfen: Badge-Darstellung, Alarm im Hintergrund, Sortierung mit echtem Depot
- [ ] Optional: Anleihen sauber rechnen (Nominal × Kurs / 100), statt auf den Importwert auszuweichen
- [ ] Import mit weiteren Depotansichten testen und Parser nachschärfen
- [ ] Screenshots in `docs/screenshots/` zeigen Summary-Karte und Sortierleiste noch nicht

## Nächster Schritt
Erweiterung in Chrome neu laden und Sortierung sowie Badge mit dem echten Depot prüfen.
