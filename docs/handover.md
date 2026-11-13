# Handover — BaxxStock
Stand: 2026-11-13

## Aktueller Stand
Chrome-Erweiterung (MV3) mit Märkte-Übersicht und eigener Watchlist im Popup, Version 1.10.2. Tagesentwicklung der eigenen Positionen gesamt (heute vs. Vortagesschluss) als Karte im Tab „Meine Werte“ mit „Details je Position“, dazu ein natives Chrome-Badge am Toolbar-Icon (grün ▲ / rot ▼, Tooltip mit %). Aktualisierung per Service Worker (`background.js`, Alarm alle 15 min); Logik in `core.js`. Branch `main`, 1.10.2 nicht committet.

## Zuletzt erledigt
- 1.10.2: gezeichneten Icon-Dot (OffscreenCanvas) durch `chrome.action.setBadgeText` ersetzt – gleiche Position/Größe wie bei anderen Erweiterungen (z. B. BaxxFeed); Titel des Icons zeigt die Veränderung in %
- Ursache des Gesamtwerts von ~10,9 Mio € geklärt: Anleihe „2,5 % NEDERLD 24/34“ – Nominal × Kurs in Prozent ergab rund das Hundertfache; die Plausibilitätsprüfung (Faktor 2 zum Importwert) fängt das jetzt ab (⚠)
- Geprüft: Service-Worker-Ablauf mit gemocktem `chrome.action` (Badge-Text, Farben, Titel, Reset)

## Offen
- [ ] In echtem Chrome prüfen: Badge-Darstellung, Alarm im Hintergrund, Drosselung durch 15-min-Abfragen
- [ ] Optional: Anleihen sauber rechnen (Nominal × Kurs / 100), statt auf den Importwert auszuweichen
- [ ] Import mit weiteren Depotansichten testen und Parser nachschärfen
- [ ] Screenshots in `docs/screenshots/` zeigen die Summary-Karte noch nicht

## Nächster Schritt
Erweiterung in Chrome neu laden und das Badge neben dem BaxxFeed-Badge vergleichen.
