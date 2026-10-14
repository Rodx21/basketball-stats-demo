"use client";

import { useMemo, useState } from "react";
import { pct } from "./format";
import type { SeasonPlayerRow, TeamDashboardClientProps } from "./types";

const H2H_ROWS: { key: keyof SeasonPlayerRow; label: string; format: (v: number) => string }[] = [
  { key: "ppg", label: "PPG", format: (v) => v.toFixed(1) },
  { key: "rpg", label: "RPG", format: (v) => v.toFixed(1) },
  { key: "apg", label: "APG", format: (v) => v.toFixed(1) },
  { key: "tsPct", label: "TS%", format: (v) => pct(v) },
  { key: "efgPct", label: "eFG%", format: (v) => pct(v) },
  { key: "astToTov", label: "AST/TOV", format: (v) => v.toFixed(2) },
  { key: "min", label: "MIN", format: (v) => v.toFixed(1) },
  { key: "pirPerGame", label: "PIR", format: (v) => v.toFixed(1) },
];

export function HeadToHead({ seasonStats }: Pick<TeamDashboardClientProps, "seasonStats">) {
  const byPir = useMemo(() => [...seasonStats].sort((x, y) => y.pirPerGame - x.pirPerGame), [seasonStats]);
  const [aId, setAId] = useState<string | null>(byPir[0]?.id ?? null);
  const [bId, setBId] = useState<string | null>(byPir[1]?.id ?? null);

  const a = seasonStats.find((p) => p.id === aId) ?? seasonStats[0];
  const b = seasonStats.find((p) => p.id === bId) ?? seasonStats[1];

  if (!a || !b) {
    return (
      <section className="border-b border-white/[0.13] py-14">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-white">Head to head</h2>
        <p className="mt-4 text-sm text-white/40">Need at least two players with games played.</p>
      </section>
    );
  }

  return (
    <section className="border-b border-white/[0.13] py-14">
      <div className="mb-9 flex items-baseline justify-between gap-8">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-white">Head to head</h2>
        <p className="text-[13px] text-white/45">Bars are scaled to the higher of the two.</p>
      </div>

      <div className="mb-8 grid grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)] items-center gap-5">
        <div className="flex flex-col items-end">
          <select
            value={a.id}
            onChange={(e) => setAId(e.target.value)}
            className="w-full rounded border border-white/20 bg-court-900 px-3.5 py-2.5 text-right text-[13px] font-medium text-white"
          >
            {seasonStats.map((p) => (
              <option key={p.id} value={p.id}>
                #{p.jersey ?? "-"} {p.fullName}
              </option>
            ))}
          </select>
          <span className="mt-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-brand-gold">
            {a.position ?? "—"} · {a.gp} GP · {a.min.toFixed(1)} MIN
          </span>
        </div>

        <p className="text-center font-[family-name:var(--font-serif)] text-[24px] italic text-white/40">versus</p>

        <div className="flex flex-col items-start">
          <select
            value={b.id}
            onChange={(e) => setBId(e.target.value)}
            className="w-full rounded border border-white/20 bg-court-900 px-3.5 py-2.5 text-[13px] font-medium text-white"
          >
            {seasonStats.map((p) => (
              <option key={p.id} value={p.id}>
                #{p.jersey ?? "-"} {p.fullName}
              </option>
            ))}
          </select>
          <span className="mt-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-white/50">
            {b.position ?? "—"} · {b.gp} GP · {b.min.toFixed(1)} MIN
          </span>
        </div>
      </div>

      <div>
        {H2H_ROWS.map((row) => {
          const av = a[row.key] as number;
          const bv = b[row.key] as number;
          const max = Math.max(av, bv, 1e-9);
          const tie = av === bv;
          return (
            <div
              key={row.key}
              className="grid grid-cols-[52px_minmax(0,1fr)_120px_minmax(0,1fr)_52px] items-center gap-3.5 border-b border-white/[0.09] py-[11px]"
            >
              <span className={`text-right text-[14px] font-bold tabular-nums ${tie || av > bv ? "text-brand-gold" : "text-white/55"}`}>
                {row.format(av)}
              </span>
              <div className="flex justify-end">
                <div className="h-2 rounded-sm bg-brand-gold" style={{ width: `${(av / max) * 100}%` }} />
              </div>
              <span className="text-center text-[10px] font-semibold uppercase tracking-[0.13em] text-white/45">
                {row.label}
              </span>
              <div>
                <div className="h-2 rounded-sm bg-brand-blue" style={{ width: `${(bv / max) * 100}%` }} />
              </div>
              <span className={`text-[14px] font-bold tabular-nums ${tie || bv > av ? "text-white" : "text-white/55"}`}>
                {row.format(bv)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
