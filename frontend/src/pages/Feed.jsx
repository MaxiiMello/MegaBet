import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../store/authStore';
import { useAuthStore } from '../store/authStore';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';


// ── Botón de opción con cuota ─────────────────────────────
function OddsButton({ option, onSelect, disabled }) {
  const colorStyles = {
    green: { bg: 'rgba(0,230,118,0.12)', border: 'var(--color-brand-green)', text: 'var(--color-brand-green)' },
    red:   { bg: 'rgba(255,23,68,0.12)',  border: 'var(--color-brand-red)',   text: 'var(--color-brand-red)' },
    blue:  { bg: 'rgba(41,121,255,0.12)', border: 'var(--color-brand-blue)',  text: 'var(--color-brand-blue)' },
  };
  const style = colorStyles[option.color] || colorStyles.green;

  return (
    <button
      id={`bet-option-${option.id}`}
      onClick={() => onSelect(option)}
      disabled={disabled}
      className="flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl font-bold transition-all active:scale-95 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ background: style.bg, border: `1.5px solid ${style.border}`, color: style.text }}
    >
      <span className="text-sm leading-tight text-center">{option.label}</span>
      <span className="text-xl font-black">{option.current_odds?.toFixed(2)}x</span>
    </button>
  );
}

// ── Modal para apostar ───────────────────────────────────
function PlaceBetModal({ isOpen, option, bet, onClose, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);

  const potentialWin = amount ? (parseFloat(amount) * option?.current_odds).toFixed(2) : '—';

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await api.post(`/bets/${bet.id}/place`, { option_id: option.id, amount: parseFloat(amount) });
      await refreshUser();
      toast.success(`🤑 Apostaste ${amount} tokens a "${option.label}"!`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al apostar');
    } finally {
      setLoading(false);
      setConfirm(false);
    }
  };

  if (!isOpen || !option) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998] flex items-end justify-center p-4 animate-backdrop"
        style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
        <div className="glass rounded-2xl p-6 w-full max-w-sm animate-modal-pop mb-16" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-lg font-black mb-1 text-text-primary">Apostar en "{option.label}"</h3>
          <p className="text-xs text-text-muted mb-4">{bet.title}</p>

          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-muted">Cuota actual (asegurada al confirmar)</span>
            <span className="font-black text-lg" style={{ color: 'var(--color-brand-green)' }}>
              {option.current_odds?.toFixed(2)}x
            </span>
          </div>

          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-text-muted">Tus tokens</span>
            <span className="font-bold text-sm">🪙 {user?.tokens?.toFixed(0)}</span>
          </div>

          <label className="block text-xs font-semibold mb-2 uppercase tracking-widest text-text-muted">
            ¿Cuántos tokens apostás?
          </label>
          <input
            id="bet-amount-input"
            type="number"
            min="1"
            max={user?.tokens}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Ej: 50"
            className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none mb-2"
            style={{
              background: 'var(--color-brand-card)',
              border: '1.5px solid var(--color-brand-border)',
              color: 'var(--color-text-primary)',
            }}
          />

          {/* Botones rápidos */}
          <div className="flex gap-2 mb-4">
            {[10, 25, 50, 100].map((q) => (
              <button key={q} onClick={() => setAmount(String(Math.min(q, user?.tokens || 0)))}
                className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
                style={{ background: 'var(--color-brand-card)', border: '1px solid var(--color-brand-border)', color: 'var(--color-text-muted)' }}>
                {q}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl mb-4"
            style={{ background: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.2)' }}>
            <span className="text-xs text-text-muted">Ganancia potencial</span>
            <span className="font-black text-lg" style={{ color: 'var(--color-brand-green)' }}>🪙 {potentialWin}</span>
          </div>

          <button
            id="place-bet-confirm-btn"
            onClick={() => setConfirm(true)}
            disabled={!amount || parseFloat(amount) <= 0}
            className="w-full py-3 rounded-xl font-black transition-all active:scale-95 disabled:opacity-40"
            style={{ background: 'var(--color-brand-green)', color: '#000' }}>
            Apostar 🎯
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirm}
        onCancel={() => setConfirm(false)}
        onConfirm={handleConfirm}
        isLoading={loading}
        title={`¿Apostás ${amount} tokens?`}
        message={`Opción: "${option.label}" — Cuota: ${option.current_odds?.toFixed(2)}x → Ganancia potencial: ${potentialWin} tokens`}
        confirmText="¡Dale, apuesto!"
        emoji="🎯"
      />
    </>,
    document.body
  );
}


// ── Modal de denuncia ───────────────────────────────────
function ReportModal({ isOpen, bet, onClose }) {
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await api.post('/tribunal/report', { bet_id: bet.id, reason });
      toast.success('⚖️ Denuncia enviada al Tribunal!');
      onClose();
      setReason('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al denunciar');
    } finally {
      setLoading(false);
      setConfirm(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998] flex items-end justify-center p-4 animate-backdrop"
        style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
        <div className="glass rounded-2xl p-6 w-full max-w-sm animate-modal-pop mb-16" onClick={(e) => e.stopPropagation()}>
          <div className="text-3xl text-center mb-3">⚖️</div>
          <h3 className="text-lg font-black mb-1 text-center text-text-primary">Impugnar Apuesta</h3>
          <p className="text-xs text-text-muted text-center mb-4">"{bet?.title}"</p>

          <label className="block text-xs font-semibold mb-2 uppercase tracking-widest text-text-muted">
            ¿Por qué la impugnás?
          </label>
          <textarea
            id="report-reason-input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="El creador trampeó porque..."
            rows={4}
            className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none resize-none mb-4"
            style={{
              background: 'var(--color-brand-card)',
              border: '1.5px solid var(--color-brand-border)',
              color: 'var(--color-text-primary)',
            }}
          />

          <button
            id="report-submit-btn"
            onClick={() => setConfirm(true)}
            disabled={!reason.trim()}
            className="w-full py-3 rounded-xl font-black transition-all active:scale-95 disabled:opacity-40"
            style={{ background: 'var(--color-brand-red)', color: '#fff' }}>
            Enviar al Tribunal 🚨
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirm}
        onCancel={() => setConfirm(false)}
        onConfirm={handleConfirm}
        isLoading={loading}
        title="¿Impugnar esta apuesta?"
        message="La apuesta irá al Tribunal para votación. ¿Seguro que hay trampa?"
        confirmText="Sí, denunciar"
        confirmColor="red"
        emoji="🚨"
      />
    </>,
    document.body
  );
}

// ── Tarjeta individual ───────────────────────────────────
function BetCard({ bet, onBetPlaced, isSwipe = false }) {
  const user = useAuthStore((s) => s.user);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showBetModal, setShowBetModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const isCreator = bet.creator_id === user?.id;
  const alreadyBet = !!bet.my_bet;
  const isClosed = bet.status !== 'open';

  const handleOptionClick = (option) => {
    if (isCreator || alreadyBet || isClosed) return;
    setSelectedOption(option);
    setShowBetModal(true);
  };

  const statusBadge = {
    open:     { label: 'Abierta', color: 'var(--color-brand-green)' },
    closed:   { label: 'Cerrada', color: 'var(--color-brand-yellow)' },
    resolved: { label: 'Resuelta', color: 'var(--color-brand-blue)' },
    annulled: { label: 'Anulada', color: 'var(--color-brand-red)' },
  }[bet.status];

  return (
    <div className={`glass rounded-2xl overflow-hidden flex flex-col ${isSwipe ? 'h-full' : ''}`}
      style={{ border: '1px solid var(--color-brand-border)' }}>

      {/* Imagen */}
      {bet.image_url && (
        <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
          <img src={bet.image_url} alt={bet.title}
            className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.8))' }} />
        </div>
      )}

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mr-2"
              style={{ background: `${statusBadge.color}20`, color: statusBadge.color }}>
              {statusBadge.label}
            </span>
            <span className="text-[10px] text-text-muted">por @{bet.creator_username}</span>
          </div>
        </div>

        <h2 className="text-base font-black text-text-primary leading-tight">{bet.title}</h2>
        {bet.description && (
          <p className="text-xs text-text-muted leading-relaxed">{bet.description}</p>
        )}

        {/* Opciones / Botones */}
        {alreadyBet ? (
          <div className="p-3 rounded-xl text-center text-xs font-bold"
            style={{ background: 'rgba(0,230,118,0.08)', color: 'var(--color-brand-green)' }}>
            ✅ Ya apostaste {bet.my_bet.amount} tokens a "{bet.options.find(o => o.id === bet.my_bet.option_id)?.label}"
            <div className="text-text-muted font-normal mt-0.5">
              Cuota fijada: {bet.my_bet.locked_odds}x → Potencial: 🪙 {bet.my_bet.potential_win}
            </div>
          </div>
        ) : isCreator ? (
          <div className="p-3 rounded-xl text-center text-xs text-text-muted"
            style={{ background: 'var(--color-brand-card)' }}>
            Esta es tu apuesta 🎯
          </div>
        ) : (
          <div className="flex gap-2">
            {bet.options.map((opt) => (
              <OddsButton key={opt.id} option={opt} onSelect={handleOptionClick} disabled={isClosed} />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-2"
          style={{ borderTop: '1px solid var(--color-brand-border)' }}>
          <span className="text-[10px] text-text-muted">
            {new Date(bet.created_at).toLocaleDateString('es-AR')}
          </span>
          {!isCreator && bet.status === 'open' && (
            <button
              id={`report-btn-${bet.id}`}
              onClick={() => setShowReportModal(true)}
              className="text-[10px] font-semibold flex items-center gap-1 hover:opacity-100 opacity-50 transition-opacity"
              style={{ color: 'var(--color-brand-red)' }}>
              🚨 Impugnar
            </button>
          )}
        </div>
      </div>

      <PlaceBetModal
        isOpen={showBetModal}
        option={selectedOption}
        bet={bet}
        onClose={() => setShowBetModal(false)}
        onSuccess={onBetPlaced}
      />
      <ReportModal isOpen={showReportModal} bet={bet} onClose={() => setShowReportModal(false)} />
    </div>
  );
}

// ── Página principal Feed ────────────────────────────────
export default function Feed() {
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('swipe'); // 'swipe' | 'grid'
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeAnim, setSwipeAnim] = useState(null);
  const [filterStatus, setFilterStatus] = useState('open');

  const fetchBets = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/bets?status=${filterStatus}`);
      setBets(data.bets);
      setCurrentIndex(0);
    } catch {
      toast.error('Error cargando apuestas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBets(); }, [filterStatus]);

  const skip = (dir) => {
    setSwipeAnim(dir === 'left' ? 'animate-swipe-left' : 'animate-swipe-right');
    setTimeout(() => {
      setCurrentIndex((i) => Math.min(i + 1, bets.length));
      setSwipeAnim(null);
    }, 380);
  };

  const currentBet = bets[currentIndex];

  return (
    <div className="max-w-lg mx-auto px-4 pt-4">
      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--color-brand-card)' }}>
          {['open', 'resolved', 'annulled'].map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              id={`filter-${s}`}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{
                background: filterStatus === s ? 'var(--color-brand-green)' : 'transparent',
                color: filterStatus === s ? '#000' : 'var(--color-text-muted)',
              }}>
              {s === 'open' ? '🟢 Abiertas' : s === 'resolved' ? '✅ Resueltas' : '🚫 Anuladas'}
            </button>
          ))}
        </div>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--color-brand-card)' }}>
          {[{ mode: 'swipe', icon: '🃏' }, { mode: 'grid', icon: '▦' }].map(({ mode, icon }) => (
            <button key={mode} onClick={() => setViewMode(mode)}
              id={`view-${mode}`}
              className="px-3 py-1.5 rounded-lg text-sm font-bold transition-all"
              style={{
                background: viewMode === mode ? 'var(--color-brand-surface)' : 'transparent',
                color: viewMode === mode ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              }}>
              {icon}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="text-center py-20 text-text-muted">
          <div className="text-4xl mb-3 animate-spin">🎰</div>
          <p className="text-sm font-semibold">Cargando apuestas...</p>
        </div>
      )}

      {/* SWIPE MODE */}
      {!loading && viewMode === 'swipe' && (
        <div>
          {bets.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🏜️</div>
              <p className="font-bold text-text-muted">No hay apuestas {filterStatus === 'open' ? 'abiertas' : 'aquí'}.</p>
              {filterStatus === 'open' && <p className="text-sm text-text-muted mt-1">¡Crea la primera! 🎯</p>}
            </div>
          ) : currentIndex >= bets.length ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🎉</div>
              <p className="font-bold text-text-primary">¡Viste todas las apuestas!</p>
              <button onClick={fetchBets}
                className="mt-4 px-6 py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
                style={{ background: 'var(--color-brand-green)', color: '#000' }}>
                🔄 Recargar
              </button>
            </div>
          ) : (
            <div>
              {/* Counter */}
              <div className="text-center text-xs text-text-muted mb-3 font-semibold">
                {currentIndex + 1} / {bets.length}
              </div>

              {/* Card */}
              <div className={`${swipeAnim || 'animate-card-enter'}`}>
                <BetCard bet={currentBet} onBetPlaced={fetchBets} isSwipe />
              </div>

              {/* Skip buttons */}
              <div className="flex gap-3 mt-4">
                <button
                  id="skip-left-btn"
                  onClick={() => skip('left')}
                  className="flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
                  style={{ background: 'var(--color-brand-card)', border: '1px solid var(--color-brand-border)', color: 'var(--color-text-muted)' }}>
                  ⏭ Saltar
                </button>
                {currentIndex < bets.length - 1 && (
                  <button
                    id="skip-right-btn"
                    onClick={() => skip('right')}
                    className="flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
                    style={{ background: 'var(--color-brand-card)', border: '1px solid var(--color-brand-border)', color: 'var(--color-text-muted)' }}>
                    Siguiente ➡
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* GRID MODE */}
      {!loading && viewMode === 'grid' && (
        <div className="grid grid-cols-1 gap-4">
          {bets.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🏜️</div>
              <p className="font-bold text-text-muted">No hay apuestas aquí.</p>
            </div>
          ) : (
            bets.map((bet) => (
              <BetCard key={bet.id} bet={bet} onBetPlaced={fetchBets} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
