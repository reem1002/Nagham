import { Capacitor } from '@capacitor/core';
import { cacheGet, cacheSet } from '../lib/db.js';

const TOKEN_KEY = 'nagham.token';
const SERVER_KEY = 'nagham.server';

export const isNative = Capacitor.isNativePlatform();

/**
 * Where the API lives.
 *  - Web dev: '' (same origin, Vite proxies /api to :5000)
 *  - Android app: whatever the user saved in Settings, or VITE_API_URL at build time
 */
export function getServerUrl() {
  const saved = localStorage.getItem(SERVER_KEY);
  if (saved !== null) return saved.replace(/\/+$/, '');
  return (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
}

export function setServerUrl(url) {
  localStorage.setItem(SERVER_KEY, (url || '').trim().replace(/\/+$/, ''));
}

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export class ApiError extends Error {
  constructor(message, status, offline = false) {
    super(message);
    this.status = status;
    this.offline = offline;
  }
}

/** Absolute URL for a server path such as /media/covers/x.jpg */
export function mediaUrl(path) {
  if (!path) return '';
  if (/^(https?:|blob:|data:)/.test(path)) return path;
  return `${getServerUrl()}${path}`;
}

export function streamUrl(songId, { download = false } = {}) {
  const t = encodeURIComponent(getToken() || '');
  return `${getServerUrl()}/api/songs/${songId}/stream?token=${t}${download ? '&download=1' : ''}`;
}

let unauthorizedHandler = () => {};
export const onUnauthorized = (fn) => (unauthorizedHandler = fn);

export async function api(path, { method = 'GET', body, headers = {}, signal, raw = false } = {}) {
  const token = getToken();
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  let res;
  try {
    res = await fetch(`${getServerUrl()}/api${path}`, {
      method,
      signal,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new ApiError("Can't reach the server", 0, true);
  }
  if (raw) return res;
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) unauthorizedHandler();
  if (!res.ok) throw new ApiError(data.message || `Request failed (${res.status})`, res.status);
  return data;
}

/**
 * GET with an offline fallback: every successful response is stored in
 * IndexedDB, and served from there when the network is unavailable.
 * Returns { data, stale } so screens can show an "offline" hint.
 */
export async function cachedGet(path) {
  const key = `${getServerUrl()}|${path}`;
  try {
    const data = await api(path);
    cacheSet(key, data).catch(() => {});
    return { data, stale: false };
  } catch (e) {
    if (!e.offline && e.status !== 0) throw e;
    const cached = await cacheGet(key);
    if (cached !== undefined) return { data: cached, stale: true };
    throw e;
  }
}

/** Upload with progress (fetch can't report upload progress, XHR can). */
export function uploadWithProgress(path, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${getServerUrl()}/api${path}`);
    const token = getToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      let data = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new ApiError(data.message || `Upload failed (${xhr.status})`, xhr.status));
    };
    xhr.onerror = () => reject(new ApiError("Can't reach the server", 0, true));
    xhr.send(formData);
  });
}
