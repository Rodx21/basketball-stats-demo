"use client";

import { useState } from "react";
import { signed } from "./format";
import type { LineupRow, TeamDashboardClientProps } from "./types";

const TABS = [
  { key: "mostUsed", label: "Most used" },
  { key: "bestPlusMinus", label: "Best +/-" },
  { key: "mostPoints", label: "Most points" },
  { key: "fewestAllowed", label: "Fewest allowed" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function metricFor(tab: TabKey, l: LineupRow) {
  if (tab === "mostPoints") return `${l.us} pts`;
  if (tab === "fewestAllowed") return `${l.them} pts allowed`;
  return signed(l.plusMinus, 0);
}

export function Lineups({ lineups }: Pick<TeamDashboardClientProps, "lineups">) {
  const [tab, setTab] = useState<TabKey>("mostUsed");
  const rows = lineups[tab];

  return (
    <section className="border-b border-white/[0.13] py-14">
      <div className="mb-9 flex items-baseline justify-between gap-8">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-white">Lineups</h2>
        <div className="flex gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-[14px] px-4 py-[7px] text-[11px] font-semibold uppercase tracking-[0.1em] ${
                tab === t.key
                  ? "border border-brand-gold bg-brand-gold text-[#111]"
                  : "border border-white/20 text-white/60 hover:border-white/40"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-white/40">
          No complete five-man stretches yet (or none with at least two stints) — this fills in as more games are
          entered with a starting five and normal substitutions.
        </p>
      ) : (
        <div>
          {rows.map((l) => (
            <div
              key={l.playerIds.join(",")}
              className="grid grid-cols-[minmax(0,1fr)_90px_130px] items-center gap-5 border-b border-white/[0.09] py-3.5"
            >
              <span className="truncate text-[13px] font-medium text-white/80">{l.labels.join(" · ")}</span>
              <span className="text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-white/40">
                {l.stints} stint{l.stints === 1 ? "" : "s"}
              </span>
              <span
                className={`text-right text-[15px] font-bold tabular-nums ${
                  l.plusMinus > 0 ? "text-brand-gold" : l.plusMinus < 0 ? "text-white/60" : "text-white"
                }`}
              >
                {metricFor(tab, l)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
