import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useSocket } from '../hooks/useSocket';
import MatchCard from '../components/MatchCard';
import PredictionModal from '../components/PredictionModal';
import PredictionsViewModal from '../components/PredictionsViewModal';

const TABS = ['Todos', 'Por jugar', 'Finalizados'];

export default function Matches() {
  const [matches, setMatches] = useState([]);
  const [selected, setSelected] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [tab, setTab] = useState('Por jugar');
  const [loading, setLoading] = useState(true);

  const fetchMatches = () =>
    api.get('/matches').then(r => {
      setMatches(r.data);
      setLoading(false);
    });

  useEffect(() => { fetchMatches(); }, []);

  useSocket({
    'match:updated': (updated) => {
      setMatches(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m));
    },
  });

  const filtered = matches.filter(m => {
    if (tab === 'Por jugar') return m.status === 'upcoming';
    if (tab === 'Finalizados') return m.status === 'finished';
    return true;
  });

  // Group by calendar date, sorted chronologically
  const grouped = {};
  [...filtered]
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
    .forEach(m => {
      const key = new Date(m.scheduled_at).toLocaleDateString('es-MX', {
        weekday: 'long', day: 'numeric', month: 'long',
      });
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(m);
    });

  const pendingPreds = matches.filter(
    m => m.status === 'upcoming' &&
    new Date(m.scheduled_at) > new Date() &&
    m.predicted_a == null
  ).length;

  return (
    <div>
      {/* Header */}
      <div className="bg-wc-green text-white px-4 pt-12 pb-4">
        <h1 className="text-2xl font-black">Partidos</h1>
        {pendingPreds > 0 && (
          <p className="text-wc-gold text-sm mt-1">
            ⚡ {pendingPreds} partido{pendingPreds !== 1 ? 's' : ''} sin pronosticar
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4">
        <div className="flex gap-1 py-2">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                tab === t
                  ? 'bg-wc-green text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-6">
        {loading ? (
          <div className="text-center text-gray-400 py-12">Cargando partidos...</div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center text-gray-400 py-12">No hay partidos en esta sección</div>
        ) : (
          Object.entries(grouped).map(([group, groupMatches]) => (
            <div key={group}>
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                {group}
              </h2>
              <div className="space-y-2">
                {groupMatches.map(m => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    onClick={() => m.status === 'upcoming' && new Date(m.scheduled_at) > new Date()
                      ? setSelected(m)
                      : setViewing(m)
                    }
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {selected && (
        <PredictionModal
          match={selected}
          onClose={() => setSelected(null)}
          onSaved={fetchMatches}
        />
      )}
      {viewing && (
        <PredictionsViewModal
          match={viewing}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}
