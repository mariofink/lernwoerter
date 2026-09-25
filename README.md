# Lernwörter-Kiste

Web-App für Eltern: Lernwörter der Grundschule pflegen und im Alltag zufällig abfragen.
Das Kind schreibt das vorgelesene Wort auf Papier, die Eltern vergleichen und markieren „Richtig“ oder „Noch üben“.
Wörter, die noch nicht sitzen, kommen häufiger dran.

- Läuft komplett im Browser, ohne Server und ohne Anmeldung.
- Die Wörter liegen nur auf dem jeweiligen Gerät (localStorage).
- Austausch zwischen Geräten: „Liste teilen“ verschickt die Wörter als Nachricht, „Liste empfangen“ übernimmt sie.
- Auf dem iPhone in Safari über Teilen → „Zum Home-Bildschirm“ installieren. Danach funktioniert die App auch offline.

## Update veröffentlichen

Nach Änderungen in `sw.js` die `VERSION` erhöhen, dann committen und pushen.
