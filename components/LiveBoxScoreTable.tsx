import { EMPTY_STAT_LINE, type StatLine } from "@/lib/events";

interface Player {
  id: string;
  full_name: string;
  jersey_number: number | null;
}

export type EditableColumn =
  | "fgm" | "fga" | "fg3m" | "fg3a" | "ftm" | "fta"
  | "oreb" | "dreb" | "ast" | "stl" | "blk" | "tov" | "pf"
  | "fouls_drawn" | "shots_rejected";

function pct(made: number, attempted: number) {
  return attempted > 0 ? ((made / attempted) * 100).toFixed(1) : "0.0";
}

function Stepper({
  value,
  onIncrement,
  onDecrement,
}: {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <div className="inline-flex items-center justify-end gap-2 whitespace-nowrap">
      <span className="inline-block w-[18px] text-right text-[15px] font-semibold tabular-nums text-white">
        {value}
      </span>
      <div className="flex flex-col gap-0.5">
        <button
          onClick={onIncrement}
          aria-label="Increment"
          className="flex h-[22px] w-7 items-center justify-center rounded-[3px] bg-brand-gold text-[9px] text-[#111] hover:bg-brand-gold-600 active:scale-95"
        >
          ▲
        </button>
        <button
          onClick={onDecrement}
          aria-label="Decrement"
          className="flex h-[22px] w-7 items-center justify-center rounded-[3px] bg-white/[0.12] text-[9px] text-white/70 hover:bg-white/20 active:scale-95"
        >
          ▼
        </button>
      </div>
    </div>
  );
}

export function LiveBoxScoreTable({
  teamName,
  players,
  stats,
  editable = false,
  selectedPlayerId = null,
  onSelectPlayer,
  onIncrement,
  onDecrement,
}: {
  teamName: string;
  players: Player[];
  stats: Record<string, StatLine>;
  editable?: boolean;
  selectedPlayerId?: string | null;
  onSelectPlayer?: (playerId: string) => void;
  onIncrement?: (playerId: string, column: EditableColumn) => void;
  onDecrement?: (playerId: string, column: EditableColumn) => void;
}) {
  const sorted = [...players].sort(
    (a, b) => (stats[b.id]?.pts ?? 0) - (stats[a.id]?.pts ?? 0)
  );

  function cell(playerId: string, column: EditableColumn, value: number, isSelectedRow: boolean) {
    if (editable && isSelectedRow && onIncrement && onDecrement) {
      return (
        <Stepper
          value={value}
          onIncrement={() => onIncrement(playerId, column)}
          onDecrement={() => onDecrement(playerId, column)}
        />
      );
    }
    return value;
  }

  return (
    <div className="overflow-x-auto border-t border-white/[0.13]">
      <table className="w-full min-w-[1700px] table-fixed border-separate border-spacing-0 text-[13px]">
        <colgroup>
          <col className="w-[210px]" />
          <col className="w-16" />
          {Array.from({ length: 20 }).map((_, i) => (
            <col key={i} className="w-20" />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-court-950 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-white/55">
              {teamName}
            </th>
            {["MIN", "FGM", "FGA", "FG%", "3PM", "3PA", "3P%", "FTM", "FTA", "FT%", "OREB", "DREB", "REB", "AST", "STL", "BLK", "TO", "PF", "FD", "REJ", "PTS"].map(
              (h) => (
                <th
                  key={h}
                  className="border-b border-white/[0.13] px-2.5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-white/55"
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {sorted.map((player) => {
            const line = stats[player.id] ?? EMPTY_STAT_LINE;
            const selected = editable && player.id === selectedPlayerId;
            return (
              <tr key={player.id} className={selected ? "bg-[rgba(242,183,5,0.08)]" : undefined}>
                <td
                  className={`sticky left-0 z-10 border-b border-white/[0.07] py-2 pr-3 ${
                    selected ? "bg-[rgba(242,183,5,0.08)]" : "bg-court-950"
                  }`}
                >
                  {editable && onSelectPlayer ? (
                    <button
                      onClick={() => onSelectPlayer(player.id)}
                      className={`flex w-full items-center rounded px-2 py-2 text-left ${
                        selected ? "text-brand-gold" : "text-white"
                      }`}
                    >
                      <span className="inline-block w-[26px] text-[11px] font-semibold text-white/30">
                        {player.jersey_number}
                      </span>
                      <span className="text-[14px] font-medium">{player.full_name}</span>
                    </button>
                  ) : (
                    <span className="flex items-center px-2 py-2">
                      <span className="inline-block w-[26px] text-[11px] font-semibold text-white/30">
                        {player.jersey_number}
                      </span>
                      <span className="text-[14px] font-medium text-white">{player.full_name}</span>
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap border-b border-white/[0.07] px-2.5 py-2.5 text-right tabular-nums text-white/72">{Math.round(line.minutes_played)}</td>
                <td className="whitespace-nowrap border-b border-white/[0.07] px-2.5 py-2.5 text-right tabular-nums text-white/72">{cell(player.id, "fgm", line.fgm, selected)}</td>
                <td className="whitespace-nowrap border-b border-white/[0.07] px-2.5 py-2.5 text-right tabular-nums text-white/72">{cell(player.id, "fga", line.fga, selected)}</td>
                <td className="whitespace-nowrap border-b border-white/[0.07] px-2.5 py-2.5 text-right tabular-nums text-white/72">{pct(line.fgm, line.fga)}</td>
                <td className="whitespace-nowrap border-b border-white/[0.07] px-2.5 py-2.5 text-right tabular-nums text-white/72">{cell(player.id, "fg3m", line.fg3m, selected)}</td>
                <td className="whitespace-nowrap border-b border-white/[0.07] px-2.5 py-2.5 text-right tabular-nums text-white/72">{cell(player.id, "fg3a", line.fg3a, selected)}</td>
                <td className="whitespace-nowrap border-b border-white/[0.07] px-2.5 py-2.5 text-right tabular-nums text-white/72">{pct(line.fg3m, line.fg3a)}</td>
                <td className="whitespace-nowrap border-b border-white/[0.07] px-2.5 py-2.5 text-right tabular-nums text-white/72">{cell(player.id, "ftm", line.ftm, selected)}</td>
                <td className="whitespace-nowrap border-b border-white/[0.07] px-2.5 py-2.5 text-right tabular-nums text-white/72">{cell(player.id, "fta", line.fta, selected)}</td>
                <td className="whitespace-nowrap border-b border-white/[0.07] px-2.5 py-2.5 text-right tabular-nums text-white/72">{pct(line.ftm, line.fta)}</td>
                <td className="whitespace-nowrap border-b border-white/[0.07] px-2.5 py-2.5 text-right tabular-nums text-white/72">{cell(player.id, "oreb", line.oreb, selected)}</td>
                <td className="whitespace-nowrap border-b border-white/[0.07] px-2.5 py-2.5 text-right tabular-nums text-white/72">{cell(player.id, "dreb", line.dreb, selected)}</td>
                <td className="whitespace-nowrap border-b border-white/[0.07] px-2.5 py-2.5 text-right tabular-nums text-white/72">{line.oreb + line.dreb}</td>
                <td className="whitespace-nowrap border-b border-white/[0.07] px-2.5 py-2.5 text-right tabular-nums text-white/72">{cell(player.id, "ast", line.ast, selected)}</td>
                <td className="whitespace-nowrap border-b border-white/[0.07] px-2.5 py-2.5 text-right tabular-nums text-white/72">{cell(player.id, "stl", line.stl, selected)}</td>
                <td className="whitespace-nowrap border-b border-white/[0.07] px-2.5 py-2.5 text-right tabular-nums text-white/72">{cell(player.id, "blk", line.blk, selected)}</td>
                <td className="whitespace-nowrap border-b border-white/[0.07] px-2.5 py-2.5 text-right tabular-nums text-white/72">{cell(player.id, "tov", line.tov, selected)}</td>
                <td className="whitespace-nowrap border-b border-white/[0.07] px-2.5 py-2.5 text-right tabular-nums text-white/72">{cell(player.id, "pf", line.pf, selected)}</td>
                <td className="whitespace-nowrap border-b border-white/[0.07] px-2.5 py-2.5 text-right tabular-nums text-white/72">{cell(player.id, "fouls_drawn", line.fouls_drawn, selected)}</td>
                <td className="whitespace-nowrap border-b border-white/[0.07] px-2.5 py-2.5 text-right tabular-nums text-white/72">{cell(player.id, "shots_rejected", line.shots_rejected, selected)}</td>
                <td className="whitespace-nowrap border-b border-white/[0.07] px-2.5 py-2.5 text-right tabular-nums font-semibold text-brand-gold">{line.pts}</td>
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={21} className="py-4 text-center text-white/40">
                No players yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
