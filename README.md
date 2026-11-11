# BaxxStock

Chrome-Erweiterung für den schnellen Blick auf die Märkte: Ein Klick auf das Icon zeigt Indizes, Devisen, Rohstoffe und eigene Aktien als kompakte Übersicht im Popup.

## Funktionen

- DAX, MDAX, TecDAX, SDAX, Euro Stoxx 50, Dow Jones, S&P 500, Nasdaq 100, Nikkei, Hang Seng
- EUR/USD, Gold, Silber, Brent, Bitcoin
- Eigene Watchlist mit beliebigen Yahoo-Symbolen (z. B. `SAP.DE`, `AAPL`, `IWDA.AS`)
- Listen-Import per Textarea: Depotansicht der Bank einfügen oder Tabelle (Name, ISIN, Stück/Nominal, Wert; Tab oder Semikolon). Symbole werden über die ISIN gesucht, Stück und Wert bleiben lokal gespeichert
- Eigene Werte und Standard-Werte getrennt in zwei Tabs; eigene Werte gruppiert nach Einzelaktien, ETFs und Sonstige (Typ laut Yahoo)
- Standard-Werte einzeln ein- und ausblendbar
- Kurs, Tagesveränderung in % und Mini-Kursverlauf des Tages
- Statuspunkt pro Wert: handelt, vor-/nachbörslich oder geschlossen; Hover zeigt Datum und Uhrzeit des Kurses
- Info-Bereich mit Erklärungen, Dark Mode, Einstellungen per Chrome Sync

## Installation

1. Repository klonen oder als ZIP herunterladen
2. `chrome://extensions` öffnen und den **Entwicklermodus** aktivieren
3. **Entpackte Erweiterung laden** und den Projektordner wählen
4. Icon über das Puzzle-Symbol anheften

## Datenquelle

Kurse kommen von Yahoo Finance (inoffizielle Schnittstelle, kein API-Key nötig). Je nach Börse können sie rund 15 Minuten verzögert sein. Keine Anlageberatung.

## Lizenz

Apache License 2.0, siehe [LICENSE](LICENSE).
