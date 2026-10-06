import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles/global.css';
import './styles/chrome.css';
import './styles/pages.css';
import { initSession, sessionStore } from './lib/session.js';
import { initDownloads, downloadsStore } from './lib/downloads.js';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { initPlayer, primeRestoredSong } from './player/engine.js';
import { loadFavorites } from './lib/favorites.js';
import { flushOutbox } from './lib/outbox.js';
import { isNative } from './lib/native.js';

async function boot() {
  initPlayer();
  await Promise.all([
    initDownloads().catch((e) => {
      console.error('Offline storage unavailable', e);
      downloadsStore.set((s) => ({ ...s, ready: true }));
    }),
    initSession(),
  ]);
  primeRestoredSong();
  loadFavorites();
  flushOutbox();
  window.addEventListener('online', () => {
    flushOutbox();
    loadFavorites();
  });
  sessionStore.subscribe(() => {
    if (sessionStore.get().status === 'account') {
      loadFavorites();
      flushOutbox();
    }
  });

  if (isNative) {
    import('@capacitor/status-bar')
      .then(({ StatusBar, Style }) => {
        StatusBar.setStyle({ style: Style.Dark });
        StatusBar.setBackgroundColor({ color: '#111316' });
      })
      .catch(() => {});
  } else if ('serviceWorker' in navigator && import.meta.env.PROD) {
    navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('SW registration failed', e));
  }
}

boot().catch((e) => console.error('Startup failed', e));

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
