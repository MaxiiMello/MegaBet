import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';

export default function Settings() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const handleLogout = () => {
    logout();
    toast('👋 Hasta luego, crack!', { icon: '🎰' });
    navigate('/login');
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-4">
      <h1 className="text-2xl font-black text-text-primary mb-6">⚙️ Configuración</h1>

      {/* Perfil */}
      <div className="glass rounded-2xl p-5 mb-4" style={{ border: '1px solid var(--color-brand-border)' }}>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black"
            style={{ background: 'var(--color-brand-card)', border: '2px solid var(--color-brand-border)' }}>
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-black text-text-primary">@{user?.username}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-bold" style={{ color: 'var(--color-brand-green)' }}>
                🪙 {user?.tokens?.toFixed(2)} tokens
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl text-center" style={{ background: 'var(--color-brand-card)' }}>
            <div className="text-2xl font-black" style={{ color: 'var(--color-brand-purple)' }}>
              🏅 {user?.prestige_medals ?? 0}
            </div>
            <div className="text-xs text-text-muted mt-1 font-semibold">Medallas de Prestigio</div>
          </div>
          <div className="p-3 rounded-xl text-center" style={{ background: 'var(--color-brand-card)' }}>
            <div className="text-2xl font-black" style={{ color: 'var(--color-brand-green)' }}>
              🪙 {user?.tokens?.toFixed(0)}
            </div>
            <div className="text-xs text-text-muted mt-1 font-semibold">Tokens actuales</div>
          </div>
        </div>

        {/* Barra de prestigio */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-text-muted font-semibold mb-1">
            <span>Progreso al próximo prestigio</span>
            <span>{user?.tokens?.toFixed(0)} / 3000</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-brand-card)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(((user?.tokens ?? 0) / 3000) * 100, 100)}%`,
                background: 'linear-gradient(to right, var(--color-brand-green), var(--color-brand-purple))',
              }} />
          </div>
          <p className="text-[10px] text-text-muted mt-1">
            Al llegar a 3000 tokens → reset a 100 + 🏅 medalla de prestigio
          </p>
        </div>
      </div>

      {/* Info de la app */}
      <div className="glass rounded-2xl p-5 mb-4" style={{ border: '1px solid var(--color-brand-border)' }}>
        <h3 className="text-sm font-black text-text-primary mb-3">📖 Reglas del juego</h3>
        <div className="flex flex-col gap-2 text-xs text-text-muted leading-relaxed">
          <p>🪙 Saldo inicial: <strong className="text-text-primary">100 tokens</strong></p>
          <p>🏅 Prestigio al llegar a <strong className="text-text-primary">3000 tokens</strong> → reset + medalla</p>
          <p>🎰 La banca es infinita. El creador no pierde tokens.</p>
          <p>🔒 Cuotas aseguradas al momento del clic.</p>
          <p>⚖️ Las apuestas trampa se llevan al Tribunal.</p>
          <p>🔐 Sin registro público. Solo amigos invitados.</p>
        </div>
      </div>

      {/* Logout */}
      <button
        id="logout-btn"
        onClick={() => setConfirmLogout(true)}
        className="w-full py-4 rounded-2xl font-black text-base transition-all active:scale-95"
        style={{ background: 'rgba(255,23,68,0.12)', color: 'var(--color-brand-red)', border: '1.5px solid var(--color-brand-red)' }}>
        🚪 Cerrar sesión
      </button>

      <p className="text-center text-xs text-text-muted mt-4">
        MegaBet v1.0 — Solo para uso recreativo privado 🎰
      </p>

      <ConfirmModal
        isOpen={confirmLogout}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={handleLogout}
        title="¿Cerrar sesión?"
        message="¿Seguro que te vas, crack? La casa siempre gana."
        confirmText="🚪 Sí, me voy"
        confirmColor="red"
        emoji="👋"
      />
    </div>
  );
}
