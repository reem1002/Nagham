import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useStore } from './store.js';
import { downloadsStore } from './downloads.js';
import { favoritesStore } from './favorites.js';
import { sessionStore } from './session.js';
import { playerStore, timeStore } from '../player/engine.js';

export const usePlayer = (sel) => useStore(playerStore, sel);
export const useTime = (sel) => useStore(timeStore, sel);
export const useSession = () => useStore(sessionStore);
export const useDownloadState = (id) => useStore(downloadsStore, (s) => s.items[id]);
export const useDownloadsReady = () => useStore(downloadsStore, (s) => s.ready);
export const useDownloadItems = () => useStore(downloadsStore, (s) => s.items);
export const useIsFavorite = (id) => useStore(favoritesStore, (s) => s.has(id));
export const useCurrentSong = () => usePlayer((s) => s.queue[s.index] || null);

export function useOnline() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener('online', cb);
      window.addEventListener('offline', cb);
      return () => {
        window.removeEventListener('online', cb);
        window.removeEventListener('offline', cb);
      };
    },
    () => navigator.onLine
  );
}

/** Runs an async loader and re-runs it when deps change or reload() is called. */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fnRef
      .current()
      .then((data) => alive && setState({ loading: false, data, error: null }))
      .catch((error) => alive && setState({ loading: false, data: null, error }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}

/** Re-render subscribers when library content changes (import, delete, edit). */
const libraryListeners = new Set();
export function notifyLibraryChanged() {
  libraryListeners.forEach((l) => l());
}
export function useLibraryVersion() {
  const [v, setV] = useState(0);
  useEffect(() => {
    const l = () => setV((x) => x + 1);
    libraryListeners.add(l);
    return () => libraryListeners.delete(l);
  }, []);
  return v;
}

export const useFavoritesCount = () => useStore(favoritesStore, (s) => s.size);
