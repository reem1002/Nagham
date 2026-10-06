import { createStore, useStore } from '../lib/store.js';

const toastStore = createStore([]);
let id = 0;

export function toast(message, { action, onAction, duration = 2800 } = {}) {
  const t = { id: ++id, message, action, onAction };
  toastStore.set((list) => [...list.slice(-2), t]);
  setTimeout(() => toastStore.set((list) => list.filter((x) => x.id !== t.id)), duration);
}

export function Toaster() {
  const list = useStore(toastStore);
  return (
    <div className="toaster" role="status" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className="toast" dir="auto">
          <span>{t.message}</span>
          {t.action && (
            <button className="toast-action" onClick={t.onAction}>
              {t.action}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
