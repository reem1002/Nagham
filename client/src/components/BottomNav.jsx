import { NavLink } from 'react-router-dom';
import { IconHome, IconSearch, IconLibrary, IconImport, IconSettings } from './Icons.jsx';

const TABS = [
  { to: '/', label: 'Home', icon: IconHome, end: true },
  { to: '/search', label: 'Search', icon: IconSearch },
  { to: '/library', label: 'Library', icon: IconLibrary },
  { to: '/import', label: 'Import', icon: IconImport },
  { to: '/settings', label: 'Settings', icon: IconSettings },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main">
      {TABS.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
          <Icon size={22} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
