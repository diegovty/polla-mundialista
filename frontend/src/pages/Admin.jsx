import { useEffect, useState } from 'react';
import api from '../lib/api';

export default function Admin() {
  const [matches, setMatches] = useState([]);
  const [filter, setFilter] = useState('upcoming');
  const [editing, setEditing] = useState(null);
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/matches').then(r => setMatches(r.data));
  }, []);

  const filtered = matches.filter(m =>
    filter === 'all' ? true : m.status === filter
  );

  const openEdit = (m) => {
    setEditing(m);
    setScoreA(m.score_a ?? '');
    setScoreB(m.score_b ?? '');
    setMsg('');
  };

  const handleResult = async (e) => {
    e.preventDefault();
    if (scoreA === '' || scoreB === '') return;
    setSaving(true);
    try {
      await api.put(`/matches/${editing.id}/result`, {
        score_a: parseInt(scoreA),
        score_b: parseInt(scoreB),
        status: 'finished',
      });
      setMatches(prev => prev.map(m =>
        m.id === editing.id
          ? { ...m, score_a: parseInt(scoreA), score_b: parseInt(scoreB), status: 'finished' }
          : m
      ));
      setMsg('✅ Resultado guardado y puntos calculados');
      setEditing(null);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const markLive = async (m) => {
    await api.put(`/matches/${m.id}`, { status: 'live' });
    setMatches(prev => prev.map(p => p.id === m.id ? { ...p, status: 'live' } : p));
  };

  return (
    <div>
      <div className="bg-wc-green text-white px-4 pt-12 pb-4">
        <h1 className="text-2xl font-black">Panel Admin ⚙️</h1>
        <p className="text-green-200 text-sm mt-1">Ingresa los resultados de los partidos</p>
      </div>

      {/* Filter */}
      <div className="bg-white border-b border-gray-100 px-4 py-2 flex gap-2">
        {['upcoming', 'live', 'finished', 'all'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
              filter === f ? 'bg-wc-green text-white' : 'text-gray-500 bg-gray-100'
            }`}
          >
            {f === 'upcoming' ? 'Por jugar' : f === 'live' ? '🔴 En vivo' : f === 'finished' ? 'Terminados' : 'Todos'}
          </button>
        ))}
      </div>

      {msg && (
        <div className="mx-4 mt-3 p-3 bg-green-50 text-green-800 rounded-xl text-sm text-center">
          {msg}
        </div>
      )}

      <div className="px-4 py-4 space-y-2">
        {filtered.map(m => (
          <div key={m.id} className="card">
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">
                  {m.stage === 'group' ? `Grupo ${m.group_name} · J${m.matchday}` : m.stage}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  m.status === 'live' ? 'bg-red-100 text-red-600' :
                  m.status === 'finished' ? 'bg-gray-100 text-gray-500' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {m.status === 'upcoming' ? 'Por jugar' : m.status === 'live' ? '🔴 En vivo' : 'Terminado'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">{m.flag_a} {m.team_a}</span>
                {m.status === 'finished' ? (
                  <span className="font-black text-lg">{m.score_a} – {m.score_b}</span>
                ) : (
                  <span className="text-gray-400 text-sm">vs</span>
                )}
                <span className="font-bold text-sm">{m.team_b} {m.flag_b}</span>
              </div>

              <div className="flex gap-2 mt-3">
                {m.status === 'upcoming' && (
                  <button
                    onClick={() => markLive(m)}
                    className="flex-1 py-2 text-sm bg-red-100 text-red-700 font-semibold rounded-lg"
                  >
                    Marcar en vivo
                  </button>
                )}
                <button
                  onClick={() => openEdit(m)}
                  className="flex-1 py-2 text-sm bg-wc-green text-white font-semibold rounded-lg"
                >
                  {m.status === 'finished' ? 'Corregir resultado' : 'Ingresar resultado'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={e => e.target === e.currentTarget && setEditing(null)}>
          <div className="bg-white w-full rounded-t-3xl p-6 pb-8">
            <h2 className="text-lg font-black mb-1 text-center">Ingresar resultado</h2>
            <p className="text-center text-gray-500 text-sm mb-5">
              {editing.flag_a} {editing.team_a} vs {editing.team_b} {editing.flag_b}
            </p>
            <form onSubmit={handleResult}>
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-2">{editing.team_a}</div>
                  <input
                    type="number" min="0" max="20" value={scoreA}
                    onChange={e => setScoreA(e.target.value)}
                    className="w-20 h-20 text-center text-3xl font-black border-2 border-gray-200 rounded-2xl focus:border-wc-green focus:outline-none"
                    placeholder="0" required
                  />
                </div>
                <div className="text-2xl font-black text-gray-400">–</div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-2">{editing.team_b}</div>
                  <input
                    type="number" min="0" max="20" value={scoreB}
                    onChange={e => setScoreB(e.target.value)}
                    className="w-20 h-20 text-center text-3xl font-black border-2 border-gray-200 rounded-2xl focus:border-wc-green focus:outline-none"
                    placeholder="0" required
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setEditing(null)} className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-600">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary">
                  {saving ? 'Guardando...' : 'Guardar resultado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
