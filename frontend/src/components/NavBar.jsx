import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const tabs = [
  { to: '/', label: 'Inicio', icon: '🏠' },
  { to: '/partidos', label: 'Partidos', icon: '⚽' },
  { to: '/mis-picks', label: 'Mis picks', icon: '📋' },
  { to: '/grupos', label: 'Grupos', icon: '🏟️' },
  { to: '/tabla', label: 'Tabla', icon: '🏆' },
];

export default function NavBar() {
  const { user } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 safe-area-inset-bottom z-40">
      <div className="flex">
        {tabs.map(t => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 pt-3 text-xs font-semibold transition-colors ${
                isActive ? 'text-wc-green' : 'text-gray-400'
              }`
            }
          >
            <span className="text-xl mb-0.5">{t.icon}</span>
            {t.label}
          </NavLink>
        ))}
        {user?.role === 'admin' && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 pt-3 text-xs font-semibold transition-colors ${
                isActive ? 'text-wc-green' : 'text-gray-400'
              }`
            }
          >
            <span className="text-xl mb-0.5">⚙️</span>
            Admin
          </NavLink>
        )}
      </div>
    </nav>
  );
}
