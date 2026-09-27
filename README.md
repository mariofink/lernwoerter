# Lernwörter-Kiste

Web-App für Eltern: Lernwörter der Grundschule pflegen und im Alltag zufällig abfragen.
Das Kind schreibt das vorgelesene Wort auf Papier, die Eltern vergleichen und markieren „Richtig“ oder „Noch üben“.
Wörter, die noch nicht sitzen, kommen häufiger dran.

Live: https://mariofink.github.io/lernwoerter/

- Läuft komplett im Browser, ohne Server und ohne Anmeldung.
- Die Wörter und Übungszähler liegen nur auf dem jeweiligen Gerät (localStorage).
- Austausch zwischen Geräten: „Liste teilen“ verschickt die Wörter als Nachricht, „Liste empfangen“ übernimmt sie.
- Auf dem iPhone in Safari über Teilen → „Zum Home-Bildschirm“ installieren. Danach funktioniert die App auch offline.

## Aufbau

Kein Build-Schritt: der Browser lädt die ES-Module direkt, GitHub Pages liefert den Ordner aus, wie er ist.

Die Ansichten sind Funktionen `(state, actions) => html\`…\``. Eine Aktion in `main.js`ändert den Zustand und ruft`update()` auf,
lit-html aktualisiert dann nur die geänderten Stellen im DOM. Die Ansichten ändern den Zustand nie selbst.

| Datei                | Aufgabe                                                                        |
| -------------------- | ------------------------------------------------------------------------------ |
| `index.html`         | Gerüst der Seite                                                               |
| `css/tokens.css`     | Farben, Schriften, Dunkelmodus                                                 |
| `css/base.css`       | Grundlayout, Tabs, Buttons, Felder                                             |
| `css/components.css` | Übungskarte, Wortliste, Dialoge                                                |
| `js/main.js`         | App-Zustand, Aktionen, Start                                                   |
| `js/model.js`        | Lernwort-Objekt, Listen-Helfer                                                 |
| `js/store.js`        | Speichern auf dem Gerät                                                        |
| `js/picker.js`       | Gewichtete Zufallsauswahl                                                      |
| `js/exchange.js`     | Nachrichtenformat zum Teilen und Empfangen                                     |
| `js/lineatur.js`     | Wort in Schulausgangsschrift (Playwrite DE SAS) auf Grundschul-Linien zeichnen |
| `js/ui.js`           | Toast, Kopieren, kleine Helfer                                                 |
| `js/views/*.js`      | Ansichten: Üben, Wörter, Dialoge                                               |
| `sw.js`              | Offline-Unterstützung (Service Worker)                                         |

## Entwickeln

```bash
npm start   # lokaler Server auf http://localhost:8765
npm test    # Tests (Node 22+, keine Abhängigkeiten)
```

Die Tests laufen bei jedem Push auch als GitHub Action.

## Update veröffentlichen

1. Neue Dateien in `sw.js` unter `APP_FILES` eintragen (die Tests prüfen das).
2. In `sw.js` die `VERSION` erhöhen, sonst laden installierte Apps die neue Fassung nicht.
   Die App zeigt diese Version unten im Tab „Wörter“ an; eine geöffnete App meldet das Update mit „Neu laden“.
3. Committen und auf `main` pushen. GitHub Pages ist nach etwa einer Minute aktuell.

Das Nachrichtenformat in `js/exchange.js` nur abwärtskompatibel ändern: bereits verschickte Nachrichten müssen lesbar bleiben.
