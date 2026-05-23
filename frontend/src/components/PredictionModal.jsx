import { useState } from 'react';
import api from '../lib/api';

export default function PredictionModal({ match, onClose, onSaved }) {
  const [scoreA, setScoreA] = useState(match.predicted_a ?? '');
  const [scoreB, setScoreB] = useState(match.predicted_b ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canPredict = match.status === 'upcoming' && new Date(match.scheduled_at) > new Date();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (scoreA === '' || scoreB === '') return;
    setLoading(true);
    setError('');
    try {
      await api.post('/predictions', {
        match_id: match.id,
        predicted_a: parseInt(scoreA),
        predicted_b: parseInt(scoreB),
      });
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 pb-8 safe-area-inset-bottom">
        {/* Match header */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-center flex-1">
            <div className="text-4xl">{match.flag_a}</div>
            <div className="font-bold text-sm mt-1">{match.team_a}</div>
          </div>
          <div className="text-center px-4">
            <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
              {match.stage === 'group' ? `Grupo ${match.group_name}` : match.stage}
            </div>
            {match.status === 'finished' && (
              <div className="text-2xl font-black mt-1">
                {match.score_a} – {match.score_b}
              </div>
            )}
            {match.status === 'upcoming' && (
              <div className="text-gray-400 text-sm mt-1">vs</div>
            )}
          </div>
          <div className="text-center flex-1">
            <div className="text-4xl">{match.flag_b}</div>
            <div className="font-bold text-sm mt-1">{match.team_b}</div>
          </div>
        </div>

        {canPredict ? (
          <form onSubmit={handleSubmit}>
            <p className="text-center text-sm text-gray-500 mb-4">
              Ingresa tu pronóstico:
            </p>
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-2 font-medium">{match.team_a}</div>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={scoreA}
                  onChange={e => setScoreA(e.target.value)}
                  className="w-20 h-20 text-center text-3xl font-black border-2 border-gray-200 rounded-2xl focus:border-wc-green focus:outline-none"
                  placeholder="0"
                  required
                />
              </div>
              <div className="text-2xl font-black text-gray-400">–</div>
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-2 font-medium">{match.team_b}</div>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={scoreB}
                  onChange={e => setScoreB(e.target.value)}
                  className="w-20 h-20 text-center text-3xl font-black border-2 border-gray-200 rounded-2xl focus:border-wc-green focus:outline-none"
                  placeholder="0"
                  required
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-sm text-center mb-3">{error}</p>}

            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-600">
                Cancelar
              </button>
              <button type="submit" disabled={loading} className="flex-1 btn-primary">
                {loading ? 'Guardando...' : match.predicted_a != null ? 'Actualizar' : 'Guardar pronóstico'}
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center">
            {match.predicted_a != null ? (
              <>
                <p className="text-gray-500 text-sm mb-4">Tu pronóstico:</p>
                <div className="flex items-center justify-center gap-4">
                  <div className="text-4xl font-black text-gray-800">{match.predicted_a}</div>
                  <div className="text-xl text-gray-400">–</div>
                  <div className="text-4xl font-black text-gray-800">{match.predicted_b}</div>
                </div>
                {match.status === 'finished' && match.points_earned != null && (
                  <div className="mt-4">
                    {match.points_earned === 3 && <span className="badge-exact text-lg px-4 py-1.5">+3 pts — ¡Exacto! 🎯</span>}
                    {match.points_earned === 1 && <span className="badge-outcome text-lg px-4 py-1.5">+1 pt — Ganador correcto ✅</span>}
                    {match.points_earned === 0 && <span className="badge-wrong text-lg px-4 py-1.5">0 pts — Incorrecto ❌</span>}
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-500 text-sm">No hiciste pronóstico para este partido.</p>
            )}
            <button onClick={onClose} className="mt-6 w-full py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-600">
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
