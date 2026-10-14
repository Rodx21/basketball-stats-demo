import { GRADE_LABEL, type GradeType, type RankRow } from "@/lib/liveScouting";

const TYPES: GradeType[] = ["rule", "def_error", "off_error", "positive"];

function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

function tone(n: number): string {
  return n > 0 ? "text-emerald-400" : n < 0 ? "text-red-400" : "text-white/40";
}

// Internal player ranking (plain markup, so it renders in the live MUI screen and on server pages).
export function RankingTable({ rows, games }: { rows: RankRow[]; games?: Map<string, number> }) {
  if (rows.length === 0) return <p className="text-sm text-white/40">Nothing scored yet.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm tabular-nums">
        <thead>
          <tr className="text-[11px] uppercase tracking-[0.1em] text-white/45">
            <th className="py-2 pr-2">#</th>
            <th className="py-2 pr-4">Player</th>
            <th className="py-2 pr-4 text-right">Total</th>
            <th className="py-2 pr-4 text-right" title="Points per 10 possessions on the floor">Per 10 poss</th>
            {TYPES.map((t) => (
              <th key={t} className="py-2 pr-4 text-right">
                {GRADE_LABEL[t]}
              </th>
            ))}
            {games && <th className="py-2 pr-4 text-right">Games</th>}
            <th className="py-2">What happened</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.player} className="border-t border-white/10 align-top">
              <td className="py-2 pr-2 text-white/45">{i + 1}</td>
              <td className="py-2 pr-4 font-semibold text-white">{r.player}</td>
              <td className={`py-2 pr-4 text-right text-base font-bold ${tone(r.total)}`}>{signed(r.total)}</td>
              <td className="py-2 pr-4 text-right text-white/80">
                {r.per10 == null ? "–" : signed(Math.round(r.per10 * 10) / 10)}
                <span className="ml-1 text-[11px] text-white/35">({r.poss})</span>
              </td>
              {TYPES.map((t) => (
                <td key={t} className={`py-2 pr-4 text-right ${tone(r.byType[t])}`}>
                  {r.byType[t] ? signed(r.byType[t]) : "–"}
                </td>
              ))}
              {games && <td className="py-2 pr-4 text-right text-white/70">{games.get(r.player) ?? 0}</td>}
              <td className="py-2 text-xs text-white/55">{r.items.map(([label, n]) => (n > 1 ? `${label} ×${n}` : label)).join(" · ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
