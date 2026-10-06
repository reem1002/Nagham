import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createStore, useStore } from '../lib/store.js';

/** Bottom sheet rendered in a portal. */
export function Sheet({ open, onClose, children, title, tall = false }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className={`sheet ${tall ? 'tall' : ''}`} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        {title && <div className="sheet-title">{title}</div>}
        <div className="sheet-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export function SheetItem({ icon, children, onClick, danger, disabled, right }) {
  return (
    <button className={`sheet-item ${danger ? 'danger' : ''}`} onClick={onClick} disabled={disabled}>
      <span className="ico">{icon}</span>
      <span className="label">{children}</span>
      {right}
    </button>
  );
}

/** Global sheet host so any row can open "song actions" without prop drilling. */
export const sheetStore = createStore(null); // { type, props }
export const openSheet = (type, props = {}) => sheetStore.set({ type, props });
export const closeSheet = () => sheetStore.set(null);
export const useSheet = () => useStore(sheetStore);
