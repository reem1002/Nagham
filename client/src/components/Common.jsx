import { useNavigate } from 'react-router-dom';
import { IconBack, IconOffline } from './Icons.jsx';
import { useOnline } from '../lib/hooks.js';

export function BackBar({ title, right }) {
  const navigate = useNavigate();
  return (
    <div className="topbar">
      <button className="icon-btn ringed" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/library'))} aria-label="Back">
        <IconBack />
      </button>
      {title && <div className="truncate" style={{ fontWeight: 600 }} dir="auto">{title}</div>}
      <div className="spacer" />
      {right}
    </div>
  );
}

export function OfflineBanner({ stale }) {
  const online = useOnline();
  if (online && !stale) return null;
  return (
    <div className="banner offline">
      <IconOffline size={18} />
      <span>{online ? "Can't reach your server — showing saved copy." : "You're offline — downloaded songs still play."}</span>
    </div>
  );
}

export function Loading() {
  return (
    <div className="center-spin">
      <div className="spinner" />
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="empty">
      <div className="ico"><IconOffline /></div>
      <h3>Couldn't load this</h3>
      <p>{error?.message || 'Something went wrong.'}</p>
      {onRetry && <button className="btn btn-ghost" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function Empty({ icon, title, text, children }) {
  return (
    <div className="empty">
      {icon && <div className="ico">{icon}</div>}
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {children}
    </div>
  );
}
