import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * ConfirmModal — Modal "¿Estás seguro, bro?" reutilizable.
 * Usa createPortal para escapar cualquier stacking context del padre
 * (el backdrop-filter del glassmorphism crea uno que atrapa fixed children).
 */
export default function ConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  title = '¿Estás seguro, bro?',
  message = 'Esta acción modificará la base de datos. No hay vuelta atrás.',
  confirmText = 'Dale, confirmar',
  confirmColor = 'green',
  emoji = '🤔',
  isLoading = false,
}) {
  // Cerrar con Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && isOpen) onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const colorMap = {
    green: { background: 'var(--color-brand-green)', color: '#000' },
    red:   { background: 'var(--color-brand-red)',   color: '#fff' },
    blue:  { background: 'var(--color-brand-blue)',  color: '#fff' },
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-backdrop"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onCancel}
    >
      <div
        className="glass rounded-2xl p-6 w-full max-w-sm animate-modal-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-5xl text-center mb-4">{emoji}</div>
        <h2 className="text-xl font-bold text-center mb-2" style={{ color: 'var(--color-text-primary)' }}>{title}</h2>
        <p className="text-sm text-center mb-6 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{message}</p>

        <div className="flex gap-3">
          <button
            id="confirm-modal-cancel"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            style={{ border: '1px solid var(--color-brand-border)', color: 'var(--color-text-muted)' }}
          >
            Cancelar
          </button>
          <button
            id="confirm-modal-confirm"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
            style={colorMap[confirmColor]}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/>
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                </svg>
                Procesando...
              </span>
            ) : confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
