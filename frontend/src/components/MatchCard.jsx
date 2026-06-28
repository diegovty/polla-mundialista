const STATUS_LABELS = {
  upcoming: null,
  live: { label: 'EN VIVO', cls: 'bg-red-500 text-white animate-pulse' },
  finished: { label: 'FINALIZADO', cls: 'bg-gray-200 text-gray-600' },
};

export default function MatchCard({ match, onClick }) {
  const hasPred = match.predicted_a != null;
  const isLocked = match.status !== 'upcoming' || new Date(match.scheduled_at) <= new Date();
  const statusBadge = STATUS_LABELS[match.status];

  const formatDate = (d) => {
    const date = new Date(d);
    return date.toLocaleDateString('es-MX', {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const getPredBadge = () => {
    if (match.status !== 'finished') return null;
    if (!hasPred) return null;
    if (match.points_earned === 3) return <span className="badge-exact">+3 🎯</span>;
    if (match.points_earned === 1) return <span className="badge-outcome">+1 ✅</span>;
    return <span className="badge-wrong">0 pts ❌</span>;
  };

  return (
    <button
      onClick={onClick}
      className="card w-full text-left active:scale-[0.98] transition-transform"
    >
      <div className="px-4 py-3">
        {/* Top row: group + status */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 font-medium">
            {match.stage === 'group'
              ? `Grupo ${match.group_name} · Jornada ${match.matchday}`
              : { last32: '16vos de final', last16: 'Octavos de final',
                  quarter: 'Cuartos de final', semi: 'Semifinal',
                  third: 'Tercer lugar', final: 'Final' }[match.stage] || match.stage}
          </span>
          <div className="flex items-center gap-2">
            {statusBadge && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusBadge.cls}`}>
                {statusBadge.label}
              </span>
            )}
            {getPredBadge()}
          </div>
        </div>

        {/* Teams row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-2xl">{match.flag_a}</span>
            <span className="font-bold text-sm">{match.team_a}</span>
          </div>

          <div className="text-center px-3 min-w-[80px]">
            {match.status === 'finished' || match.status === 'live' ? (
              <span className="text-xl font-black">
                {match.score_a} – {match.score_b}
              </span>
            ) : (
              <span className="text-gray-400 font-bold text-sm">vs</span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-1 justify-end">
            <span className="font-bold text-sm">{match.team_b}</span>
            <span className="text-2xl">{match.flag_b}</span>
          </div>
        </div>

        {/* Bottom row: date + prediction */}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-400">{formatDate(match.scheduled_at)}</span>
          {hasPred ? (
            <span className="text-xs text-wc-green font-semibold">
              Tu pronóstico: {match.predicted_a}–{match.predicted_b}
            </span>
          ) : !isLocked ? (
            <span className="text-xs text-wc-gold font-semibold">Pronosticar ✏️</span>
          ) : (
            <span className="text-xs text-gray-300">Sin pronóstico</span>
          )}
        </div>
      </div>
    </button>
  );
}
