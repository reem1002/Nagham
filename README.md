# نغم · Nagham

**An offline-first personal music player (MERN + Android).**

Nagham is a self-hosted music app. The library lives on a server (Node + Express + MongoDB), and the React client runs in the browser or as a native Android app through Capacitor. Downloaded songs play **without an internet connection**, and playback **continues with the screen locked**, with controls on the lock screen and in the notification shade.

> Nagham plays audio files you already own. It does not download from YouTube or any other platform.

---

## Table of contents

- [Features](#features)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Android app](#android-app)
- [Do I need the server?](#do-i-need-the-server)
- [Deploying online](#deploying-online)
- [API reference](#api-reference)
- [Technical notes](#technical-notes)
- [Roadmap](#roadmap)

---

## Features

| | |
|---|---|
| **Player** | Play/Pause · Previous/Next · Shuffle · Repeat (all / one) · Seek · Volume · Drag-to-reorder queue · Play next / Add to queue · Sleep timer · Lyrics |
| **Offline** | Download a song, album, artist, or full playlist to the device (IndexedDB) · The app opens and works without a connection · Stats and favorites are recorded offline and synced when the connection returns |
| **Lock screen** | Android: foreground service + media notification (`@jofr/capacitor-media-session`) · Browser/PWA: Media Session API |
| **Importing** | Pick files or a whole folder · Share from WhatsApp, Telegram, or Files directly into the app · Reads title, artist, album, cover art, and lyrics from tags · Without tags, filenames like `فيروز - نسم علينا الهوى.mp3` are split into artist and title automatically |
| **Fairuz** | A ready-made artist page; any file labeled Fairuz / فيروز / Fairouz / Fayrouz is grouped onto the same page |
| **Library** | Home · Search (Arabic and English; ignores أ/إ/آ, ة/ه, ى/ي, and diacritics) · Songs · Artists · Albums · Playlists · Favorites · On this device · Stats |
| **Accounts** | JWT auth, or **"Use on this device only"** with no account and no server at all |

---

## Project structure

```
nagham/
├── server/                 Node + Express + MongoDB API
│   └── src/
│       ├── models/         User, Artist, Album, Song, Playlist, PlayEvent
│       ├── routes/         auth, songs (upload + range streaming), artists, albums,
│       │                   playlists, me (favorites, history, stats, home), search
│       ├── utils/          importAudio (tags + covers + dedupe), text (Arabic search)
│       └── scripts/seed.js demo account + Fairuz page (+ demo tones with --demo)
├── client/                 React (Vite) + PWA + Capacitor
│   ├── src/
│   │   ├── player/engine.js     Playback engine (queue, shuffle, repeat, media session, position saving)
│   │   ├── lib/downloads.js     Download manager and offline library (IndexedDB)
│   │   ├── lib/data.js          Data layer: server → cache → offline
│   │   ├── lib/importer.js      Importing (upload to server or save on device)
│   │   ├── lib/native.js        Capacitor: lock screen + Share intent
│   │   ├── sw.js                Service worker (offline shell + share target)
│   │   └── pages/               All screens
│   └── android/                 Ready-to-open Android Studio project
├── .github/workflows/android-apk.yml   Builds the APK on GitHub automatically
└── docker-compose.yml                  Local MongoDB
```

---

## Getting started

**Requirements:** Node 20+ and MongoDB (local via Docker, or the free tier of MongoDB Atlas).

```bash
# 1) MongoDB
docker compose up -d            # or set an Atlas connection string in server/.env

# 2) Server
cd server
cp .env.example .env            # change JWT_SECRET
npm install
npm run seed:demo               # demo@nagham.app / nagham123 + Fairuz page + demo tones
npm run dev                     # http://localhost:5000

# 3) Client (in a second terminal)
cd client
npm install
npm run dev                     # http://localhost:5173
```

Open `http://localhost:5173`, log in, go to **Import**, and add audio files.

> `npm run seed` without `--demo` creates only the account and the Fairuz page, without the demo tones.

---

## Android app

### Option 1: Build with GitHub Actions (easiest)

1. Push the project to a GitHub repository.
2. Open the **Actions** tab → **Android APK** → **Run workflow**. The server URL can be entered in the `api_url` field, or left empty and set later from Settings in the app.
3. When the run finishes, download `nagham-debug-apk` from **Artifacts**, unzip it, and open `app-debug.apk` on the phone (Android will ask to allow installation from unknown sources).

### Option 2: Build with Android Studio

```bash
cd client
VITE_API_URL=https://your-api.example.com npm run android:sync   # optional: server URL
npx cap open android
```

In Android Studio, connect the phone over USB (Developer options → USB debugging) and press ▶ Run, or use **Build → Build APK(s)**.

### Option 3: Install as a PWA (no build)

If the server is reachable over HTTPS, open it in Chrome on the phone → ⋮ → **Install app**. The PWA appears in the Share menu, works offline, and keeps playing with the screen locked on most devices. The APK is more reliable for background playback.

---

## Do I need the server?

- **No**, if "Use on this device only" is selected. Songs are stored inside the app on the phone.
- **Yes**, if the library should belong to an account and be available on more than one device. The phone talks to the server only when importing and downloading; everything already downloaded plays without a connection.

Hosting options:

- **On a home laptop:** run the server, then in the app go to Settings → Server and enter `http://<LAPTOP-IP>:5000`. Both devices must be on the same Wi-Fi network.
- **Online:** see [Deploying online](#deploying-online).

---

## Deploying online

Deploying the server gives the same account and library on the laptop and the phone. The setup uses three free services:

| Service | Stores |
|---|---|
| **MongoDB Atlas** | Account data: songs, artists, playlists, favorites |
| **Cloudinary** | The audio files and cover art |
| **Render** | The server (Node/Express) |

Free Node hosts do not keep uploaded files across restarts, which is why audio files are stored on Cloudinary.

### 1. MongoDB Atlas

Create a free cluster and copy its connection string. Add `/nagham` before the `?` to select the database. Under **Network Access**, add `0.0.0.0/0`.

### 2. Cloudinary

Create an account at [cloudinary.com](https://cloudinary.com). From the Dashboard, copy the **API environment variable**, which starts with `cloudinary://`.

### 3. Test locally first

In `server/.env`:

```env
MONGO_URI=mongodb+srv://USER:PASS@cluster0.xxxx.mongodb.net/nagham?retryWrites=true&w=majority
STORAGE=cloudinary
CLOUDINARY_URL=cloudinary://xxxx:yyyy@your-cloud
```

Then run `npm run seed` followed by `npm run dev`, and import a song. If it plays, the configuration is correct.

### 4. Deploy to Render

Push the project to GitHub, then on [render.com](https://render.com) choose **New + → Blueprint** and select the repository. Render reads `render.yaml` and asks for `MONGO_URI` and `CLOUDINARY_URL`. After the deploy completes, the service gets a URL such as `https://nagham-api.onrender.com`.

### 5. Build the APK against the deployed server

In GitHub Actions, run **Android APK** and enter the Render URL in the `api_url` field. Alternatively, leave it empty and set the URL from Settings → Server inside the app.

### 6. Point the web client at the server

In `client/.env`, set `VITE_API_URL=https://nagham-api.onrender.com`, or change it from Settings → Server.

> **Note:** Render's free tier spins down after 15 minutes of inactivity, and the first request afterwards takes about a minute. This affects only importing and downloading. Songs already downloaded to the phone play at any time, even offline.

---

## API reference

All routes require `Authorization: Bearer <token>`, except auth and health.

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` · `/api/auth/login` | Sign up / log in |
| GET | `/api/auth/me` | Current user |
| GET | `/api/songs?q=&artist=&album=&sort=recent\|title\|plays` | List songs |
| POST | `/api/songs/upload` | Upload files (`files[]`, optional `artist`, `album`) |
| GET | `/api/songs/:id/stream` | Range streaming (`?download=1` for downloads) |
| PATCH / DELETE | `/api/songs/:id` | Edit metadata and lyrics / delete |
| GET | `/api/artists` · `/api/artists/:id` | Artists / artist page |
| GET | `/api/albums` · `/api/albums/:id` | Albums |
| CRUD | `/api/playlists` · `/api/playlists/:id/songs` | Playlists |
| GET/POST/DELETE | `/api/me/favorites/:songId` | Favorites |
| POST/GET | `/api/me/history` · `/api/me/recent` · `/api/me/stats` · `/api/me/home` | History and stats |
| GET | `/api/search?q=` | Search across everything |

---

## Technical notes

- **Background playback on Android:** The WebView freezes when the screen locks, so the plugin runs a `mediaPlayback` foreground service whenever something is playing. The required permissions are declared in `AndroidManifest.xml`.
- **Offline storage:** Each downloaded song is stored as a Blob in IndexedDB together with its cover. The app requests `navigator.storage.persist()` so the system does not evict the data. Every API response is cached, so screens open without a connection.
- **Share:** In the APK, sharing works through `send-intent`; in the PWA, through the Web Share Target in the service worker.
- **HTTP on a local network:** `capacitor.config.json` sets `androidScheme: "http"` and `cleartext: true` so the app can reach a server at `http://192.168.x.x`. Both can be removed if the server is HTTPS-only.
- **File storage on the server:** With local storage, files live in `server/uploads/audio` (the filename is the SHA-1 of the content, so duplicates are never stored twice) and `server/uploads/covers`. With `STORAGE=cloudinary`, files are stored on Cloudinary instead.

---

## Roadmap

- [ ] Synced lyrics (LRC) with auto-scroll
- [ ] Equalizer and crossfade
- [ ] S3-compatible storage backend
- [ ] iOS support (requires a Share Extension in Xcode for Share)
