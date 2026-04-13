import { NavLink } from 'react-router-dom';

const items = [
  { to: '/rns', label: 'RNs' },
  { to: '/', label: 'Map' },
  { to: '/patients', label: 'Patients' },
];

export default function BottomNav() {
  return (
    <nav
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        height: 'var(--bottom-nav-height)',
        background: 'var(--bg-elevated)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        zIndex: 20,
      }}
    >
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.to === '/'}
          style={({ isActive }) => ({
            flex: 1,
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
            color: isActive ? 'var(--primary)' : 'var(--text-muted)',
          })}
        >
          {it.label}
        </NavLink>
      ))}
    </nav>
  );
}
