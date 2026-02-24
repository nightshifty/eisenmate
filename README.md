# Eisenmate

**[English](#english) | [Deutsch](#deutsch)**

> **[Live Demo: nightshifty.github.io/EisenMate](https://nightshifty.github.io/EisenMate/)**

---

## English

Pomodoro timer with an integrated todo list. Runs entirely in the browser -- no backend, no login required. All data is stored locally in the browser (localStorage).

### Features

- Pomodoro timer with adjustable duration
- Todo list with time estimation and time tracking
- Select a task and start the timer -- time is tracked automatically
- Session history: view completed pomodoros per day
- Audio signal and browser notification when the timer ends
- Responsive UI built with shadcn/ui

### Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- localStorage for persistence
- GitHub Pages for hosting

### Run locally

```bash
git clone https://github.com/nightshifty/eisenmate.git
cd eisenmate
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

### Build

```bash
npm run build
```

Output goes to `dist/` and can be served by any static web server.

### Deployment

On every push to `main`, the app is automatically deployed to GitHub Pages via GitHub Actions.

---

## Deutsch

Pomodoro-Timer mit integrierter Todo-Liste. Laeuft komplett im Browser -- kein Backend, kein Login. Alle Daten werden lokal im Browser (localStorage) gespeichert.

### Features

- Pomodoro-Timer mit einstellbarer Dauer
- Todo-Liste mit Zeitschaetzung und Zeiterfassung
- Aufgabe auswaehlen und Timer starten -- die Zeit wird automatisch getrackt
- Session-Verlauf: abgeschlossene Pomodoros pro Tag einsehen
- Akustisches Signal und Browser-Notification bei Ablauf
- Responsive UI mit shadcn/ui

### Tech-Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- localStorage fuer Persistenz
- GitHub Pages fuer Hosting

### Lokal starten

```bash
git clone https://github.com/nightshifty/eisenmate.git
cd eisenmate
npm install
npm run dev
```

Die App laeuft dann unter `http://localhost:5173`.

### Build

```bash
npm run build
```

Der Output landet in `dist/` und kann von jedem statischen Webserver ausgeliefert werden.

### Deployment

Bei jedem Push auf `main` wird die App automatisch via GitHub Actions auf GitHub Pages deployt.
