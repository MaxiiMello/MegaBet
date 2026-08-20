import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const navItems = [
  { to: '/',             icon: '🎰', label: 'Feed'      },
  { to: '/tribunal',     icon: '⚖️', label: 'Tribunal'  },
  { to: '/crear',        icon: '➕', label: 'Crear'     },
  { to: '/mis-apuestas', icon: '📋', label: 'Mis bets'  },
  { to: '/settings',     icon: '⚙️', label: 'Config'    },
];

export default function Navbar() {
  const user = useAuthStore((s) => s.user);

  return (
    <>
      {/* Top bar */}
      <header className="glass sticky top-0 z-40 px-4 py-3 flex items-center justify-between border-b border-brand-border">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎰</span>
          <span className="font-black text-lg tracking-tight text-text-primary">
            Mega<span style={{ color: 'var(--color-brand-green)' }}>Bet</span>
          </span>
        </div>
        {user && (
          <div className="flex items-center gap-3">
            {user.prestige_medals > 0 && (
              <span className="text-xs font-bold px-2 py-1 rounded-full"
                style={{ background: 'rgba(213,0,249,0.15)', color: 'var(--color-brand-purple)' }}>
                🏅 x{user.prestige_medals}
              </span>
            )}
            <div className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold"
              style={{ background: 'rgba(0,230,118,0.12)', color: 'var(--color-brand-green)' }}>
              🪙 {user.tokens?.toFixed(0)}
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
              style={{ background: 'var(--color-brand-card)', border: '2px solid var(--color-brand-border)' }}>
              {user.username?.[0]?.toUpperCase()}
            </div>
          </div>
        )}
      </header>

      {/* Bottom nav (mobile-first) */}
      <nav className="glass fixed bottom-0 left-0 right-0 z-40 border-t border-brand-border">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              id={`nav-${item.label.toLowerCase()}`}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all ${
                  isActive
                    ? 'text-brand-green scale-105'
                    : 'text-text-muted hover:text-text-primary'
                }`
              }
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span className="text-[10px] font-semibold">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
