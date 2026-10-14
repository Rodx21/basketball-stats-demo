"use client";

import { Box, Stack, Typography } from "@mui/material";
import { OUR_DEFENSE_RULES, pppBy, ruleStats, type Possession, type PossessionStats } from "@/lib/liveScouting";
import { formatPpp, pppColor, sectionTitleSx } from "./shared";

// Building blocks for possession analysis, shared by the live screen and the season dashboard.

export function InsightList({
  title,
  tone,
  rows,
  side,
  empty,
}: {
  title: string;
  tone: "good" | "bad" | "neutral";
  rows: PossessionStats[];
  side: "our_off" | "our_def";
  empty: string;
}) {
  const accent = tone === "good" ? "success.main" : tone === "bad" ? "error.main" : "primary.main";
  return (
    <Box sx={{ borderLeft: "3px solid", borderColor: accent, pl: 1.5 }}>
      <Typography sx={{ ...sectionTitleSx, fontSize: 12, color: accent, mb: 0.5 }}>{title}</Typography>
      {rows.length === 0 ? (
        <Typography sx={{ fontSize: 13, color: "text.disabled" }}>{empty}</Typography>
      ) : (
        rows.map((r) => (
          <Stack key={r.key} direction="row" sx={{ justifyContent: "space-between", alignItems: "baseline", py: 0.4, fontVariantNumeric: "tabular-nums" }}>
            <Typography sx={{ fontSize: 16, fontWeight: 700 }}>{r.key}</Typography>
            <Typography sx={{ fontSize: 14 }}>
              <Box component="span" sx={{ color: "text.secondary", mr: 1 }}>
                {r.pts} pts / {r.poss}
              </Box>
              <Box component="span" sx={{ fontWeight: 800, fontSize: 17, color: pppColor(r.ppp, side, r.poss) }}>
                {formatPpp(r.ppp)}
              </Box>
            </Typography>
          </Stack>
        ))
      )}
    </Box>
  );
}

function RuleSide({ label, stats, tone }: { label: string; stats: PossessionStats | null; tone: "good" | "bad" }) {
  return (
    <Box sx={{ flex: 1 }}>
      <Typography sx={{ fontSize: 11, color: tone === "good" ? "success.main" : "error.main", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {label}
      </Typography>
      {stats ? (
        <Typography sx={{ fontVariantNumeric: "tabular-nums" }}>
          <Box component="span" sx={{ fontSize: 22, fontWeight: 800, color: pppColor(stats.ppp, "our_def", stats.poss) }}>
            {formatPpp(stats.ppp)}
          </Box>
          <Box component="span" sx={{ fontSize: 12, color: "text.secondary", ml: 0.75 }}>
            {stats.pts} pts / {stats.poss}
          </Box>
        </Typography>
      ) : (
        <Typography sx={{ fontSize: 13, color: "text.disabled" }}>—</Typography>
      )}
    </Box>
  );
}

// PPP allowed when each defensive rule was kept vs broken — the "rules matter" proof.
export function DefenseRules({ possessions }: { possessions: Possession[] }) {
  return (
    <Box sx={{ borderLeft: "3px solid", borderColor: "primary.main", pl: 1.5 }}>
      <Typography sx={{ ...sectionTitleSx, fontSize: 12, color: "primary.main", mb: 0.75 }}>Our rules · PPP allowed</Typography>
      <Stack spacing={1.25}>
        {ruleStats(possessions, OUR_DEFENSE_RULES).map(({ rule, kept, broken }) => (
          <Box key={rule.key}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.25 }}>{rule.label}</Typography>
            <Stack direction="row" spacing={2}>
              <RuleSide label={`Kept${kept ? ` ${kept.poss}×` : ""}`} stats={kept} tone="good" />
              <RuleSide label={`Broken${broken ? ` ${broken.poss}×` : ""}`} stats={broken} tone="bad" />
            </Stack>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

const tableSx = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
  fontVariantNumeric: "tabular-nums",
  "& td, & th": { py: 0.9, px: 0.75, textAlign: "right", whiteSpace: "nowrap" },
  "& td:first-of-type, & th:first-of-type": { textAlign: "left", pl: 0 },
  "& thead tr": { color: "text.secondary", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" },
  "& tbody tr": { borderTop: "1px solid rgba(255,255,255,0.09)" },
} as const;

export function StatsTable({ title, rows, side }: { title: string; rows: PossessionStats[]; side: "our_off" | "our_def" }) {
  if (rows.length === 0) return null;
  return (
    <Box>
      <Typography sx={{ ...sectionTitleSx, fontSize: 12, mb: 0.5 }}>{title}</Typography>
      <Box sx={{ overflowX: "auto" }}>
        <Box component="table" sx={tableSx}>
          <thead>
            <tr>
              <th></th>
              <th>Poss</th>
              <th>Pts</th>
              <th>PPP</th>
              <th>Score %</th>
              <th>TO</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td>{r.key}</td>
                <td>{r.poss}</td>
                <td>{r.pts}</td>
                <Box component="td" sx={{ fontWeight: 800, color: pppColor(r.ppp, side, r.poss) }}>
                  {formatPpp(r.ppp)}
                </Box>
                <td>{Math.round((r.scored / r.poss) * 100)}%</td>
                <td>{r.tov || "–"}</td>
              </tr>
            ))}
          </tbody>
        </Box>
      </Box>
    </Box>
  );
}

// PPP of each row key against each defense — e.g. our plays vs their 1-3-1.
export function Matrix({ title, possessions, side, rowKey }: { title: string; possessions: Possession[]; side: "our_off" | "our_def"; rowKey: (p: Possession) => string | null }) {
  const defenses = [...new Set(possessions.map((p) => p.defense).filter((d): d is string => Boolean(d)))];
  if (defenses.length === 0) return null;
  const rows = pppBy(possessions, rowKey).map((r) => r.key);

  return (
    <Box>
      <Typography sx={{ ...sectionTitleSx, fontSize: 12, mb: 0.5 }}>{title}</Typography>
      <Box sx={{ overflowX: "auto" }}>
        <Box component="table" sx={tableSx}>
          <thead>
            <tr>
              <th></th>
              {defenses.map((d) => (
                <th key={d}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row}>
                <td>{row}</td>
                {defenses.map((d) => {
                  const [cell] = pppBy(possessions.filter((p) => rowKey(p) === row && p.defense === d), () => "x");
                  return (
                    <td key={d}>
                      {cell ? (
                        <>
                          <Box component="span" sx={{ fontWeight: 800, color: pppColor(cell.ppp, side, cell.poss) }}>
                            {formatPpp(cell.ppp)}
                          </Box>
                          <Box component="span" sx={{ fontSize: 11, color: "text.secondary", ml: 0.5 }}>
                            ({cell.poss})
                          </Box>
                        </>
                      ) : (
                        "–"
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </Box>
      </Box>
    </Box>
  );
}

export function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 11, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.12em" }}>{label}</Typography>
      <Typography sx={{ fontSize: 34, fontWeight: 800, fontVariantNumeric: "tabular-nums", lineHeight: 1.1, color }}>{value}</Typography>
    </Box>
  );
}

export const accordionSx = { bgcolor: "background.paper", border: "1px solid rgba(255,255,255,0.13)", "&:before": { display: "none" }, borderRadius: "14px !important" };

