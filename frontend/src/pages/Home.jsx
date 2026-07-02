import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import api from '../lib/api';

// ── Donut chart via conic-gradient ──────────────────────────────────────────
function DonutChart({ exact, correct, wrong }) {
  const total = exact + correct + wrong;
  const ep = total ? (exact / total) * 100 : 0;
  const cp = total ? (correct / total) * 100 : 0;

  return (
    <div
      className="relative w-24 h-24 rounded-full flex-shrink-0"
      style={{
        background: total
          ? `conic-gradient(#f4a503 0% ${ep}%, #22c55e ${ep}% ${ep + cp}%, #e5e7eb ${ep + cp}% 100%)`
          : '#e5e7eb',
      }}
    >
      <div className="absolute inset-3 rounded-full bg-white flex flex-col items-center justify-center">
        <span className="text-base font-black text-gray-800 leading-none">{total}</span>
        <span className="text-gray-400 leading-none" style={{ fontSize: 9 }}>pron.</span>
      </div>
    </div>
  );
}

// ── Vertical bar chart (pure CSS) ──────────────────────────────────────────
function BarChart({ data, barClass = 'bg-wc-green' }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const CHART_H = 52;

  return (
    <div className="flex items-end gap-1" style={{ height: CHART_H + 28 }}>
      {data.map(d => (
        <div key={d.label} className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
          {d.value > 0 && (
            <span className="text-gray-500 leading-none" style={{ fontSize: 9 }}>{d.value}</span>
          )}
          <div className="w-full bg-gray-100 rounded-sm relative" style={{ height: CHART_H }}>
            <div
              className={`${barClass} rounded-sm w-full absolute bottom-0 transition-all duration-500`}
              style={{ height: `${(d.value / max) * 100}%` }}
            />
          </div>
          <span className="text-gray-400 leading-none" style={{ fontSize: 9 }}>J{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Countdown to a future date ─────────────────────────────────────────────
function Countdown({ target }) {
  const [label, setLabel] = useState('');

  useEffect(() => {
    const calc = () => {
      const diff = new Date(target) - Date.now();
      if (diff <= 0) { setLabel('¡Ya!'); return; }
      const totalMin = Math.floor(diff / 60000);
      const d = Math.floor(totalMin / 1440);
      const h = Math.floor((totalMin % 1440) / 60);
      const m = totalMin % 60;
      if (d > 0)      setLabel(`${d}d ${h}h`);
      else if (h > 0) setLabel(`${h}h ${m}m`);
      else            setLabel(`${m}m`);
    };
    calc();
    const id = setInterval(calc, 30000);
    return () => clearInterval(id);
  }, [target]);

  return <span>{label}</span>;
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function Home() {
  const { user, logout } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [dash, setDash] = useState(null);

  useSocket({ 'leaderboard:updated': setLeaderboard });

  useEffect(() => {
    api.get('/leaderboard').then(r => setLeaderboard(r.data));
    api.get('/dashboard').then(r => setDash(r.data));
  }, []);

  const me        = leaderboard.find(l => l.user_id === user.id);
  const myRank    = leaderboard.findIndex(l => l.user_id === user.id) + 1;
  const maxPts    = leaderboard[0]?.total_points || 1;

  const myStats    = dash?.my_stats    || { exact: 0, correct: 0, wrong: 0, by_day: [] };
  const tournament = dash?.tournament  || {};
  const nextMatches = dash?.next_matches || [];

  const totalPred = myStats.exact + myStats.correct + myStats.wrong;
  const pctHit    = totalPred
    ? Math.round(((myStats.exact + myStats.correct) / totalPred) * 100)
    : 0;

  return (
    <div>
      {/* ── Header ── */}
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

        {/* My quick stats */}
        <div className="bg-white/15 rounded-2xl p-4">
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { value: me?.total_points ?? 0, label: 'puntos', gold: true },
              { value: myRank ? `#${myRank}` : '—', label: 'posición' },
              { value: me?.exact_scores ?? 0, label: 'exactos' },
              { value: `${pctHit}%`, label: 'aciertos' },
            ].map(s => (
              <div key={s.label}>
                <div className={`text-2xl font-black ${s.gold ? 'text-wc-gold' : 'text-white'}`}>{s.value}</div>
                <div className="text-green-200 text-xs">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* ── Mi rendimiento ── */}
        <div className="card">
          <div className="px-4 py-3 border-b border-gray-100">
            <span className="font-bold text-gray-800">Mi rendimiento</span>
          </div>
          <div className="px-4 py-4">
            <div className="flex items-center gap-5">
              <DonutChart exact={myStats.exact} correct={myStats.correct} wrong={myStats.wrong} />
              <div className="flex-1 space-y-2.5">
                {[
                  { label: 'Exactos (3 pts)',   count: myStats.exact,   dot: 'bg-wc-gold' },
                  { label: 'Acertados (1 pt)',  count: myStats.correct, dot: 'bg-green-500' },
                  { label: 'Fallados (0 pts)',  count: myStats.wrong,   dot: 'bg-gray-200' },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-sm flex-shrink-0 ${s.dot}`} />
                    <span className="text-xs text-gray-500 flex-1">{s.label}</span>
                    <span className="text-sm font-black text-gray-800">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {myStats.by_day.length > 0 ? (
              <div className="mt-5">
                <p className="text-xs text-gray-400 mb-2">Puntos por jornada</p>
                <BarChart
                  data={myStats.by_day.map(d => ({ label: d.matchday, value: parseInt(d.pts) }))}
                  barClass="bg-wc-green"
                />
              </div>
            ) : (
              <p className="text-center text-gray-400 text-xs mt-4">
                Tus puntos aparecerán aquí cuando empiecen los partidos
              </p>
            )}
          </div>
        </div>

        {/* ── Torneo ── */}
        <div className="card">
          <div className="px-4 py-3 border-b border-gray-100">
            <span className="font-bold text-gray-800">Torneo · Mundial 2026</span>
          </div>
          <div className="grid grid-cols-4 divide-x divide-gray-100 border-b border-gray-100">
            {[
              { icon: '✅', label: 'Jugados',   value: tournament.matches_played  ?? 0 },
              { icon: '🔴', label: 'En vivo',   value: tournament.matches_live    ?? 0 },
              { icon: '🗓️', label: 'Restantes', value: tournament.matches_upcoming ?? 0 },
              { icon: '🥅', label: 'Goles',     value: tournament.total_goals     ?? 0 },
            ].map(s => (
              <div key={s.label} className="py-3 text-center">
                <div className="text-xl leading-none mb-1">{s.icon}</div>
                <div className="text-xl font-black text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>

          {tournament.goals_by_day?.length > 0 ? (
            <div className="px-4 py-4">
              <p className="text-xs text-gray-400 mb-2">Goles por jornada</p>
              <BarChart
                data={tournament.goals_by_day.map(d => ({ label: d.matchday, value: parseInt(d.goals) }))}
                barClass="bg-blue-400"
              />
            </div>
          ) : (
            <div className="px-4 py-3 text-center text-gray-400 text-xs">
              El torneo comienza el 11 de junio 2026 🏆
            </div>
          )}
        </div>

        {/* ── Comparar con amigos ── */}
        {leaderboard.length > 0 && (
          <div className="card">
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="font-bold text-gray-800">Comparar con amigos</span>
            </div>
            <div className="px-4 py-3 space-y-3">
              {leaderboard.map((entry, i) => (
                <div key={entry.user_id}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                      i === 0 ? 'bg-yellow-400 text-yellow-900'
                      : i === 1 ? 'bg-gray-300 text-gray-700'
                      : i === 2 ? 'bg-amber-600 text-white'
                      : 'bg-gray-100 text-gray-500'
                    }`}>
                      {i + 1}
                    </div>
                    {entry.avatar ? (
                      <img src={entry.avatar} alt="" className="w-6 h-6 rounded-full flex-shrink-0" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-wc-green/20 flex items-center justify-center text-wc-green text-xs font-bold flex-shrink-0">
                        {entry.name[0]}
                      </div>
                    )}
                    <span className={`text-sm font-semibold flex-1 truncate ${entry.user_id === user.id ? 'text-wc-green' : 'text-gray-700'}`}>
                      {entry.name.split(' ')[0]}{entry.user_id === user.id ? ' (tú)' : ''}
                    </span>
                    <span className="text-sm font-black text-gray-800 flex-shrink-0">{entry.total_points} pts</span>
                  </div>
                  <div className="ml-7 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        entry.user_id === user.id ? 'bg-wc-green' : 'bg-gray-300'
                      }`}
                      style={{ width: `${maxPts ? (entry.total_points / maxPts) * 100 : 0}%`, minWidth: entry.total_points > 0 ? 8 : 0 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Próximos partidos ── */}
        {nextMatches.length > 0 && (
          <div className="card">
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="font-bold text-gray-800">Próximos partidos</span>
            </div>
            {nextMatches.map(m => (
              <div key={m.id} className="flex items-center gap-2 px-4 py-3 border-b border-gray-50 last:border-0">
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <span className="text-2xl leading-none flex-shrink-0">{m.flag_a}</span>
                  <span className="text-sm font-semibold text-gray-700 truncate">{m.team_a}</span>
                </div>
                <div className="text-center flex-shrink-0 px-1">
                  <div className="text-xs text-gray-400 font-bold">VS</div>
                  <div className="text-xs font-bold text-wc-green">
                    <Countdown target={m.scheduled_at} />
                  </div>
                  <div className="text-gray-300" style={{ fontSize: 9 }}>
                    {m.stage === 'group'  ? `Grupo ${m.group_name}`
                    : m.stage === 'last32' ? '16vos de final'
                    : m.stage === 'last16' ? 'Octavos'
                    : m.stage === 'quarter'? 'Cuartos'
                    : m.stage === 'semi'   ? 'Semifinal'
                    : m.stage === 'final'  ? 'Final'
                    : ''}
                  </div>
                </div>
                <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
                  <span className="text-sm font-semibold text-gray-700 truncate text-right">{m.team_b}</span>
                  <span className="text-2xl leading-none flex-shrink-0">{m.flag_b}</span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
