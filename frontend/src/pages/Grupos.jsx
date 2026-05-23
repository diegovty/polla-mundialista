import { useEffect, useState } from 'react';
import api from '../lib/api';
import GroupTable from '../components/GroupTable';

const GROUP_LABELS = ['A','B','C','D','E','F','G','H','I','J','K','L'];

export default function Grupos() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState('A');

  useEffect(() => {
    api.get('/standings').then(r => {
      setData(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

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

  const { standings = {}, tournament = {}, polla = {}, jornada_leaders = {} } = data || {};

  return (
    <div>
      {/* Header */}
      <div className="bg-wc-green text-white px-4 pt-12 pb-6">
        <h1 className="text-2xl font-black mb-1">Grupos</h1>
        <p className="text-green-200 text-sm">Mundial 2026 · Fase de grupos</p>

        {/* Tournament stats */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          {[
            { label: 'Jugados', value: tournament.matches_played ?? 0 },
            { label: 'En vivo', value: tournament.matches_live ?? 0 },
            { label: 'Restantes', value: tournament.matches_upcoming ?? 0 },
            { label: 'Goles', value: tournament.total_goals ?? 0 },
          ].map(s => (
            <div key={s.label} className="bg-white/15 rounded-xl py-3 text-center">
              <div className="text-xl font-black text-wc-gold">{s.value}</div>
              <div className="text-green-200 text-xs">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Polla stats */}
        <div className="card">
          <div className="px-4 py-3 border-b border-gray-100">
            <span className="font-bold text-gray-800">Estadísticas de la polla</span>
          </div>
          <div className="grid grid-cols-2 divide-x divide-gray-100">
            {[
              { label: 'Jugadores', value: polla.total_players ?? 0, icon: '👥' },
              { label: 'Pronósticos', value: polla.total_predictions ?? 0, icon: '📝' },
              { label: 'Exactos', value: polla.total_exact ?? 0, icon: '🎯' },
              { label: 'Acertados', value: polla.total_correct ?? 0, icon: '✅' },
            ].map((s, i) => (
              <div key={s.label} className={`px-4 py-3 text-center ${i >= 2 ? 'border-t border-gray-100' : ''}`}>
                <div className="text-xl mb-0.5">{s.icon}</div>
                <div className="text-2xl font-black text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Jornada leaders */}
        {Object.keys(jornada_leaders).length > 0 && (
          <div className="card">
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="font-bold text-gray-800">Líderes por jornada</span>
            </div>
            {Object.entries(jornada_leaders).map(([day, leader]) => (
              <div key={day} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                <div className="w-8 h-8 rounded-full bg-wc-gold/20 flex items-center justify-center text-xs font-black text-wc-gold-dark">
                  J{day}
                </div>
                {leader.avatar ? (
                  <img src={leader.avatar} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-wc-green/20 flex items-center justify-center text-wc-green font-bold text-sm">
                    {leader.name[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{leader.name.split(' ')[0]}</div>
                  <div className="text-xs text-gray-400">Jornada {day}</div>
                </div>
                <div className="text-wc-green font-black">{leader.pts} pts</div>
              </div>
            ))}
          </div>
        )}

        {/* Group standings */}
        <div className="card">
          <div className="px-4 py-3 border-b border-gray-100">
            <span className="font-bold text-gray-800">Posiciones por grupo</span>
          </div>

          {/* Group selector */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex flex-wrap gap-1.5">
              {GROUP_LABELS.map(g => (
                <button
                  key={g}
                  onClick={() => setActiveGroup(g)}
                  className={`w-8 h-8 rounded-lg text-sm font-bold transition-colors ${
                    activeGroup === g
                      ? 'bg-wc-green text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="px-1">
            <div className="px-3 py-2 flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Grupo {activeGroup}</span>
              <span className="text-xs text-gray-400">· top 2 clasifican</span>
            </div>
            <GroupTable teams={standings[activeGroup] || []} />
            <div className="px-3 pb-3 flex items-center gap-2 mt-1">
              <div className="w-3 h-3 rounded-sm bg-green-100 border border-green-200" />
              <span className="text-xs text-gray-400">Clasifica a octavos</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
