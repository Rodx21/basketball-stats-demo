"use client";

import { useState } from "react";
import Link from "next/link";
import { pct } from "./format";
import type { TeamDashboardClientProps } from "./types";

const LEADERBOARD_METRICS = [
  { key: "pirPerGame", label: "PIR", format: (v: number) => v.toFixed(1) },
  { key: "ppg", label: "PTS", format: (v: number) => v.toFixed(1) },
  { key: "rpg", label: "REB", format: (v: number) => v.toFixed(1) },
  { key: "apg", label: "AST", format: (v: number) => v.toFixed(1) },
  { key: "tsPct", label: "TS%", format: (v: number) => pct(v) },
] as const;

type LeaderboardMetric = (typeof LEADERBOARD_METRICS)[number]["key"];

export function Leaderboard({ seasonStats }: Pick<TeamDashboardClientProps, "seasonStats">) {
  const [metric, setMetric] = useState<LeaderboardMetric>("pirPerGame");
  const active = LEADERBOARD_METRICS.find((m) => m.key === metric)!;

  const ranked = [...seasonStats].sort((a, b) => b[metric] - a[metric]).slice(0, 10);
  const leaderValue = Math.max(1e-9, ...ranked.map((p) => p[metric]));

  return (
    <section className="border-b border-white/[0.13] py-14">
      <div className="mb-9 flex items-baseline justify-between gap-8">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-white">Leaderboard</h2>
        <div className="flex gap-1.5">
          {LEADERBOARD_METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`rounded-[14px] px-4 py-[7px] text-[11px] font-semibold uppercase tracking-[0.1em] ${
                metric === m.key
                  ? "border border-brand-gold bg-brand-gold text-[#111]"
                  : "border border-white/20 text-white/60 hover:border-white/40"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-14">
        {ranked.map((p, i) => (
          <Link
            key={p.id}
            href={`/players/${p.id}`}
            className="grid grid-cols-[22px_minmax(0,1fr)_130px_60px] items-center gap-3.5 border-b border-white/[0.09] py-[13px] hover:[&_.pname]:text-brand-gold"
          >
            <span className="text-[11px] font-semibold tabular-nums text-white/30">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="pname truncate text-[14px] font-medium text-white">
              #{p.jersey ?? "-"} {p.fullName}
            </span>
            <span className="h-1.5 rounded-sm bg-white/[0.07]">
              <span
                className="block h-1.5 rounded-sm bg-brand-gold"
                style={{ width: `${(p[metric] / leaderValue) * 100}%` }}
              />
            </span>
            <span className="text-right text-[15px] font-bold tabular-nums text-brand-gold">
              {active.format(p[metric])}
            </span>
          </Link>
        ))}
        {ranked.length === 0 && <p className="text-sm text-white/40">No players yet.</p>}
      </div>
    </section>
  );
}
