import { useState, useEffect } from 'react';
import { api } from '../store/authStore';
import { useAuthStore } from '../store/authStore';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';

export default function Tribunal() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState({ open: false, reportId: null, vote: null });
  const [voting, setVoting] = useState(false);
  const user = useAuthStore((s) => s.user);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/tribunal');
      setReports(data.reports);
    } catch {
      toast.error('Error cargando el tribunal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const submitVote = async () => {
    setVoting(true);
    try {
      const { data } = await api.post(`/tribunal/${confirm.reportId}/vote`, { vote: confirm.vote });
      toast.success(data.message);
      fetchReports();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al votar');
    } finally {
      setVoting(false);
      setConfirm({ open: false, reportId: null, vote: null });
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-4">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-4xl">⚖️</span>
        <div>
          <h1 className="text-2xl font-black text-text-primary">Tribunal</h1>
          <p className="text-xs text-text-muted">Acá se hace justicia, hermano</p>
        </div>
      </div>

      {loading && (
        <div className="text-center py-20 text-text-muted">
          <div className="text-4xl mb-3">⚖️</div>
          <p className="text-sm font-semibold">Consultando el Tribunal...</p>
        </div>
      )}

      {!loading && reports.length === 0 && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">✅</div>
          <p className="font-bold text-text-primary">No hay denuncias pendientes</p>
          <p className="text-sm text-text-muted mt-1">Todos se portan bien... por ahora 👀</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {reports.map((report) => {
          const annulVotes = report.votes?.filter((v) => v.vote === 'annul').length ?? 0;
          const maintainVotes = report.votes?.filter((v) => v.vote === 'maintain').length ?? 0;
          const totalVoters = report.total_votes ?? 0;
          const totalUsers = report.total_users ?? 1;
          const pct = Math.round((totalVoters / totalUsers) * 100);
          const annulPct = totalVoters ? Math.round((annulVotes / totalVoters) * 100) : 0;
          const maintainPct = totalVoters ? Math.round((maintainVotes / totalVoters) * 100) : 0;
          const myVote = report.my_vote;
          const isCreator = report.bet ? false : false; // guardado en backend
          const canVote = !myVote;

          return (
            <div key={report.id} className="glass rounded-2xl p-5"
              style={{ border: '1px solid var(--color-brand-border)' }}>

              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,23,68,0.12)', color: 'var(--color-brand-red)' }}>
                    🚨 Denunciada
                  </span>
                  <h3 className="text-base font-black text-text-primary mt-1">{report.bet_title}</h3>
                  <p className="text-xs text-text-muted">Denunciada por @{report.reporter_username}</p>
                </div>
              </div>

              {/* Razón */}
              <div className="p-3 rounded-xl mb-4"
                style={{ background: 'var(--color-brand-card)', border: '1px solid var(--color-brand-border)' }}>
                <p className="text-xs font-semibold text-text-muted mb-1">Motivo:</p>
                <p className="text-sm text-text-primary">{report.reason}</p>
              </div>

              {/* Contador de votos */}
              <div className="mb-3">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span style={{ color: 'var(--color-brand-red)' }}>🚫 Anular {annulVotes}</span>
                  <span className="text-text-muted">{totalVoters}/{totalUsers} votaron ({pct}%)</span>
                  <span style={{ color: 'var(--color-brand-green)' }}>Mantener {maintainVotes} ✅</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden"
                  style={{ background: 'var(--color-brand-card)' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${annulPct}%`,
                      background: 'linear-gradient(to right, var(--color-brand-red), var(--color-brand-purple))',
                    }} />
                </div>
              </div>

              {/* Mi voto / botones */}
              {myVote ? (
                <div className="text-center py-2 text-xs font-bold text-text-muted">
                  ✅ Ya votaste: {myVote === 'annul' ? '🚫 Anular' : '✅ Mantener'}
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    id={`vote-annul-${report.id}`}
                    onClick={() => setConfirm({ open: true, reportId: report.id, vote: 'annul' })}
                    className="flex-1 py-3 rounded-xl font-black text-sm transition-all active:scale-95"
                    style={{ background: 'rgba(255,23,68,0.15)', color: 'var(--color-brand-red)', border: '1.5px solid var(--color-brand-red)' }}>
                    🚫 Anular apuesta
                  </button>
                  <button
                    id={`vote-maintain-${report.id}`}
                    onClick={() => setConfirm({ open: true, reportId: report.id, vote: 'maintain' })}
                    className="flex-1 py-3 rounded-xl font-black text-sm transition-all active:scale-95"
                    style={{ background: 'rgba(0,230,118,0.12)', color: 'var(--color-brand-green)', border: '1.5px solid var(--color-brand-green)' }}>
                    ✅ Mantener
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmModal
        isOpen={confirm.open}
        onCancel={() => setConfirm({ open: false, reportId: null, vote: null })}
        onConfirm={submitVote}
        isLoading={voting}
        title={confirm.vote === 'annul' ? '¿Anular la apuesta?' : '¿Mantener el resultado?'}
        message={confirm.vote === 'annul'
          ? 'Si la mayoría vota ANULAR, se devuelven los tokens a todos los participantes.'
          : 'Si la mayoría vota MANTENER, el resultado del creador es firme.'}
        confirmText={confirm.vote === 'annul' ? '🚫 Sí, anular' : '✅ Sí, mantener'}
        confirmColor={confirm.vote === 'annul' ? 'red' : 'green'}
        emoji="⚖️"
      />
    </div>
  );
}
