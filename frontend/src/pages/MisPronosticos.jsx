import { useEffect, useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import api from '../lib/api';

function Badge({ pts, status }) {
  if (status !== 'finished') return null;
  if (pts === 3) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-wc-gold/20 text-wc-gold-dark">🎯 Exacto</span>;
  if (pts === 1) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">✅ Acertado</span>;
  return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-400">❌ Fallado</span>;
}

function MatchRow({ m, onUpdated }) {
  const hasPred  = m.predicted_a !== null && m.predicted_a !== undefined;
  const isFinished = m.status === 'finished';
  const isLive     = m.status === 'live';

  return (
    <div className={`px-4 py-3 border-b border-gray-50 last:border-0 ${isLive ? 'bg-red-50/50' : ''}`}>
      {/* Teams row */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className="text-xl leading-none">{m.flag_a}</span>
          <span className="text-sm font-semibold text-gray-700 truncate">{m.team_a}</span>
        </div>

        {/* Score / vs */}
        <div className="text-center flex-shrink-0 w-16">
          {isFinished || isLive ? (
            <div className="flex items-center justify-center gap-1">
              <span className={`text-base font-black ${isLive ? 'text-red-500' : 'text-gray-800'}`}>{m.score_a}</span>
              <span className="text-gray-300">-</span>
              <span className={`text-base font-black ${isLive ? 'text-red-500' : 'text-gray-800'}`}>{m.score_b}</span>
            </div>
          ) : (
            <span className="text-xs text-gray-400 font-bold">VS</span>
          )}
          {isLive && <div className="text-xs text-red-500 font-bold animate-pulse">EN VIVO</div>}
        </div>

        <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
          <span className="text-sm font-semibold text-gray-700 truncate text-right">{m.team_b}</span>
          <span className="text-xl leading-none">{m.flag_b}</span>
        </div>
      </div>

      {/* Prediction + badge row */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          {hasPred ? (
            <>
              <span className="text-xs text-gray-400">Mi pronóstico:</span>
              <span className={`text-xs font-black px-2 py-0.5 rounded ${
                isFinished
                  ? m.points_earned === 3 ? 'bg-wc-gold/15 text-wc-gold-dark'
                  : m.points_earned === 1 ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {m.predicted_a} - {m.predicted_b}
              </span>
            </>
          ) : (
            <span className="text-xs text-gray-300 italic">Sin pronóstico</span>
          )}
        </div>
        <Badge pts={m.points_earned} status={m.status} />
      </div>
    </div>
  );
}

export default function MisPronosticos() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | finished | upcoming

  const load = () => api.get('/my-predictions').then(r => { setMatches(r.data); setLoading(false); });

  useEffect(() => { load(); }, []);

  useSocket({ 'match:updated': () => load() });

  const filtered = matches.filter(m => {
    if (filter === 'finished') return m.status === 'finished';
    if (filter === 'upcoming') return m.status === 'upcoming' || m.status === 'live';
    return true;
  });

  // Group by matchday
  const byDay = filtered.reduce((acc, m) => {
    const d = m.matchday;
    if (!acc[d]) acc[d] = [];
    acc[d].push(m);
    return acc;
  }, {});

  // Summary counts
  const done     = matches.filter(m => m.status === 'finished');
  const exact    = done.filter(m => m.points_earned === 3).length;
  const correct  = done.filter(m => m.points_earned === 1).length;
  const wrong    = done.filter(m => m.points_earned === 0 && m.predicted_a !== null).length;
  const totalPts = done.reduce((s, m) => s + (m.points_earned || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-2">⚽</div>
          <div className="animate-pulse">Cargando...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-wc-green text-white px-4 pt-12 pb-6">
        <h1 className="text-2xl font-black mb-1">Mis pronósticos</h1>
        <p className="text-green-200 text-sm">{matches.length} partidos · fase de grupos</p>

        {done.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mt-4">
            {[
              { label: 'Puntos',   value: totalPts,  gold: true },
              { label: 'Exactos',  value: exact },
              { label: 'Acertados', value: correct },
              { label: 'Fallados', value: wrong },
            ].map(s => (
              <div key={s.label} className="bg-white/15 rounded-xl py-3 text-center">
                <div className={`text-xl font-black ${s.gold ? 'text-wc-gold' : 'text-white'}`}>{s.value}</div>
                <div className="text-green-200 text-xs">{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-gray-100 bg-white sticky top-0 z-10">
        {[
          { key: 'all',      label: 'Todos' },
          { key: 'finished', label: 'Jugados' },
          { key: 'upcoming', label: 'Pendientes' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              filter === f.key
                ? 'text-wc-green border-b-2 border-wc-green'
                : 'text-gray-400'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Match list grouped by matchday */}
      <div className="py-4 space-y-4 px-4">
        {Object.entries(byDay).map(([day, dayMatches]) => (
          <div key={day} className="card">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Jornada {day}
              </span>
              <span className="text-xs text-gray-400">
                {dayMatches.filter(m => m.status === 'finished').length}/{dayMatches.length} jugados
              </span>
            </div>
            {dayMatches.map(m => (
              <MatchRow key={m.id} m={m} />
            ))}
          </div>
        ))}

        {Object.keys(byDay).length === 0 && (
          <div className="text-center text-gray-400 py-12">
            <div className="text-4xl mb-2">📋</div>
            <div>No hay partidos en esta categoría</div>
          </div>
        )}
      </div>
    </div>
  );
}
