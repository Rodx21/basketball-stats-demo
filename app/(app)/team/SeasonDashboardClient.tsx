"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  ThemeProvider,
  Typography,
} from "@mui/material";
import { insights, playKey, pppBy, totals } from "@/lib/liveScouting";
import { DefenseRules, InsightList, Kpi, Matrix, StatsTable, accordionSx } from "@/components/live/insights";
import { asPossessions, formatPpp, pppColor, sectionTitleSx, theme, type LiveEvent } from "@/components/live/shared";

export interface TrackedGame {
  id: string;
  date: string;
  opponent: string;
  home: boolean;
}

type GameEvent = LiveEvent & { game_id: string };

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IE", { day: "numeric", month: "short" });
}

function signed(n: number) {
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}`;
}

export function SeasonDashboardClient({ seasonName, games, events }: { seasonName: string; games: TrackedGame[]; events: GameEvent[] }) {
  const [gameFilter, setGameFilter] = useState<string | "all">("all");
  const filtered = gameFilter === "all" ? events : events.filter((e) => e.game_id === gameFilter);

  const off = asPossessions(filtered, "our_off");
  const def = asPossessions(filtered, "our_def");
  const offTotal = totals(off);
  const defTotal = totals(def);
  const net = offTotal.ppp - defTotal.ppp;
  const offPlays = pppBy(off, playKey);
  const defActions = pppBy(def, (p) => p.option);
  const offInsights = insights(offPlays, "our_off", 4);
  const defInsights = insights(defActions, "our_def", 4);
  const empty = "Not enough possessions yet.";

  const perGame = games.map((g) => {
    const ev = events.filter((e) => e.game_id === g.id);
    const o = totals(asPossessions(ev, "our_off"));
    const d = totals(asPossessions(ev, "our_def"));
    return { game: g, off: o, def: d, net: o.ppp - d.ppp };
  });

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ color: "text.primary", pb: 8 }}>
        <Box sx={{ borderBottom: "1px solid rgba(255,255,255,0.13)", pt: 5, pb: 4, mb: 3 }}>
          <Typography sx={{ fontFamily: "var(--font-cormorant)", fontStyle: "italic", fontSize: 22, color: "text.secondary", mb: 1 }}>
            {seasonName} · from live tracking
          </Typography>
          <Typography sx={{ fontSize: { xs: 44, md: 72 }, fontWeight: 700, textTransform: "uppercase", lineHeight: 0.95, letterSpacing: "0.03em" }}>
            Dashboard
          </Typography>
        </Box>

        {games.length === 0 ? (
          <Card>
            <CardContent sx={{ py: 5, textAlign: "center" }}>
              <Typography sx={{ fontSize: 18, fontWeight: 700, mb: 1 }}>No live tracking yet</Typography>
              <Typography sx={{ color: "text.secondary", mb: 3 }}>
                Open a game and log possessions in the live scout report — the season picture builds up here.
              </Typography>
              <Button component={Link} href="/games" variant="contained" sx={{ minHeight: 48, fontWeight: 800 }}>
                Go to games
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={3}>
            {/* Game filter */}
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              <Chip
                label={`All games (${games.length})`}
                color={gameFilter === "all" ? "primary" : "default"}
                variant={gameFilter === "all" ? "filled" : "outlined"}
                onClick={() => setGameFilter("all")}
                sx={{ height: 42, fontSize: 14, fontWeight: 700 }}
              />
              {games.map((g) => (
                <Chip
                  key={g.id}
                  label={`${shortDate(g.date)} ${g.home ? "vs" : "@"} ${g.opponent}`}
                  color={gameFilter === g.id ? "primary" : "default"}
                  variant={gameFilter === g.id ? "filled" : "outlined"}
                  onClick={() => setGameFilter(g.id)}
                  sx={{ height: 42, fontSize: 14 }}
                />
              ))}
            </Box>

            {/* Headline numbers */}
            <Card>
              <CardContent>
                <Stack direction="row" sx={{ flexWrap: "wrap", gap: { xs: 3, md: 6 } }}>
                  <Kpi label="Offense PPP" value={formatPpp(offTotal.ppp)} color={pppColor(offTotal.ppp, "our_off", offTotal.poss)} />
                  <Kpi label="Defense PPP allowed" value={formatPpp(defTotal.ppp)} color={pppColor(defTotal.ppp, "our_def", defTotal.poss)} />
                  <Kpi label="Net PPP" value={signed(net)} color={net > 0 ? "success.main" : net < 0 ? "error.main" : undefined} />
                  <Kpi label="Our poss" value={String(offTotal.poss)} />
                  <Kpi label="Their poss" value={String(defTotal.poss)} />
                  <Kpi label="TO / TO forced" value={`${offTotal.tov} / ${defTotal.tov}`} />
                </Stack>
              </CardContent>
            </Card>

            {/* Game by game */}
            {gameFilter === "all" && (
              <Card>
                <CardContent>
                  <Typography sx={{ ...sectionTitleSx, mb: 1 }}>Game by game</Typography>
                  <Box sx={{ overflowX: "auto" }}>
                    <Box
                      component="table"
                      sx={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: 14,
                        fontVariantNumeric: "tabular-nums",
                        "& td, & th": { py: 1, px: 1, textAlign: "right", whiteSpace: "nowrap" },
                        "& td:first-of-type, & th:first-of-type, & td:nth-of-type(2), & th:nth-of-type(2)": { textAlign: "left" },
                        "& thead tr": { color: "text.secondary", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" },
                        "& tbody tr": { borderTop: "1px solid rgba(255,255,255,0.09)" },
                      }}
                    >
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Opponent</th>
                          <th>Logged pts</th>
                          <th>Off PPP</th>
                          <th>Def PPP</th>
                          <th>Net</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {perGame.map(({ game, off: o, def: d, net: n }) => (
                          <tr key={game.id}>
                            <td>{shortDate(game.date)}</td>
                            <td>
                              {game.home ? "vs" : "@"} {game.opponent}
                            </td>
                            <td>
                              {o.pts}–{d.pts}
                            </td>
                            <Box component="td" sx={{ fontWeight: 800, color: pppColor(o.ppp, "our_off", o.poss) }}>
                              {formatPpp(o.ppp)}
                            </Box>
                            <Box component="td" sx={{ fontWeight: 800, color: pppColor(d.ppp, "our_def", d.poss) }}>
                              {formatPpp(d.ppp)}
                            </Box>
                            <Box component="td" sx={{ fontWeight: 800, color: n > 0 ? "success.main" : n < 0 ? "error.main" : "text.primary" }}>
                              {signed(n)}
                            </Box>
                            <td>
                              <Button component={Link} href={`/games/${game.id}/live`} size="small" color="inherit" sx={{ opacity: 0.7 }}>
                                Open →
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Offense / defense insights */}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ height: "100%" }}>
                  <CardContent>
                    <Typography sx={{ ...sectionTitleSx, color: "primary.main", mb: 2 }}>Our offense</Typography>
                    <Stack spacing={2.25}>
                      <InsightList title="Our best plays" tone="good" rows={offInsights.best} side="our_off" empty={empty} />
                      <InsightList title="Our worst plays" tone="bad" rows={offInsights.worst} side="our_off" empty={empty} />
                      <InsightList title="Vs their defenses" tone="neutral" rows={pppBy(off, (p) => p.defense)} side="our_off" empty="Tag their defense in live to compare." />
                      <InsightList title="Vs their PnR coverage" tone="neutral" rows={pppBy(off, (p) => p.coverage)} side="our_off" empty="Tag their coverage in live to compare." />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ height: "100%" }}>
                  <CardContent>
                    <Typography sx={{ ...sectionTitleSx, color: "primary.main", mb: 2 }}>Our defense</Typography>
                    <Stack spacing={2.25}>
                      <InsightList title="What hurts us most" tone="bad" rows={defInsights.worst} side="our_def" empty={empty} />
                      <InsightList title="What we stop best" tone="good" rows={defInsights.best} side="our_def" empty={empty} />
                      <DefenseRules possessions={def} />
                      <InsightList title="Our defenses" tone="neutral" rows={pppBy(def, (p) => p.defense)} side="our_def" empty="Tag our defense in live to compare." />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

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
                        <Matrix title="Our plays × their defense (PPP)" possessions={off} side="our_off" rowKey={playKey} />
                        <StatsTable title="Targets we attacked" rows={pppBy(off, (p) => p.player)} side="our_off" />
                      </Stack>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Stack spacing={3}>
                        <StatsTable title="Their actions" rows={defActions} side="our_def" />
                        <Matrix title="Their actions × our defense (PPP allowed)" possessions={def} side="our_def" rowKey={(p) => p.option} />
                        <StatsTable title="Their players" rows={pppBy(def, (p) => p.player)} side="our_def" />
                      </Stack>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Box>
          </Stack>
        )}
      </Box>
    </ThemeProvider>
  );
}
