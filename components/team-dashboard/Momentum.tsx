import { signed } from "./format";
import type { TeamDashboardClientProps } from "./types";

export function Momentum({ gameMargins, quarters }: Pick<TeamDashboardClientProps, "gameMargins" | "quarters">) {
  const maxAbsMargin = Math.max(1, ...gameMargins.map((g) => Math.abs(g.margin)));
  const maxQuarterPts = Math.max(1, ...quarters.flatMap((q) => [q.us, q.them]));

  return (
    <section className="border-b border-white/[0.13] py-14">
      <div className="mb-9 flex items-baseline justify-between gap-8">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-white">Momentum</h2>
        <p className="max-w-[520px] text-right text-[13px] leading-[1.6] text-white/45">
          Where the season swung — game-by-game margin and how each quarter has gone against the teams we&apos;ve
          faced.
        </p>
      </div>

      <div className="grid grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] gap-14">
        <div>
          <div className="mb-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
            Margin, game by game
          </div>
          <div className="flex h-[220px] gap-2.5">
            {gameMargins.map((g) => (
              <div key={g.gameId} className="flex flex-1 flex-col" title={`${g.opponentName} — ${g.us}–${g.them}`}>
                <div className="flex flex-1 items-end">
                  {g.margin > 0 && (
                    <div
                      className="w-full rounded-t-sm bg-brand-gold"
                      style={{ height: `${(Math.abs(g.margin) / maxAbsMargin) * 100}%` }}
                    />
                  )}
                </div>
                <div className="h-px w-full bg-white/24" />
                <div className="flex flex-1 items-start">
                  {g.margin < 0 && (
                    <div
                      className="w-full rounded-b-sm bg-brand-blue"
                      style={{ height: `${(Math.abs(g.margin) / maxAbsMargin) * 100}%` }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2.5">
            {gameMargins.map((g) => (
              <div key={g.gameId} className="flex-1 text-center">
                <div className={`text-[12px] font-semibold tabular-nums ${g.margin > 0 ? "text-brand-gold" : "text-white/45"}`}>
                  {signed(g.margin, 0)}
                </div>
                <div className="truncate text-[9px] font-semibold uppercase tracking-[0.1em] text-white/35">
                  {g.opponentName}
                </div>
              </div>
            ))}
            {gameMargins.length === 0 && <p className="text-sm text-white/40">No final games yet.</p>}
          </div>
        </div>

        <div>
          <div className="mb-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
            Scoring by quarter — us vs them
          </div>
          <div className="flex flex-col gap-5">
            {quarters.map((q) => (
              <div key={q.quarter} className="grid grid-cols-[32px_minmax(0,1fr)_62px] items-center gap-3.5">
                <span className="text-[11px] font-bold tracking-[0.1em] text-white/55">Q{q.quarter}</span>
                <div className="flex flex-col gap-[5px]">
                  <div className="h-3 rounded-sm bg-brand-gold" style={{ width: `${(q.us / maxQuarterPts) * 100}%` }} />
                  <div className="h-3 rounded-sm bg-brand-blue" style={{ width: `${(q.them / maxQuarterPts) * 100}%` }} />
                </div>
                <span className={`text-right text-[12px] font-semibold tabular-nums ${q.us - q.them > 0 ? "text-brand-gold" : "text-white/50"}`}>
                  {signed(q.us - q.them, 0)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-7 flex gap-6 border-t border-white/[0.13] pt-5">
            <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/45">
              <span className="h-2 w-3.5 rounded-sm bg-brand-gold" /> Us
            </span>
            <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/45">
              <span className="h-2 w-3.5 rounded-sm bg-brand-blue" /> Them
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
