# Handover — BaxxStock
Stand: 2026-11-13

## Aktueller Stand
Chrome-Erweiterung (MV3) mit Märkte-Übersicht und eigener Watchlist im Popup, Version 1.13.0. Tab „Meine Werte“ neu gestaltet: Depot-Übersicht (Wert, Tagesveränderung, Aufteilung), zweizeilige Positionszeilen, einklappbare Gruppen mit Summen, Sortierung Name/Wert/Heute €/Heute %. Icon-Badge (▲/▼) per Service Worker alle 15 min. Branch `main`, 1.13.0 nicht committet.

## Zuletzt erledigt
- Summary-Karte samt „Details je Position“ durch Depot-Übersicht ersetzt; Positionswert und Tagesveränderung (€, %) stehen jetzt direkt in jeder Zeile (`posRowHtml`)
- Gruppen (`GROUPS` in `popup.js`) einklappbar, Zustand in `chrome.storage.local` (`collapsed`); Gruppenzeile zeigt Summe und Tages-%
- Sortierung: „Heute €“ (Δ € je Position) und „Heute %“ (Kursveränderung in %); ohne Positionen nur Name und „Heute %“, eine gespeicherte €-/Wert-Sortierung fällt dann auf % zurück. Sortieren/Einklappen zeichnet aus dem gemerkten Stand (`last`) neu, ohne Kurse neu zu laden
- Märkte-Tab unverändert (Tabellen, `rowHtml`)
- Geprüft im Browser mit gemocktem Chrome/Yahoo (17 Werte: EUR/USD/GBp, ⚠-Anleihe, ohne Bestand, ohne Kurs): Darstellung bei 380 px, alle Sortierungen, Einklappen, Ansicht ohne Positionen

## Offen
- [ ] In echtem Chrome mit echtem Depot prüfen: neue Ansicht, Badge, Alarm im Hintergrund
- [ ] Optional: Anleihen sauber rechnen (Nominal × Kurs / 100), statt auf den Importwert auszuweichen
- [ ] Import mit weiteren Depotansichten testen und Parser nachschärfen
- [ ] Screenshots in `docs/screenshots/` zeigen noch die alte Ansicht

## Nächster Schritt
Erweiterung in Chrome neu laden und den Tab „Meine Werte“ mit dem echten Depot durchsehen.
