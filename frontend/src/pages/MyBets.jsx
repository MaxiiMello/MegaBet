import { useState, useEffect } from 'react';
import { api } from '../store/authStore';
import { useAuthStore } from '../store/authStore';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';

function PNLBadge({ pnl, status }) {
  if (status === 'pending') return <span className="text-xs font-bold text-text-muted">⏳ Pendiente</span>;
  if (status === 'refunded') return <span className="text-xs font-bold" style={{ color: 'var(--color-brand-blue)' }}>↩️ Reintegrado</span>;
  const isWin = pnl > 0;
  return (
    <span className="text-xs font-black" style={{ color: isWin ? 'var(--color-brand-green)' : 'var(--color-brand-red)' }}>
      {isWin ? '+' : ''}{pnl?.toFixed(2)} 🪙
    </span>
  );
}

// ── Mis Apuestas Creadas ────────────────────────────────
function CreatedBets() {
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState({ open: false, betId: null, optionId: null, optionLabel: '' });
  const [resolving, setResolving] = useState(false);
  const refreshUser = useAuthStore((s) => s.refreshUser);

  const fetchCreated = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/my-bets/created');
      setBets(data.bets);
    } catch { toast.error('Error cargando tus apuestas'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCreated(); }, []);

  const handleResolve = async () => {
    setResolving(true);
    try {
      const { data } = await api.post(`/bets/${confirm.betId}/resolve`, { winning_option_id: confirm.optionId });
      toast.success(data.message);
      await refreshUser();
      fetchCreated();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al resolver');
    } finally {
      setResolving(false);
      setConfirm({ open: false, betId: null, optionId: null, optionLabel: '' });
    }
  };

  if (loading) return <div className="text-center py-10 text-text-muted text-sm">Cargando...</div>;
  if (bets.length === 0) return (
    <div className="text-center py-16">
      <div className="text-5xl mb-4">🎯</div>
      <p className="font-bold text-text-muted">No creaste apuestas todavía.</p>
    </div>
  );

  return (
    <>
      <div className="flex flex-col gap-4">
        {bets.map((bet) => (
          <div key={bet.id} className="glass rounded-2xl p-4"
            style={{ border: '1px solid var(--color-brand-border)' }}>
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-black text-text-primary text-sm flex-1 pr-2">{bet.title}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0"
                style={{
                  background: bet.status === 'open' ? 'rgba(0,230,118,0.12)' : 'rgba(120,120,160,0.12)',
                  color: bet.status === 'open' ? 'var(--color-brand-green)' : 'var(--color-text-muted)',
                }}>
                {bet.status === 'open' ? '🟢 Abierta' : bet.status === 'resolved' ? '✅ Resuelta' : bet.status === 'annulled' ? '🚫 Anulada' : '🔒 Cerrada'}
              </span>
            </div>

            <div className="flex gap-3 text-xs text-text-muted mb-3">
              <span>👥 {bet.total_players ?? 0} jugadores</span>
              <span>🪙 {bet.total_pool ?? 0} tokens en juego</span>
            </div>

            {/* Opciones */}
            <div className="flex flex-col gap-2 mb-3">
              {bet.options.map((opt) => (
                <div key={opt.id} className="flex items-center justify-between p-2 rounded-lg"
                  style={{ background: 'var(--color-brand-card)' }}>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: opt.color === 'green' ? 'var(--color-brand-green)' : opt.color === 'red' ? 'var(--color-brand-red)' : 'var(--color-brand-blue)' }} />
                    <span className="text-xs font-semibold text-text-primary">{opt.label}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-text-muted">🪙 {opt.total_wagered}</span>
                    <span className="font-bold" style={{ color: 'var(--color-brand-green)' }}>{opt.current_odds?.toFixed(2)}x</span>
                    {bet.status === 'open' && (
                      <button
                        id={`resolve-btn-${bet.id}-${opt.id}`}
                        onClick={() => setConfirm({ open: true, betId: bet.id, optionId: opt.id, optionLabel: opt.label })}
                        className="px-2 py-1 rounded-lg text-[10px] font-black transition-all active:scale-95"
                        style={{ background: 'rgba(0,230,118,0.15)', color: 'var(--color-brand-green)', border: '1px solid var(--color-brand-green)' }}>
                        👑 Ganó
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-text-muted">
              Creada: {new Date(bet.created_at).toLocaleDateString('es-AR')}
              {bet.resolved_at && ` · Resuelta: ${new Date(bet.resolved_at).toLocaleDateString('es-AR')}`}
            </p>
          </div>
        ))}
      </div>

      <ConfirmModal
        isOpen={confirm.open}
        onCancel={() => setConfirm({ open: false, betId: null, optionId: null, optionLabel: '' })}
        onConfirm={handleResolve}
        isLoading={resolving}
        title={`¿Declarar ganador a "${confirm.optionLabel}"?`}
        message="Se repartirán los tokens a los ganadores. Esta acción es irreversible."
        confirmText="👑 Declarar ganador"
        emoji="🏆"
      />
    </>
  );
}

// ── Historial de apuestas jugadas ───────────────────────
function BetHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/my-bets/history')
      .then(({ data }) => setHistory(data.history))
      .catch(() => toast.error('Error cargando historial'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-10 text-text-muted text-sm">Cargando...</div>;
  if (history.length === 0) return (
    <div className="text-center py-16">
      <div className="text-5xl mb-4">📋</div>
      <p className="font-bold text-text-muted">No jugaste ninguna apuesta todavía.</p>
    </div>
  );

  const totalPnl = history.reduce((s, h) => s + (h.pnl ?? 0), 0);

  return (
    <div>
      {/* Resumen PNL */}
      <div className="p-4 rounded-2xl mb-4 flex items-center justify-between"
        style={{ background: 'var(--color-brand-card)', border: '1px solid var(--color-brand-border)' }}>
        <span className="text-sm font-bold text-text-muted">PNL Total</span>
        <span className="text-xl font-black" style={{ color: totalPnl >= 0 ? 'var(--color-brand-green)' : 'var(--color-brand-red)' }}>
          {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)} 🪙
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {history.map((h) => (
          <div key={h.id} className="glass rounded-xl p-4"
            style={{ border: '1px solid var(--color-brand-border)' }}>
            <div className="flex justify-between items-start mb-1">
              <span className="text-sm font-bold text-text-primary flex-1 pr-2">{h.bet_title}</span>
              <PNLBadge pnl={h.pnl} status={h.status} />
            </div>
            <div className="flex gap-3 text-xs text-text-muted mt-1 flex-wrap">
              <span style={{ color: h.option_color === 'green' ? 'var(--color-brand-green)' : h.option_color === 'red' ? 'var(--color-brand-red)' : 'var(--color-brand-blue)' }}>
                ● {h.option_label}
              </span>
              <span>🪙 Apostado: {h.amount}</span>
              <span>Cuota: {h.locked_odds}x</span>
              <span>Potencial: {h.potential_win}</span>
            </div>
            <p className="text-[10px] text-text-muted mt-1">{new Date(h.placed_at).toLocaleDateString('es-AR')}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Página principal ────────────────────────────────────
export default function MyBets() {
  const [tab, setTab] = useState('created');

  return (
    <div className="max-w-lg mx-auto px-4 pt-4">
      <h1 className="text-2xl font-black text-text-primary mb-4">📋 Mis Apuestas</h1>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: 'var(--color-brand-card)' }}>
        {[
          { key: 'created', label: '🎯 Mis creaciones' },
          { key: 'history', label: '📊 Mi historial' },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            id={`tab-${t.key}`}
            className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all"
            style={{
              background: tab === t.key ? 'var(--color-brand-surface)' : 'transparent',
              color: tab === t.key ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              border: tab === t.key ? '1px solid var(--color-brand-border)' : '1px solid transparent',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'created' ? <CreatedBets /> : <BetHistory />}
    </div>
  );
}
