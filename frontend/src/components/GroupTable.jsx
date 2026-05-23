export default function GroupTable({ teams = [] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 text-xs border-b border-gray-100">
            <th className="text-left pl-3 py-2 w-6">#</th>
            <th className="text-left py-2">Equipo</th>
            <th className="py-2 text-center w-8">PJ</th>
            <th className="py-2 text-center w-8">G</th>
            <th className="py-2 text-center w-8">E</th>
            <th className="py-2 text-center w-8">P</th>
            <th className="py-2 text-center w-8">GD</th>
            <th className="py-2 text-center w-10 font-bold text-gray-500">Pts</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((t, i) => (
            <tr
              key={t.name}
              className={`border-b border-gray-50 last:border-0 ${i < 2 ? 'bg-green-50' : ''}`}
            >
              <td className="pl-3 py-2.5 text-gray-400 text-xs">{i + 1}</td>
              <td className="py-2.5 pr-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg leading-none">{t.flag}</span>
                  <span className={`font-medium leading-tight ${i < 2 ? 'text-wc-green' : 'text-gray-700'}`}>
                    {t.name}
                  </span>
                </div>
              </td>
              <td className="py-2.5 text-center text-gray-500">{t.mp}</td>
              <td className="py-2.5 text-center text-gray-500">{t.w}</td>
              <td className="py-2.5 text-center text-gray-500">{t.d}</td>
              <td className="py-2.5 text-center text-gray-500">{t.l}</td>
              <td className="py-2.5 text-center text-gray-500">{t.gf - t.ga > 0 ? `+${t.gf - t.ga}` : t.gf - t.ga}</td>
              <td className="py-2.5 text-center font-black text-gray-800">{t.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
