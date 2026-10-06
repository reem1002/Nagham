import { Capacitor } from '@capacitor/core';
import { MediaSession as NativeMediaSession } from '@jofr/capacitor-media-session';

export const isNative = Capacitor.isNativePlatform();
const web = typeof navigator !== 'undefined' && 'mediaSession' in navigator ? navigator.mediaSession : null;

/**
 * One API for lock-screen / notification controls.
 * Android app -> @jofr/capacitor-media-session (also starts a foreground
 * service so Android doesn't freeze playback when the screen is off).
 * Browser / installed PWA -> the standard Media Session API.
 */
export const mediaSession = {
  async setMetadata(meta) {
    try {
      if (isNative) await NativeMediaSession.setMetadata(meta);
      else if (web) web.metadata = new window.MediaMetadata(meta);
    } catch (e) {
      console.warn('mediaSession.setMetadata', e);
    }
  },
  async setPlaybackState(playbackState) {
    try {
      if (isNative) await NativeMediaSession.setPlaybackState({ playbackState });
      else if (web) web.playbackState = playbackState;
    } catch {
      /* ignore */
    }
  },
  async setActionHandler(action, handler) {
    try {
      if (isNative) await NativeMediaSession.setActionHandler({ action }, handler);
      else web?.setActionHandler(action, handler);
    } catch {
      /* action not supported on this platform */
    }
  },
  async setPositionState(state) {
    try {
      if (!Number.isFinite(state.duration) || state.duration <= 0) return;
      const s = { ...state, position: Math.min(state.position, state.duration) };
      if (isNative) await NativeMediaSession.setPositionState(s);
      else web?.setPositionState?.(s);
    } catch {
      /* ignore */
    }
  },
};

/** Native artwork must be an http(s) or data: URL – blob: URLs live only inside the WebView. */
const artCache = new Map();
export async function artworkFor(url) {
  if (!url) return [];
  if (!isNative || !url.startsWith('blob:')) return [{ src: url, sizes: '512x512' }];
  if (!artCache.has(url)) {
    const blob = await fetch(url).then((r) => r.blob());
    const dataUrl = await new Promise((res) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.readAsDataURL(blob);
    });
    artCache.set(url, dataUrl);
  }
  return [{ src: artCache.get(url), sizes: '512x512' }];
}

/**
 * Files shared to the Android app from WhatsApp / Files / Telegram…
 * Returns File objects ready to import, or [] if the app wasn't opened via Share.
 */
export async function takeNativeSharedFiles() {
  if (!isNative) return [];
  try {
    const { SendIntent } = await import('send-intent');
    const { Filesystem } = await import('@capacitor/filesystem');
    const result = await SendIntent.checkSendIntentReceived();
    if (!result?.url) return [];
    const items = [result, ...(result.additionalItems || [])];
    const files = [];
    for (const item of items) {
      if (!item.url || (item.type && !item.type.startsWith('audio') && item.type !== 'application/octet-stream')) continue;
      const path = decodeURIComponent(item.url);
      const { data } = await Filesystem.readFile({ path });
      const bin = atob(data);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const name = decodeURIComponent(item.title || path.split('/').pop() || 'shared-audio');
      files.push(new File([bytes], name, { type: item.type || 'audio/mpeg' }));
    }
    SendIntent.finish?.();
    return files;
  } catch (e) {
    console.warn('share intent', e);
    return [];
  }
}
