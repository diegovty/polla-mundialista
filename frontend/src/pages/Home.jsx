import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import api from '../lib/api';

export default function Home() {
  const { user, logout } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [myStats, setMyStats] = useState(null);
  const [nextMatch, setNextMatch] = useState(null);

  useSocket({
    'leaderboard:updated': setLeaderboard,
  });

  useEffect(() => {
    api.get('/leaderboard').then(r => setLeaderboard(r.data));
    api.get('/matches').then(r => {
      const upcoming = r.data.find(m => m.status === 'upcoming' && new Date(m.scheduled_at) > new Date());
      setNextMatch(upcoming || null);
    });
  }, []);

  useEffect(() => {
    if (!leaderboard.length) return;
    const me = leaderboard.find(l => l.user_id === user.id);
    if (me) setMyStats(me);
  }, [leaderboard, user.id]);

  const myRank = leaderboard.findIndex(l => l.user_id === user.id) + 1;

  const formatDate = (d) => {
    const date = new Date(d);
    return date.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      {/* Header */}
      <div className="bg-wc-green text-white px-4 pt-12 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-green-200 text-sm">Hola,</p>
            <h1 className="text-xl font-bold">{user.name.split(' ')[0]}</h1>
          </div>
          <div className="flex items-center gap-3">
            {user.avatar && (
              <img src={user.avatar} alt="" className="w-10 h-10 rounded-full border-2 border-wc-gold" />
            )}
            <button onClick={logout} className="text-green-200 text-xs border border-green-400 rounded-lg px-2 py-1">
              Salir
            </button>
          </div>
        </div>

        {/* My stats card */}
        <div className="bg-white/15 rounded-2xl p-4 mt-2">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-3xl font-black text-wc-gold">{myStats?.total_points ?? 0}</div>
              <div className="text-green-200 text-xs">puntos</div>
            </div>
            <div>
              <div className="text-3xl font-black text-white">#{myRank || '—'}</div>
              <div className="text-green-200 text-xs">posición</div>
            </div>
            <div>
              <div className="text-3xl font-black text-white">{myStats?.exact_scores ?? 0}</div>
              <div className="text-green-200 text-xs">exactos</div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Next match */}
        {nextMatch && (
          <div className="card">
            <div className="bg-wc-gold/10 px-4 py-2 border-b border-wc-gold/20">
              <span className="text-wc-gold-dark text-xs font-bold uppercase tracking-wider">Próximo partido</span>
            </div>
            <div className="px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <div className="text-3xl">{nextMatch.flag_a}</div>
                  <div className="text-sm font-semibold mt-1 leading-tight">{nextMatch.team_a}</div>
                </div>
                <div className="text-center px-3">
                  <div className="text-gray-400 text-sm font-bold">VS</div>
                  <div className="text-xs text-gray-400 mt-1 bg-gray-100 rounded px-2 py-0.5">Grupo {nextMatch.group_name}</div>
                </div>
                <div className="text-center flex-1">
                  <div className="text-3xl">{nextMatch.flag_b}</div>
                  <div className="text-sm font-semibold mt-1 leading-tight">{nextMatch.team_b}</div>
                </div>
              </div>
              <div className="text-center text-xs text-gray-500 mt-3">
                {formatDate(nextMatch.scheduled_at)}
              </div>
              <Link to="/partidos" className="block mt-3 text-center text-wc-green text-sm font-bold">
                Ver todos los partidos →
              </Link>
            </div>
          </div>
        )}

        {/* Top 3 */}
        {leaderboard.length > 0 && (
          <div className="card">
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="font-bold text-gray-800">Top de la polla</span>
            </div>
            {leaderboard.slice(0, 5).map((entry, i) => (
              <div
                key={entry.user_id}
                className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 ${entry.user_id === user.id ? 'bg-green-50' : ''}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-black
                  ${i === 0 ? 'bg-yellow-400 text-yellow-900' : i === 1 ? 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {i + 1}
                </div>
                {entry.avatar ? (
                  <img src={entry.avatar} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-wc-green/20 flex items-center justify-center text-wc-green font-bold text-sm">
                    {entry.name[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">
                    {entry.name.split(' ')[0]}{entry.user_id === user.id ? ' (tú)' : ''}
                  </div>
                  <div className="text-xs text-gray-400">{entry.exact_scores} exactos</div>
                </div>
                <div className="text-wc-green font-black text-lg">{entry.total_points}</div>
              </div>
            ))}
            <Link to="/tabla" className="block text-center text-wc-green text-sm font-bold py-3">
              Ver tabla completa →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
