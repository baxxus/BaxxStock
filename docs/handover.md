# Handover — BaxxStock
Stand: 2026-11-13

## Aktueller Stand
Chrome-Erweiterung (MV3) mit Märkte-Übersicht und eigener Watchlist im Popup, Version 1.15.0. Tab „Meine Werte“ neu gestaltet: Depot-Übersicht (Wert, Tagesveränderung, Aufteilung), zweizeilige Positionszeilen, einklappbare Gruppen mit Summen, Sortierung Name/Wert/Heute €/Heute %. Icon-Badge (▲/▼) per Service Worker alle 15 min. Einstellungen neu gestaltet (Tabs „Meine Werte“ / „Import“ / „Märkte“), manuelles Hinzufügen und Bearbeiten mit Stück und Wert. Beim Hinzufügen sucht das Namensfeld per Autocomplete bei Yahoo und trägt das Symbol ein. Branch `main`, 1.15.0 nicht committet.

## Zuletzt erledigt
- Autocomplete im Namensfeld (`searchSymbols`, `ac*` in `popup.js`): ab 2 Zeichen, 250 ms Entprellung, Abbruch veralteter Anfragen, Ergebnisse je Suchbegriff gecacht; Dropdown mit Name, Symbol, Börse, Typ und „in Liste“-Marke, Futures am Ende; Maus oder ↑/↓/Enter/Esc, ARIA-Combobox; Auswahl füllt Symbol und Name und springt zu „Stück“; beim Bearbeiten keine Suche; Fehler/keine Treffer als Hinweiszeile
- Anfrage: `v1/finance/search` mit `lang=de-DE&region=DE` (deutsche Börsen zuerst); angezeigt wird `longname` (Yahoos `shortname` ist abgeschnitten/gepolstert)
- Geprüft im Browser mit gemocktem Chrome und echten Yahoo-Suchantworten: Tippen, Pfeiltasten + Enter, Maus, Escape, Blur, leere Treffer, Fehler (429), Entprellung, Hinzufügen mit Stück; Race zwischen Blur-Timer und neuer Suche gefunden und behoben
- Einstellungen in drei Tabs aufgeteilt (`#settingsTabs`, `switchSettingsTab`): Meine Werte (Formular + Liste), Import (mit einklappbarer Format-Hilfe), Märkte (mit „alle/keine“)
- Formular mit Symbol, Name, Stück, Wert in €; Fehler stehen inline (`setMsg`), kein `alert` mehr; Zahlen über `parseNumber` aus `import.js` (deutsch/englisch); vorhandenes Symbol aktualisiert die Position statt Duplikat
- Bearbeiten über Stift (lädt das Formular, leere Felder löschen die Position, ISIN aus dem Import bleibt), Entfernen zweistufig (Bestätigung verfällt nach 3 s), Filter ab 7 Werten
- Geprüft im Browser mit gemocktem Chrome und echten Yahoo-Daten: Fehlerfälle, Hinzufügen, Bearbeiten, Abbrechen, Entfernen, Filter, Markt-Schalter, Import-Fehlerpfad (ISIN-Suche selbst nicht gemockt)
- README überarbeitet: Inhaltsverzeichnis, dynamische Badges (Version aus `manifest.json`, Lizenz), Abschnitte „So wird gerechnet“, „Grenzen“, „Entwicklung“, Berechtigungstabelle, Update-Hinweis
- Screenshots `docs/screenshots/meine-werte.png` und `maerkte.png` neu: echte Yahoo-Kurse vom 13.11.2026, 22 Uhr, per headless Chrome mit gemocktem Chrome-API; Depot links ist ein Demo-Depot (7 Positionen), keine echten Bestände
- Summary-Karte samt „Details je Position“ durch Depot-Übersicht ersetzt; Positionswert und Tagesveränderung (€, %) stehen jetzt direkt in jeder Zeile (`posRowHtml`)
- Gruppen (`GROUPS` in `popup.js`) einklappbar, Zustand in `chrome.storage.local` (`collapsed`); Gruppenzeile zeigt Summe und Tages-%
- Sortierung: „Heute €“ (Δ € je Position) und „Heute %“ (Kursveränderung in %); ohne Positionen nur Name und „Heute %“, eine gespeicherte €-/Wert-Sortierung fällt dann auf % zurück. Sortieren/Einklappen zeichnet aus dem gemerkten Stand (`last`) neu, ohne Kurse neu zu laden
- Märkte-Tab unverändert (Tabellen, `rowHtml`)
- Geprüft im Browser mit gemocktem Chrome/Yahoo (17 Werte: EUR/USD/GBp, ⚠-Anleihe, ohne Bestand, ohne Kurs): Darstellung bei 380 px, alle Sortierungen, Einklappen, Ansicht ohne Positionen

## Offen
- [ ] In echtem Chrome mit echtem Depot prüfen: neue Ansicht, Einstellungen, Autocomplete, Badge, Alarm im Hintergrund
- [ ] Optional: Anleihen sauber rechnen (Nominal × Kurs / 100), statt auf den Importwert auszuweichen
- [ ] Import mit weiteren Depotansichten testen und Parser nachschärfen
- [ ] GitHub-Repo-Beschreibung ist abgeschnitten („… auf die Märkte:“) – in den Repo-Einstellungen vervollständigen
- [ ] Screenshots bei größeren UI-Änderungen neu erzeugen (README zeigt die Einstellungen nicht)

## Nächster Schritt
Erweiterung in Chrome neu laden und den Tab „Meine Werte“ mit dem echten Depot durchsehen.
