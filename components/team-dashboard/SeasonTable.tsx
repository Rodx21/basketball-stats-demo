"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { pct, signed } from "./format";
import type { TeamDashboardClientProps } from "./types";

type ColumnKey =
  | "gp" | "min" | "ppg" | "rpg" | "apg" | "spg" | "bpg" | "topg"
  | "fgPct" | "fg3Pct" | "ftPct" | "efgPct" | "tsPct"
  | "astToTov" | "gmScPerGame" | "uper" | "pirPerGame" | "plusMinusPerGame";

interface ColumnDef {
  key: ColumnKey;
  label: string;
  group: "Volume" | "Shooting" | "Advanced";
  title: string;
  lowerIsBetter?: boolean;
  format: (v: number) => string;
}

const COLUMNS: ColumnDef[] = [
  { key: "gp", label: "GP", group: "Volume", title: "Games played", format: (v) => String(Math.round(v)) },
  { key: "min", label: "MIN", group: "Volume", title: "Minutes per game", format: (v) => String(Math.round(v)) },
  { key: "ppg", label: "PPG", group: "Volume", title: "Points per game", format: (v) => v.toFixed(1) },
  { key: "rpg", label: "RPG", group: "Volume", title: "Rebounds per game", format: (v) => v.toFixed(1) },
  { key: "apg", label: "APG", group: "Volume", title: "Assists per game", format: (v) => v.toFixed(1) },
  { key: "spg", label: "SPG", group: "Volume", title: "Steals per game", format: (v) => v.toFixed(1) },
  { key: "bpg", label: "BPG", group: "Volume", title: "Blocks per game", format: (v) => v.toFixed(1) },
  {
    key: "topg",
    label: "TOPG",
    group: "Volume",
    title: "Turnovers per game — lower is better",
    lowerIsBetter: true,
    format: (v) => v.toFixed(1),
  },
  { key: "fgPct", label: "FG%", group: "Shooting", title: "Field goal percentage", format: pct },
  { key: "fg3Pct", label: "3P%", group: "Shooting", title: "Three-point percentage", format: pct },
  { key: "ftPct", label: "FT%", group: "Shooting", title: "Free throw percentage", format: pct },
  { key: "efgPct", label: "eFG%", group: "Shooting", title: "Effective field goal percentage", format: pct },
  { key: "tsPct", label: "TS%", group: "Shooting", title: "True shooting percentage", format: pct },
  { key: "astToTov", label: "AST/TOV", group: "Advanced", title: "Assist to turnover ratio", format: (v) => v.toFixed(2) },
  { key: "gmScPerGame", label: "GmSc", group: "Advanced", title: "Game Score per game", format: (v) => v.toFixed(1) },
  {
    key: "uper",
    label: "uPER",
    group: "Advanced",
    title: "Unnormalized Player Efficiency Rating — team totals stand in for league average",
    format: (v) => v.toFixed(3),
  },
  { key: "pirPerGame", label: "PIR", group: "Advanced", title: "Performance Index Rating per game", format: (v) => v.toFixed(1) },
  {
    key: "plusMinusPerGame",
    label: "+/-",
    group: "Advanced",
    title: "Point differential per game while this player was on court",
    format: (v) => signed(v),
  },
];

const GROUP_BOUNDARY_KEYS: ColumnKey[] = ["fgPct", "astToTov"];

export function SeasonTable({ seasonStats }: Pick<TeamDashboardClientProps, "seasonStats">) {
  const [sort, setSort] = useState<ColumnKey>("pirPerGame");
  const [asc, setAsc] = useState(false);

  function handleSort(key: ColumnKey) {
    if (key === sort) setAsc((prev) => !prev);
    else {
      setSort(key);
      setAsc(false);
    }
  }

  const leaders = useMemo(() => {
    const result: Partial<Record<ColumnKey, number>> = {};
    for (const col of COLUMNS) {
      const values = seasonStats.map((p) => p[col.key]);
      result[col.key] = col.lowerIsBetter ? Math.min(...values) : Math.max(...values);
    }
    return result;
  }, [seasonStats]);

  const rows = useMemo(() => {
    const copy = [...seasonStats];
    copy.sort((a, b) => (asc ? a[sort] - b[sort] : b[sort] - a[sort]));
    return copy;
  }, [seasonStats, sort, asc]);

  return (
    <section className="py-14">
      <div className="mb-7 flex items-baseline justify-between gap-8">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-white">Season averages</h2>
        <p className="text-[13px] text-white/45">Click a column to sort · gold marks the squad leader</p>
      </div>

      <div className="overflow-x-auto border-t border-white/[0.13]">
        <table className="w-full min-w-[1180px] border-separate border-spacing-0 text-[13px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-court-950 px-4 py-3.5 text-left" />
              {(["Volume", "Shooting", "Advanced"] as const).map((group) => (
                <th
                  key={group}
                  colSpan={COLUMNS.filter((c) => c.group === group).length}
                  className={`border-b border-white/[0.13] px-2.5 py-3.5 text-left text-[9px] font-semibold uppercase tracking-[0.16em] text-white/35 ${
                    group !== "Volume" ? "border-l border-white/[0.13]" : ""
                  }`}
                >
                  {group}
                </th>
              ))}
            </tr>
            <tr>
              <th className="sticky left-0 z-10 border-b border-white/[0.13] bg-court-950 px-4 py-2.5 text-left" />
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  title={col.title}
                  onClick={() => handleSort(col.key)}
                  className={`cursor-pointer whitespace-nowrap border-b border-white/[0.13] px-2.5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.08em] ${
                    sort === col.key ? "text-brand-gold" : "text-white/55"
                  } ${GROUP_BOUNDARY_KEYS.includes(col.key) ? "border-l border-white/[0.13]" : ""}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-white/[0.04]">
                <td className="sticky left-0 z-10 bg-court-950 py-3 pr-4 text-left tabular-nums">
                  <Link href={`/players/${p.id}`} className="flex items-center hover:text-brand-gold">
                    <span className="inline-block w-[22px] text-[11px] font-semibold text-white/30">
                      {p.jersey ?? "-"}
                    </span>
                    <span className="text-[14px] font-medium text-white">{p.fullName}</span>
                  </Link>
                </td>
                {COLUMNS.map((col) => {
                  const value = p[col.key];
                  const isLeader = leaders[col.key] === value;
                  const isActive = sort === col.key;
                  return (
                    <td
                      key={col.key}
                      className={`whitespace-nowrap border-b border-white/[0.07] px-2.5 py-3 text-right tabular-nums ${
                        isLeader
                          ? "font-semibold text-brand-gold"
                          : isActive
                            ? "font-semibold text-white"
                            : "font-normal text-white/72"
                      } ${GROUP_BOUNDARY_KEYS.includes(col.key) ? "border-l border-white/[0.13]" : ""}`}
                    >
                      {col.format(value)}
                    </td>
                  );
                })}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="py-6 text-center text-white/40">
                  No games played yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
