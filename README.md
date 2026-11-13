<div align="center">

<img src="icons/icon128.png" alt="BaxxStock Logo" width="72">

# BaxxStock

**Börsenkurse und Depot-Tagesentwicklung im Chrome-Popup – ein Klick, alles Wichtige auf einen Blick.**

[![Version](https://img.shields.io/github/manifest-json/v/baxxus/BaxxStock?color=4ce0cc&label=Version)](manifest.json)
![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-f59a57)
[![Lizenz](https://img.shields.io/github/license/baxxus/BaxxStock?color=9caab4&label=Lizenz)](LICENSE)

<br>

<img src="docs/screenshots/meine-werte.png" alt="BaxxStock: Meine Werte mit Depot-Übersicht" width="330" valign="top">
&nbsp;&nbsp;
<img src="docs/screenshots/maerkte.png" alt="BaxxStock: Märkte" width="330" valign="top">

<sub>Echte Yahoo-Kurse vom 13.11.2026, 22 Uhr · das Depot links ist ein Demo-Depot</sub>

</div>

## Inhalt

[Funktionen](#funktionen) · [Installation](#installation) · [Bedienung](#bedienung) · [So wird gerechnet](#so-wird-gerechnet) · [Datenschutz](#datenschutz) · [Grenzen](#grenzen) · [Entwicklung](#entwicklung) · [Lizenz](#lizenz)

## Was ist BaxxStock?

BaxxStock ist eine schlanke Chrome-Erweiterung. Ein Klick auf das Icon zeigt Indizes, Devisen, Rohstoffe und dein eigenes Depot – mit Kurs, Tagesveränderung und Mini-Kurve. Ein Badge am Icon verrät schon vorher, ob dein Depot heute im Plus oder Minus liegt.

Ohne Konto, ohne API-Key, ohne Tracking, ohne eigenen Server.

## Funktionen

**Meine Werte**
- **Depot-Übersicht:** Gesamtwert, Veränderung zum Vortagesschluss in € und % sowie Aufteilung nach Einzelaktien, ETFs und Sonstige
- **Je Position:** Wert, Bestand, Kurs, Mini-Kurve und heutige Veränderung in € und %
- **Gruppen** (Einzelaktien, ETFs, Sonstige) einklappbar, die Gruppensumme bleibt sichtbar
- **Sortierung** nach Name, Wert, Veränderung in € oder in %, jeweils auf- und absteigend
- **Einzelne Positionen** manuell anlegen: Symbol, optional Name, Stück und Wert; später per Stift-Symbol bearbeitbar
- **Depot-Import:** Ansicht der Bank in die Textarea einfügen – die Symbole werden über die ISIN gefunden
- **Icon-Badge:** grün ▲ im Plus, rot ▼ im Minus; der Tooltip nennt die Veränderung in % (Update im Hintergrund alle 15 Minuten)

**Märkte**
- Indizes: DAX, MDAX, TecDAX, SDAX, Euro Stoxx 50, Dow Jones, S&P 500, Nasdaq 100, Nikkei 225, Hang Seng
- Devisen & Rohstoffe: EUR/USD, Gold, Silber, Brent, Bitcoin
- Jeden Standard-Wert einzeln ein- und ausblendbar

**Allgemein**
- Statuspunkt je Wert: handelt, vor-/nachbörslich oder geschlossen (der Hover zeigt Datum und Uhrzeit des Kurses)
- Dark Mode, Info-Bereich mit Erklärungen
- Watchlist und Einstellungen über Chrome Sync, Bestände und Sortierung nur lokal

## Installation

Die Erweiterung ist (noch) nicht im Chrome Web Store und wird als entpackte Erweiterung geladen. Voraussetzung ist ein Chromium-Browser mit Manifest V3 (Chrome, Edge, Brave …).

1. Repository klonen oder als ZIP herunterladen und entpacken
   ```bash
   git clone https://github.com/baxxus/BaxxStock.git
   ```
2. In Chrome `chrome://extensions` öffnen und oben rechts den **Entwicklermodus** aktivieren
3. **Entpackte Erweiterung laden** wählen und den Projektordner auswählen
4. Das Icon über das Puzzle-Symbol in der Toolbar anheften

**Aktualisieren:** Repository mit `git pull` aktualisieren und die Erweiterung in `chrome://extensions` über das Neu-laden-Symbol neu laden. Bei neuen Berechtigungen fragt Chrome einmal nach.

## Bedienung

| Aktion | So geht's |
|---|---|
| Kurse neu laden | Pfeil-Symbol oben rechts (sonst 1 Minute Zwischenspeicher) |
| Wert hinzufügen | Zahnrad → „Meine Werte“ → Symbol, optional Name, Stück und Wert (in €) eintragen |
| Wert bearbeiten / entfernen | Zahnrad → „Meine Werte“ → Stift (ändern) oder Papierkorb (entfernen, zweiter Klick bestätigt) |
| Depot importieren | Zahnrad → „Import“ → Text einfügen → Importieren |
| Eigene Werte sortieren | „Name“, „Wert“, „Heute €“ oder „Heute %“ über der Liste; erneuter Klick dreht die Richtung |
| Gruppe ein-/ausklappen | Klick auf die Gruppenzeile (z. B. „Einzelaktien“) |
| Märkte ausblenden | Zahnrad → „Märkte“ → Haken entfernen (oder „alle“ / „keine“) |
| Erklärungen lesen | Info-Symbol oben rechts |

**Symbol-Schreibweise bei Yahoo:** Xetra `.DE` (`SAP.DE`), US-Aktien ohne Endung (`AAPL`), Amsterdam `.AS`, Futures `=F`, Devisen `=X`. Symbole findest du auf [finance.yahoo.com](https://finance.yahoo.com).

### Depot-Import

Unterstützt werden zwei Formate:

- **Freitext** aus der Depotansicht der Bank: je Position die Reihenfolge Name, ISIN, Stück, Wert
- **Tabelle** mit den Spalten `Name`, `ISIN`, `Stück/Nominal`, `Wert`, getrennt durch Tab oder Semikolon, z. B.
  ```
  SAP SE;DE0007164600;10;1.234,56
  ```

Erkannt werden Positionen anhand der ISIN (mit Prüfziffer). Mehrfach vorkommende ISINs werden aufsummiert. ISINs, zu denen Yahoo kein Symbol findet, meldet der Import und übernimmt sie nicht; Werte ohne Kurs stehen mit „n/v“ in der Liste.

## So wird gerechnet

Die Depot-Übersicht vergleicht den Wert deiner Positionen heute mit dem Vortagesschluss (derselbe Bezug wie die Prozentangabe je Wert):

- **Mit Stückzahl:** Stück × Kurs. Fremdwährungen werden mit dem aktuellen Yahoo-Wechselkurs in Euro umgerechnet, Pence-Kurse (`GBp`) als Pfund.
- **Plausibilitätsprüfung:** Weicht „Stück × Kurs“ um mehr als den Faktor 2 vom importierten Wert ab (z. B. bei Anleihen, die in Prozent notieren), gilt der importierte Wert; die Position ist mit ⚠ markiert.
- **Nur mit Wert:** Der Wert gilt als aktuell, der Vortag ergibt sich aus der Tagesveränderung des Kurses.
- **Ohne Kurs oder Bestand:** Die Position wird nicht mitgerechnet; die Übersicht nennt dann „x von y Positionen“.

Bei geschlossener Börse ist es die Veränderung des letzten Handelstages. Es handelt sich um eine Näherung ohne Gebühren, Steuern oder Kauf-/Verkaufspreise – keine Performance-Rechnung.

## Datenschutz

- Es gibt keinen eigenen Server – Popup und Hintergrund-Prozess sprechen direkt mit Yahoo Finance
- Dorthin gehen nur Symbole (Kursabfrage) und beim Import die ISINs (Symbolsuche) – **nie Stückzahlen oder Werte**
- Stückzahlen und Werte deiner Positionen sowie Sortierung und Tabauswahl bleiben **lokal im Browser** und werden nicht über Chrome Sync geteilt
- Die Watchlist selbst (Symbole und Namen) liegt in Chrome Sync

| Berechtigung | Wofür |
|---|---|
| `storage` | Watchlist, Einstellungen, Positionen, Zwischenspeicher |
| `alarms` | Aktualisierung des Icon-Badges im Hintergrund alle 15 Minuten |
| `query1`/`query2.finance.yahoo.com` | Kursabfragen und ISIN-Suche |

## Grenzen

- Yahoo Finance ist eine **inoffizielle Schnittstelle** ohne Zusicherung; sie kann sich ändern oder bei vielen Abfragen drosseln. Kurse können je nach Börse rund 15 Minuten verzögert sein.
- Anleihen und manche Fonds liefert Yahoo nicht oder mit unpassenden Einheiten; sie stehen unter „Sonstige“.
- Das Icon-Badge wird beim Start von Chrome, alle 15 Minuten und beim Öffnen des Popups aktualisiert – bei geschlossenem Chrome gibt es keine Aktualisierung.
- **Keine Anlageberatung.**

## Entwicklung

Es gibt keinen Build-Schritt und keine Abhängigkeiten – Dateien ändern, in `chrome://extensions` neu laden, fertig.

| Datei | Aufgabe |
|---|---|
| `manifest.json` | Chrome-Manifest (V3) |
| `popup.html` / `popup.css` | Oberfläche des Popups |
| `popup.js` | Darstellung, Sortierung, Einstellungen |
| `core.js` | Kursabruf, Tagesentwicklung, Icon-Badge (gemeinsam für Popup und Service Worker) |
| `background.js` | Service Worker: aktualisiert das Icon-Badge im Hintergrund |
| `import.js` | Parser für den Listen-Import (läuft auch unter Node: `require("./import.js").parseDepotList`) |
| `docs/` | Screenshots für dieses README und `handover.md` mit dem aktuellen Projektstand |

## Lizenz

Apache License 2.0, siehe [LICENSE](LICENSE).
