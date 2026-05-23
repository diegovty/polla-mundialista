import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import api from '../lib/api';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    api.get('/leaderboard').then(r => {
      setLeaderboard(r.data);
      setLoading(false);
    });
  }, []);

  useSocket({
    'leaderboard:updated': (data) => {
      setLeaderboard(data);
      setLastUpdated(new Date());
    },
  });

  const myRank = leaderboard.findIndex(l => l.user_id === user.id) + 1;
  const me = leaderboard.find(l => l.user_id === user.id);

  return (
    <div>
      {/* Header */}
      <div className="bg-wc-green text-white px-4 pt-12 pb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black">Tabla 🏆</h1>
          {lastUpdated && (
            <span className="text-green-200 text-xs">
              Actualizado {lastUpdated.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        {me && (
          <div className="mt-3 bg-white/15 rounded-2xl p-3 flex items-center gap-3">
            <div className="text-2xl font-black text-wc-gold">#{myRank}</div>
            <div className="flex-1">
              <div className="font-bold text-sm">Tu posición</div>
              <div className="text-green-200 text-xs">{me.predictions_made} pronósticos · {me.exact_scores} exactos</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-wc-gold">{me.total_points}</div>
              <div className="text-green-200 text-xs">puntos</div>
            </div>
          </div>
        )}
      </div>

      {/* Column headers */}
      <div className="bg-white border-b border-gray-100 px-4 py-2">
        <div className="flex items-center text-xs text-gray-400 font-semibold">
          <div className="w-8 text-center">#</div>
          <div className="flex-1 pl-3">Jugador</div>
          <div className="w-12 text-center">Exactos</div>
          <div className="w-14 text-center font-black text-gray-600">Pts</div>
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-gray-50">
        {loading ? (
          <div className="text-center text-gray-400 py-12">Cargando tabla...</div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <div className="text-4xl mb-3">🏆</div>
            <p>Nadie ha hecho pronósticos aún.</p>
            <p className="text-sm mt-1">¡Sé el primero!</p>
          </div>
        ) : (
          leaderboard.map((entry, i) => {
            const isMe = entry.user_id === user.id;
            return (
              <div
                key={entry.user_id}
                className={`flex items-center px-4 py-3 ${isMe ? 'bg-green-50' : 'bg-white'}`}
              >
                <div className="w-8 text-center">
                  {i < 3 ? (
                    <span className="text-xl">{MEDALS[i]}</span>
                  ) : (
                    <span className="text-sm font-bold text-gray-400">{i + 1}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-1 pl-2 min-w-0">
                  {entry.avatar ? (
                    <img src={entry.avatar} alt="" className="w-9 h-9 rounded-full flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-wc-green/20 flex items-center justify-center text-wc-green font-black flex-shrink-0">
                      {entry.name[0]}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className={`font-semibold text-sm truncate ${isMe ? 'text-wc-green' : 'text-gray-800'}`}>
                      {entry.name}{isMe ? ' (tú)' : ''}
                    </div>
                    <div className="text-xs text-gray-400">{entry.predictions_made} pronósticos</div>
                  </div>
                </div>
                <div className="w-12 text-center text-sm text-gray-500">{entry.exact_scores}</div>
                <div className={`w-14 text-center text-xl font-black ${isMe ? 'text-wc-green' : 'text-gray-800'}`}>
                  {entry.total_points}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="px-4 py-6 text-center text-xs text-gray-300">
        3 pts = marcador exacto · 1 pt = ganador correcto · 0 pts = incorrecto
      </div>
    </div>
  );
}
