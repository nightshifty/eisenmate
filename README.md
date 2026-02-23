# Eisenmate

Pomodoro-Timer mit integrierter Todo-Liste. Läuft komplett im Browser — kein Backend, kein Login. Alle Daten werden lokal im Browser (localStorage) gespeichert.

## Features

- Pomodoro-Timer mit einstellbarer Dauer
- Todo-Liste mit Zeitschätzung und Zeiterfassung
- Aufgabe auswählen und Timer starten — die Zeit wird automatisch getrackt
- Session-Verlauf: abgeschlossene Pomodoros pro Tag einsehen
- Akustisches Signal und Browser-Notification bei Ablauf
- Responsive UI mit shadcn/ui

## Tech-Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- localStorage für Persistenz
- GitHub Pages für Hosting

## Lokal starten

```bash
# Repository klonen
git clone https://github.com/<user>/eisenmate.git
cd eisenmate

# Dependencies installieren
npm install

# Dev-Server starten
npm run dev
```

Die App läuft dann unter `http://localhost:5173`.

## Build

```bash
npm run build
```

Der Output landet in `dist/` und kann von jedem statischen Webserver ausgeliefert werden.

## Deployment

Bei jedem Push auf `main` wird die App automatisch via GitHub Actions auf GitHub Pages deployt.
