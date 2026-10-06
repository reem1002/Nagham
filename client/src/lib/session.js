import { api, getToken, setToken, onUnauthorized, getServerUrl } from '../api/client.js';
import { createStore } from './store.js';

const GUEST_KEY = 'nagham.guest';
const USER_KEY = 'nagham.user';

/** status: 'loading' | 'signedOut' | 'account' | 'guest' */
export const sessionStore = createStore({ status: 'loading', user: null });

export const isAccount = () => sessionStore.get().status === 'account';
export const isGuest = () => sessionStore.get().status === 'guest';

export async function initSession() {
  onUnauthorized(() => signOut());
  if (localStorage.getItem(GUEST_KEY) === '1') {
    sessionStore.set({ status: 'guest', user: { name: 'Guest' } });
    return;
  }
  if (!getToken()) {
    sessionStore.set({ status: 'signedOut', user: null });
    return;
  }
  // Optimistic: use the cached user so the app opens instantly (and offline)
  const cached = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  sessionStore.set({ status: 'account', user: cached });
  try {
    const { user } = await api('/auth/me');
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    sessionStore.set({ status: 'account', user });
  } catch (e) {
    if (!e.offline && e.status === 401) signOut();
  }
}

function setAccount({ token, user }) {
  setToken(token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.removeItem(GUEST_KEY);
  sessionStore.set({ status: 'account', user });
}

export async function login(email, password) {
  setAccount(await api('/auth/login', { method: 'POST', body: { email, password } }));
}

export async function register(name, email, password) {
  setAccount(await api('/auth/register', { method: 'POST', body: { name, email, password } }));
}

export function continueAsGuest() {
  localStorage.setItem(GUEST_KEY, '1');
  sessionStore.set({ status: 'guest', user: { name: 'Guest' } });
}

export function signOut() {
  setToken(null);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(GUEST_KEY);
  sessionStore.set({ status: 'signedOut', user: null });
}

export const serverLabel = () => getServerUrl() || window.location.origin;
