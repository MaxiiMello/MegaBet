import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(username, password);
    if (result.ok) {
      toast.success('¡Bienvenido a MegaBet! 🎰');
      navigate('/');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--color-brand-bg)' }}>

      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'var(--color-brand-green)' }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'var(--color-brand-purple)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-5 blur-3xl"
          style={{ background: 'var(--color-brand-blue)' }} />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-7xl mb-4 animate-bounce">🎰</div>
          <h1 className="text-4xl font-black tracking-tight mb-1">
            Mega<span style={{ color: 'var(--color-brand-green)' }}>Bet</span>
          </h1>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
            Casa de Apuestas Entre Amigos 🤝
          </p>
        </div>

        {/* Card */}
        <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-widest"
              style={{ color: 'var(--color-text-muted)' }}>
              Usuario
            </label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="tu_username"
              required
              autoComplete="username"
              className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all"
              style={{
                background: 'var(--color-brand-card)',
                border: '1.5px solid var(--color-brand-border)',
                color: 'var(--color-text-primary)',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-brand-green)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--color-brand-border)'}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-widest"
              style={{ color: 'var(--color-text-muted)' }}>
              Contraseña
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all"
              style={{
                background: 'var(--color-brand-card)',
                border: '1.5px solid var(--color-brand-border)',
                color: 'var(--color-text-primary)',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-brand-green)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--color-brand-border)'}
            />
          </div>

          <button
            id="login-submit"
            type="submit"
            disabled={isLoading}
            className="w-full py-4 rounded-xl font-black text-base transition-all active:scale-95 disabled:opacity-50 mt-2"
            style={{ background: 'var(--color-brand-green)', color: '#000' }}
          >
            {isLoading ? '⏳ Entrando...' : '🎰 Entrar a jugar'}
          </button>

          <p className="text-center text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            No hay registro público. Solo amigos. 🔒
          </p>
        </form>
      </div>
    </div>
  );
}
