"use client";

import { useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { TURNOVER_CATEGORY, actionOf, insights, periodLabel, playKey, playOf, playerRanking, pppBy, totals, turnoversBy } from "@/lib/liveScouting";
import { RankingTable } from "@/components/live/RankingTable";
import { DefenseRules, InsightList, Kpi, Matrix, StatsTable, accordionSx } from "@/components/live/insights";
import { GENERAL, asPossessions, formatPpp, pppColor, sectionTitleSx, type LiveEvent } from "@/components/live/shared";

function eventLabel(e: LiveEvent): string {
  if (e.category === GENERAL) return "Note";
  if (e.kind === "lineup") return `${e.category === "ours" ? "Our" : "Their"} ${e.option === "Starters" ? "starters" : "sub"}`;
  if (e.kind === "rule") return `Rule broken: ${e.option} — ${e.actor ?? "?"}`;
  if (e.kind === "grade") return `${e.option} — ${e.actor ?? "?"}`;
  if (e.category === TURNOVER_CATEGORY) return e.kind === "our_off" ? "Our turnover" : "Their turnover";
  if (e.kind === "our_off") return `Our ${playKey(e)}`;
  if (e.kind === "our_def") return `Their ${e.option}`;
  return e.option;
}

function eventResult(e: LiveEvent) {
  if (e.kind === "rule") {
    return (
      <Box component="span" sx={{ color: "error.main", fontWeight: 700 }}>
        −{e.penalty ?? 0}
      </Box>
    );
  }
  if (e.kind === "grade") {
    const score = e.score ?? 0;
    return (
      <Box component="span" sx={{ color: score > 0 ? "success.main" : "error.main", fontWeight: 700 }}>
        {score > 0 ? `+${score}` : score}
      </Box>
    );
  }
  if (e.kind !== "our_off" && e.kind !== "our_def") return null;
  const goodForUs = e.kind === "our_off" ? (e.points ?? 0) > 0 : e.turnover || (e.points ?? 0) === 0;
  return (
    <Box component="span" sx={{ color: goodForUs ? "success.main" : "error.main", fontWeight: 700 }}>
      {e.turnover ? "TO" : `${e.points ?? 0} pts`}
    </Box>
  );
}

// Turnovers per player; hidden until at least one turnover has a player tagged.
function TurnoverList({ title, rows }: { title: string; rows: [string, number][] }) {
  if (rows.length === 0) return null;
  return (
    <Box>
      <Typography sx={{ ...sectionTitleSx, fontSize: 12, mb: 0.5 }}>{title}</Typography>
      {rows.map(([who, n]) => (
        <Stack key={who} direction="row" sx={{ justifyContent: "space-between", fontSize: 14, py: 0.25 }}>
          <span>{who}</span>
          <Box component="span" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{n}</Box>
        </Stack>
      ))}
    </Box>
  );
}

// Timeout / halftime view: the headline answers first, every number one tap away.
export function AnalysisPanel({ events, onDelete }: { events: LiveEvent[]; onDelete: (id: string) => void }) {
  const [periodFilter, setPeriodFilter] = useState<number | "all">("all");
  const periods = [...new Set(events.map((e) => e.period))].sort((a, b) => a - b);
  const filtered = periodFilter === "all" ? events : events.filter((e) => e.period === periodFilter);

  const off = asPossessions(filtered, "our_off");
  const def = asPossessions(filtered, "our_def");
  const offTotal = totals(off);
  const defTotal = totals(def);
  const offPlays = pppBy(off, playOf);
  const defActions = pppBy(def, actionOf);
  const offInsights = insights(offPlays, "our_off");
  const defInsights = insights(defActions, "our_def");
  const empty = "Not enough possessions yet.";
  const notes = filtered.filter((e) => e.category === GENERAL);
  const shots = off.filter((p) => !p.turnover && p.category !== TURNOVER_CATEGORY);
  const badShotsBy = pppBy(shots.filter((p) => p.bad_shot), (p) => p.actor ?? null).sort((a, b) => b.poss - a.poss);

  return (
    <Stack spacing={2.5}>
      <ToggleButtonGroup
        exclusive
        value={periodFilter}
        onChange={(_, v) => v !== null && setPeriodFilter(v)}
        color="primary"
        sx={{ "& .MuiToggleButton-root": { minWidth: 64, minHeight: 48, fontSize: 15, fontWeight: 700 } }}
      >
        <ToggleButton value="all">Whole game</ToggleButton>
        {periods.map((p) => (
          <ToggleButton key={p} value={p}>
            {periodLabel(p)}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography sx={{ ...sectionTitleSx, color: "primary.main", mb: 1 }}>Our offense</Typography>
              <Stack direction="row" spacing={4} sx={{ mb: 2.5 }}>
                <Kpi label="PPP" value={formatPpp(offTotal.ppp)} color={pppColor(offTotal.ppp, "our_off", offTotal.poss)} />
                <Kpi label="Pts" value={String(offTotal.pts)} />
                <Kpi label="Poss" value={String(offTotal.poss)} />
                <Kpi label="TO" value={String(offTotal.tov)} />
              </Stack>
              <Stack spacing={2}>
                <InsightList title="Keep calling" tone="good" rows={offInsights.best} side="our_off" empty={empty} />
                <InsightList title="Stop calling" tone="bad" rows={offInsights.worst} side="our_off" empty={empty} />
                <InsightList title="Completed vs broken plays" tone="neutral" rows={pppBy(off.filter((p) => p.category !== TURNOVER_CATEGORY), (p) => (p.broken ? "Broken" : "Completed"))} side="our_off" empty="No plays logged yet." />
                <InsightList title="Shot selection (good unless flagged bad)" tone="neutral" rows={pppBy(shots, (p) => (p.bad_shot ? "Bad shot" : "Good shot"))} side="our_off" empty="No shots logged yet." />
                <TurnoverList title="Bad shots by player" rows={badShotsBy.map((r) => [r.key, r.poss])} />
                <InsightList title="Our players (who finished)" tone="neutral" rows={pppBy(off, (p) => p.actor ?? null).sort((a, b) => b.pts - a.pts || b.poss - a.poss)} side="our_off" empty="Pick who finished each possession." />
                <TurnoverList title="Turnovers — committed by (ours)" rows={turnoversBy(off, (p) => p.tov_by)} />
                <TurnoverList title="Turnovers — forced by (theirs)" rows={turnoversBy(off, (p) => p.tov_forced_by)} />
                <InsightList title="Vs their defenses" tone="neutral" rows={pppBy(off, (p) => p.defense)} side="our_off" empty="Tag their defense to compare." />
                <InsightList title="Vs their PnR coverage" tone="neutral" rows={pppBy(off, (p) => p.coverage)} side="our_off" empty="Tag their coverage to compare." />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography sx={{ ...sectionTitleSx, color: "primary.main", mb: 1 }}>Our defense</Typography>
              <Stack direction="row" spacing={4} sx={{ mb: 2.5 }}>
                <Kpi label="PPP allowed" value={formatPpp(defTotal.ppp)} color={pppColor(defTotal.ppp, "our_def", defTotal.poss)} />
                <Kpi label="Pts" value={String(defTotal.pts)} />
                <Kpi label="Poss" value={String(defTotal.poss)} />
                <Kpi label="TO forced" value={String(defTotal.tov)} />
              </Stack>
              <Stack spacing={2}>
                <InsightList title="Hurting us" tone="bad" rows={defInsights.worst} side="our_def" empty={empty} />
                <InsightList title="We're stopping" tone="good" rows={defInsights.best} side="our_def" empty={empty} />
                <DefenseRules possessions={def} />
                <TurnoverList title="Turnovers — forced by (ours)" rows={turnoversBy(def, (p) => p.tov_forced_by)} />
                <TurnoverList title="Turnovers — committed by (theirs)" rows={turnoversBy(def, (p) => p.tov_by)} />
                <InsightList
                  title="Who's scoring on us"
                  tone="neutral"
                  rows={pppBy(def, (p) => p.player).sort((a, b) => b.pts - a.pts).slice(0, 4)}
                  side="our_def"
                  empty="Tag 'Who' to track their scorers."
                />
                <InsightList title="Our defenses" tone="neutral" rows={pppBy(def, (p) => p.defense)} side="our_def" empty="Tag our defense to compare." />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography sx={{ ...sectionTitleSx, color: "primary.main", mb: 1 }}>Player ranking</Typography>
          <RankingTable rows={playerRanking(filtered)} />
        </CardContent>
      </Card>

      {notes.length > 0 && (
        <Card>
          <CardContent>
            <Typography sx={{ ...sectionTitleSx, fontSize: 12, mb: 1 }}>Notes</Typography>
            <Stack spacing={1}>
              {notes.map((n) => (
                <Typography key={n.id} sx={{ fontSize: 14, whiteSpace: "pre-line" }}>
                  <Box component="span" sx={{ color: "text.secondary", mr: 1 }}>{periodLabel(n.period)}</Box>
                  {n.note}
                </Typography>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      <Box>
        <Accordion disableGutters sx={accordionSx}>
          <AccordionSummary sx={{ minHeight: 56 }}>
            <Typography sx={sectionTitleSx}>All numbers</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Stack spacing={3}>
                  <StatsTable title="Our plays" rows={offPlays} side="our_off" />
                  <Matrix title="Our plays × their defense (PPP)" possessions={off} side="our_off" rowKey={playOf} />
                  <StatsTable title="Targets we attacked" rows={pppBy(off, (p) => p.player)} side="our_off" />
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Stack spacing={3}>
                  <StatsTable title="Their actions" rows={defActions} side="our_def" />
                  <Matrix title="Their actions × our defense (PPP allowed)" possessions={def} side="our_def" rowKey={actionOf} />
                  <StatsTable title="Their players" rows={pppBy(def, (p) => p.player)} side="our_def" />
                </Stack>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      </Box>

      <Box>
        <Accordion disableGutters sx={accordionSx}>
          <AccordionSummary sx={{ minHeight: 56 }}>
            <Typography sx={sectionTitleSx}>Every possession ({filtered.length})</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={0.5}>
              {filtered.length === 0 && <Typography sx={{ color: "text.disabled" }}>Nothing logged yet.</Typography>}
              {[...filtered].reverse().map((e) => (
                <Stack
                  key={e.id}
                  direction="row"
                  sx={{ justifyContent: "space-between", alignItems: "center", gap: 1, borderTop: "1px solid rgba(255,255,255,0.09)", py: 0.75 }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                      <Box component="span" sx={{ color: "text.secondary", mr: 1 }}>
                        {periodLabel(e.period)}
                      </Box>
                      {eventLabel(e)}
                      <Box component="span" sx={{ color: "text.secondary" }}>
                        {e.defense ? ` vs ${e.defense}` : ""}
                        {e.coverage ? ` · ${e.coverage}` : ""}
                        {e.player ? ` · ${e.player}` : ""}
                        {e.rules ? ` · ${Object.values(e.rules).join(", ")}` : ""}
                        {e.kind === "our_off" && e.actor && !e.turnover ? ` · ${e.actor}` : ""}
                        {e.broken ? " · broken" : ""}
                        {e.bad_shot ? " · bad shot" : ""}
                        {e.tov_by ? ` · TO ${e.tov_by}` : ""}
                        {e.tov_forced_by ? ` · forced by ${e.tov_forced_by}` : ""}
                      </Box>
                      <Box component="span" sx={{ ml: 1 }}>{eventResult(e)}</Box>
                    </Typography>
                    {e.note && <Typography sx={{ fontSize: 13, color: "text.secondary", whiteSpace: "pre-line" }}>{e.note}</Typography>}
                  </Box>
                  <Button size="small" color="error" sx={{ minHeight: 40 }} disabled={e.id.startsWith("temp-")} onClick={() => onDelete(e.id)}>
                    Delete
                  </Button>
                </Stack>
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>
      </Box>
    </Stack>
  );
}
