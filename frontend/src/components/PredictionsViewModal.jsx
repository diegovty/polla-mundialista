import { useEffect, useState } from 'react';
import api from '../lib/api';

export default function PredictionsViewModal({ match, onClose }) {
  const [preds, setPreds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/matches/${match.id}/predictions`)
      .then(r => { setPreds(r.data); setLoading(false); })
      .catch(err => {
        setError(err.response?.data?.error || 'Error cargando pronósticos');
        setLoading(false);
      });
  }, [match.id]);

  const isFinished = match.status === 'finished';
  const isLive = match.status === 'live' || new Date(match.scheduled_at) <= new Date();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg rounded-t-2xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Match header */}
        <div className="px-5 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-2xl">{match.flag_a}</span>
              <span className="font-bold text-sm">{match.team_a}</span>
            </div>
            <div className="text-center px-3">
              {isFinished ? (
                <span className="text-xl font-black">{match.score_a} – {match.score_b}</span>
              ) : isLive ? (
                <span className="text-sm font-bold text-red-500 animate-pulse">EN VIVO</span>
              ) : null}
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end">
              <span className="font-bold text-sm">{match.team_b}</span>
              <span className="text-2xl">{match.flag_b}</span>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 mt-1">Pronósticos de todos</p>
        </div>

        {/* Predictions list */}
        <div className="overflow-y-auto flex-1 py-2">
          {loading ? (
            <div className="text-center text-gray-400 py-8 animate-pulse">Cargando...</div>
          ) : error ? (
            <div className="text-center text-red-400 py-8 px-6 text-sm">{error}</div>
          ) : preds.length === 0 ? (
            <div className="text-center text-gray-400 py-8">Nadie pronosticó este partido</div>
          ) : (
            preds.map((p, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 last:border-0">
                {p.avatar ? (
                  <img src={p.avatar} alt="" className="w-9 h-9 rounded-full flex-shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-wc-green/20 flex items-center justify-center text-wc-green font-bold flex-shrink-0">
                    {p.name[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{p.name.split(' ')[0]}</div>
                </div>
                <div className={`text-sm font-black px-3 py-1 rounded-lg ${
                  !isFinished                ? 'bg-gray-100 text-gray-600'
                  : p.points_earned === 3   ? 'bg-wc-gold/20 text-wc-gold-dark'
                  : p.points_earned === 1   ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
                }`}>
                  {p.predicted_a} – {p.predicted_b}
                </div>
                {isFinished && (
                  <div className="text-lg w-6 text-center">
                    {p.points_earned === 3 ? '🎯' : p.points_earned === 1 ? '✅' : '❌'}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-4 pt-2">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-gray-100 text-gray-600 font-semibold"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
