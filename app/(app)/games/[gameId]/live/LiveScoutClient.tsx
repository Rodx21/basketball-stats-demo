"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Snackbar,
  Stack,
  TextField,
  ThemeProvider,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { createClient } from "@/lib/supabase/client";
import {
  EVENT_SELECT,
  OUR_DEFENSE_RULES,
  PNR_COVERAGES,
  TURNOVER_CATEGORY,
  currentLineups,
  groupOptions,
  periodLabel,
  playKey,
  totals,
  type AccountabilityRule,
  type GradeAction,
  type OptionRow,
  type TeamSide,
} from "@/lib/liveScouting";
import { AnalysisPanel } from "./AnalysisPanel";
import { InsightsRail } from "./InsightsRail";
import { LineupDialog } from "./LineupDialog";
import { PossessionPanel } from "./PossessionPanel";
import { GradeDialog } from "./GradeDialog";
import { GENERAL, asPossessions, blankEvent, formatPpp, theme, type LiveEvent, type NewEvent } from "@/components/live/shared";

type Side = "our_off" | "our_def";
// Which possessions this device logs: one coach on offense, the other on defense, or one coach doing both.
type Role = "both" | "offense" | "defense";

const ROLE_KEY = "live-role";
const ROLE_LABEL: Record<Role, string> = { both: "Both", offense: "Offense", defense: "Defense" };

const SELECT = EVENT_SELECT;
const RULE_SELECT = "id, label, points, sort_order";

const SIDE_COLOR: Record<Side, string> = { our_off: "#f2b705", our_def: "#5b8cff" };

function lastPossessionText(e: LiveEvent | undefined): string | null {
  if (e?.kind === "lineup") return `${e.category === "ours" ? "Our" : "Their"} ${e.option === "Starters" ? "starters set" : `sub — ${e.note ?? ""}`}`;
  if (e?.kind === "rule") return `Rule broken: ${e.option} — ${e.actor} −${e.penalty ?? 0}`;
  if (e?.kind === "grade") return `${e.option} — ${e.actor} ${(e.score ?? 0) > 0 ? "+" : ""}${e.score ?? 0}`;
  if (!e || (e.kind !== "our_off" && e.kind !== "our_def")) return null;
  const who = e.kind === "our_off" ? `Our ${playKey(e)}` : `Their ${e.option}`;
  if (e.category === TURNOVER_CATEGORY) return `${e.kind === "our_off" ? "Our" : "Their"} turnover${e.tov_by ? ` (${e.tov_by})` : ""}`;
  return `${who} → ${e.turnover ? "turnover" : e.points ? `${e.points} pts` : "miss"}`;
}

function lastDefense(events: LiveEvent[], kind: Side): string | null {
  return [...events].reverse().find((e) => e.kind === kind && e.defense)?.defense ?? null;
}

export function LiveScoutClient({
  gameId,
  opponent,
  subtitle,
  expected,
  opponentPlayers,
  ourPlayers,
  initialEvents,
  initialOptions,
  initialRules,
}: {
  gameId: string;
  opponent: { id: string; name: string };
  subtitle: string;
  expected: Record<string, string>;
  opponentPlayers: string[];
  ourPlayers: string[];
  initialEvents: LiveEvent[];
  initialOptions: OptionRow[];
  initialRules: AccountabilityRule[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [events, setEvents] = useState<LiveEvent[]>(initialEvents);
  const [period, setPeriod] = useState(() => initialEvents.reduce((max, e) => Math.max(max, e.period), 1));
  // Possessions alternate, so the screen follows the ball: after each result it flips sides.
  const [side, setSide] = useState<Side>(() => {
    const lastPoss = [...initialEvents].reverse().find((e) => e.kind === "our_off" || e.kind === "our_def");
    return lastPoss?.kind === "our_off" ? "our_def" : "our_off";
  });
  const [view, setView] = useState<"game" | "timeout">("game");
  // Defense on the floor is sticky between possessions — it rarely changes every trip.
  // On reload, pick up whatever was on the floor for the last logged possession.
  const [theirDefense, setTheirDefense] = useState<string | null>(() => lastDefense(initialEvents, "our_off"));
  const [ourDefense, setOurDefense] = useState<string | null>(() => lastDefense(initialEvents, "our_def"));
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<OptionRow[]>(initialOptions);
  const [role, setRole] = useState<Role>("both");
  const [rules, setRules] = useState<AccountabilityRule[]>(initialRules);
  const [lineupOpen, setLineupOpen] = useState(false);
  const [gradeOpen, setGradeOpen] = useState(false);
  const lineups = useMemo(() => currentLineups(events), [events]);
  const needsStarters = lineups.ours.length === 0 || lineups.theirs.length === 0;
  // Ids this device logged, so Undo never removes the other coach's possession.
  const mine = useRef(new Set<string>());

  // Role is per device (each coach's iPad remembers its own).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ROLE_KEY) as Role | null;
      if (saved && saved in ROLE_LABEL) chooseRole(saved);
    } catch {
      // storage unavailable — stay on "both"
    }
  }, []);

  function chooseRole(r: Role) {
    setRole(r);
    if (r === "offense") setSide("our_off");
    if (r === "defense") setSide("our_def");
    try {
      localStorage.setItem(ROLE_KEY, r);
    } catch {
      // ignore
    }
  }

  // The other coach's possessions arrive live.
  useEffect(() => {
    const channel = supabase
      .channel(`live-${gameId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_scout_events", filter: `game_id=eq.${gameId}` },
        (payload) => {
          const row = payload.new as LiveEvent;
          setEvents((prev) => (prev.some((e) => e.id === row.id) ? prev : [...prev, row]));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "live_scout_events", filter: `game_id=eq.${gameId}` },
        (payload) => {
          const id = (payload.old as { id?: string }).id;
          if (id) setEvents((prev) => prev.filter((e) => e.id !== id));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, gameId]);

  async function addOption(row: Omit<OptionRow, "id">) {
    const { data, error: insertError } = await supabase
      .from("live_options")
      .insert(row)
      .select("id, list, group_key, group_label, label, sort_order")
      .single();
    if (insertError || !data) {
      setError("Could not add the card — try again.");
      return;
    }
    setOptions((prev) => [...prev, data as OptionRow]);
  }

  async function removeOption(row: OptionRow) {
    setOptions((prev) => prev.filter((o) => o.id !== row.id));
    const { error: deleteError } = await supabase.from("live_options").delete().eq("id", row.id);
    if (deleteError) {
      setOptions((prev) => [...prev, row]);
      setError("Could not remove the card — try again.");
    }
  }

  const optionProps = { options, onAddOption: addOption, onRemoveOption: removeOption };

  async function log(event: NewEvent) {
    // Every event remembers who was on the floor; lineup events carry their own five.
    const e = event.kind === "lineup" ? event : { ...event, on_court_ours: lineups.ours, on_court_theirs: lineups.theirs };
    const tempId = `temp-${Date.now()}`;
    mine.current.add(tempId);
    setEvents((prev) => [...prev, { ...e, id: tempId, period, created_at: new Date().toISOString() }]);
    // Only a coach doing both sides follows the ball to the other end.
    if (role === "both" && e.kind === "our_off") setSide("our_def");
    if (role === "both" && e.kind === "our_def") setSide("our_off");

    const { data, error: insertError } = await supabase
      .from("live_scout_events")
      .insert({ ...e, game_id: gameId, period })
      .select(SELECT)
      .single();

    if (insertError || !data) {
      setEvents((prev) => prev.filter((x) => x.id !== tempId));
      setError("Not saved — check the connection and log it again.");
      return;
    }
    mine.current.add(data.id);
    // Realtime may have delivered the same row already; keep a single copy.
    setEvents((prev) =>
      prev.some((x) => x.id === data.id) ? prev.filter((x) => x.id !== tempId) : prev.map((x) => (x.id === tempId ? (data as LiveEvent) : x))
    );
  }

  async function remove(id: string) {
    const removed = events.find((e) => e.id === id);
    if (!removed || id.startsWith("temp-")) return;
    setEvents((prev) => prev.filter((e) => e.id !== id));
    const { error: deleteError } = await supabase.from("live_scout_events").delete().eq("id", id);
    if (deleteError) {
      setEvents((prev) => [...prev, removed].sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? "")));
      setError("Could not delete — try again.");
      return;
    }
    // Undoing a possession puts the ball back with the side that had it.
    if (role === "both" && (removed.kind === "our_off" || removed.kind === "our_def")) setSide(removed.kind);
  }

  function saveNote() {
    log(blankEvent("scout", GENERAL, "Note", { note: note.trim() }));
    setNote("");
    setNoteOpen(false);
  }

  function saveLineup(team: TeamSide, five: string[], starters: boolean, text: string) {
    log(
      blankEvent("lineup", team, starters ? "Starters" : "Sub", {
        note: text,
        on_court_ours: team === "ours" ? five : lineups.ours,
        on_court_theirs: team === "theirs" ? five : lineups.theirs,
      })
    );
    setLineupOpen(false);
  }

  function logRule(rule: AccountabilityRule, player: string) {
    log(blankEvent("rule", "rule", rule.label, { actor: player, penalty: rule.points }));
  }

  function logGrade(action: GradeAction, player: string) {
    log(blankEvent("grade", action.type, action.label, { actor: player, score: action.score }));
  }

  async function addRule(label: string, points: number) {
    const { data, error: insertError } = await supabase
      .from("accountability_rules")
      .insert({ game_id: gameId, label, points, sort_order: rules.length })
      .select(RULE_SELECT)
      .single();
    if (insertError || !data) {
      setError("Could not add the rule — try again.");
      return;
    }
    setRules((prev) => [...prev, data as AccountabilityRule]);
  }

  async function removeRule(rule: AccountabilityRule) {
    setRules((prev) => prev.filter((r) => r.id !== rule.id));
    const { error: deleteError } = await supabase.from("accountability_rules").delete().eq("id", rule.id);
    if (deleteError) {
      setRules((prev) => [...prev, rule].sort((a, b) => a.sort_order - b.sort_order));
      setError("Could not remove the rule — try again.");
    }
  }

  const last = events[events.length - 1];
  const lastMine = [...events].reverse().find((e) => mine.current.has(e.id));
  const off = totals(asPossessions(events, "our_off"));
  const def = totals(asPossessions(events, "our_def"));
  const lastText = lastPossessionText(last);

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ pb: 10, color: "text.primary" }}>
        {/* Sticky game bar */}
        <Box sx={{ position: "sticky", top: 81, zIndex: 10, bgcolor: "background.default", borderBottom: "1px solid rgba(255,255,255,0.13)", pt: 1.5, pb: 1.5, mb: 2.5 }}>
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 12, color: "text.secondary" }} noWrap>
                {subtitle}
              </Typography>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "baseline" }}>
                <Typography sx={{ fontSize: 22, fontWeight: 800, textTransform: "uppercase" }} noWrap>
                  vs {opponent.name}
                </Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                  {off.pts}–{def.pts}
                </Typography>
                <Typography sx={{ fontSize: 12, color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                  PPP {formatPpp(off.ppp)} / {formatPpp(def.ppp)}
                </Typography>
              </Stack>
            </Box>

            <ToggleButtonGroup
              exclusive
              value={period}
              onChange={(_, v) => v && setPeriod(v)}
              color="primary"
              sx={{ "& .MuiToggleButton-root": { minWidth: 56, minHeight: 50, fontSize: 16, fontWeight: 700 } }}
            >
              {[1, 2, 3, 4, 5].map((p) => (
                <ToggleButton key={p} value={p}>
                  {periodLabel(p)}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            <Stack direction="row" spacing={1}>
              <Button variant="outlined" color="inherit" sx={{ minHeight: 50 }} onClick={() => setNoteOpen(true)}>
                Note
              </Button>
              <Button
                variant="outlined"
                color="error"
                sx={{ minHeight: 50 }}
                disabled={!lastMine || lastMine.id.startsWith("temp-")}
                onClick={() => lastMine && remove(lastMine.id)}
              >
                Undo mine
              </Button>
              <Button variant="contained" sx={{ minHeight: 50, fontWeight: 800, px: 2.5 }} onClick={() => setView(view === "game" ? "timeout" : "game")}>
                {view === "game" ? "Timeout view" : "Back to game"}
              </Button>
            </Stack>
          </Stack>

          {view === "game" && (
            <Stack direction="row" sx={{ mt: 1.25, alignItems: "center", gap: 1 }}>
              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>This iPad logs:</Typography>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={role}
                onChange={(_, v) => v && chooseRole(v)}
                color="primary"
                sx={{ "& .MuiToggleButton-root": { minHeight: 38, px: 2, fontWeight: 700 } }}
              >
                {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                  <ToggleButton key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Stack>
          )}

          {view === "game" && (
            <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
              {(["our_off", "our_def"] as const)
                .filter((s) => role === "both" || (role === "offense" ? s === "our_off" : s === "our_def"))
                .map((s) => {
                const active = side === s;
                return (
                  <ButtonBase
                    key={s}
                    onClick={() => role === "both" && setSide(s)}
                    sx={{
                      flex: 1,
                      minHeight: 64,
                      borderRadius: "14px",
                      border: "2px solid",
                      borderColor: active ? SIDE_COLOR[s] : "rgba(255,255,255,0.15)",
                      bgcolor: active ? SIDE_COLOR[s] : "transparent",
                      color: active ? "#111" : "text.secondary",
                      fontSize: 20,
                      fontWeight: 900,
                      letterSpacing: "0.08em",
                    }}
                  >
                    <Stack sx={{ alignItems: "center" }}>
                      {s === "our_off" ? "WE ATTACK" : "THEY ATTACK"}
                      <Box component="span" sx={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", opacity: 0.8 }}>
                        {s === "our_off" ? `vs their ${theirDefense ?? "— no defense set"}` : `our ${ourDefense ?? "— no defense set"}`}
                      </Box>
                    </Stack>
                  </ButtonBase>
                );
              })}
            </Stack>
          )}
          {view === "game" && (
            <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: "center" }}>
              <Button
                variant={needsStarters ? "contained" : "outlined"}
                color={needsStarters ? "warning" : "inherit"}
                sx={{ minHeight: 52, fontSize: 16, fontWeight: 800, px: 2.5, flexShrink: 0 }}
                onClick={() => setLineupOpen(true)}
              >
                {needsStarters ? "Set starters" : "⇄ Substitution"}
              </Button>
              <Button variant="outlined" color="error" sx={{ minHeight: 52, fontSize: 16, fontWeight: 800, px: 2.5, flexShrink: 0 }} onClick={() => setGradeOpen(true)}>
                Player +/−
              </Button>
              <Box sx={{ minWidth: 0, fontSize: 12, color: "text.secondary", lineHeight: 1.4 }}>
                <div>Us: {lineups.ours.length ? lineups.ours.join(" · ") : "—"}</div>
                <div>Them: {lineups.theirs.length ? lineups.theirs.join(" · ") : "—"}</div>
              </Box>
            </Stack>
          )}
          {view === "game" && lastText && (
            <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.75 }}>
              Last: {lastText} · {periodLabel(last.period)}
            </Typography>
          )}
        </Box>

        {view === "game" ? (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 7.5 }}>
              {side === "our_off" ? (
                <PossessionPanel
                  key="our_off"
                  side="our_off"
                  groups={groupOptions(options, "our_plays")}
                  defenseItems={groupOptions(options, "their_defenses")[0]?.items ?? []}
                  playList="our_plays"
                  defenseList="their_defenses"
                  {...optionProps}
                  defense={theirDefense}
                  onDefenseChange={setTheirDefense}
                  players={opponentPlayers}
                  ourPlayers={ourPlayers}
                  lineups={lineups}
                  coverages={PNR_COVERAGES}
                  events={events}
                  period={period}
                  onLog={log}
                />
              ) : (
                <PossessionPanel
                  key="our_def"
                  side="our_def"
                  groups={groupOptions(options, "their_actions")}
                  defenseItems={groupOptions(options, "our_defenses")[0]?.items ?? []}
                  playList="their_actions"
                  defenseList="our_defenses"
                  {...optionProps}
                  defense={ourDefense}
                  onDefenseChange={setOurDefense}
                  players={opponentPlayers}
                  ourPlayers={ourPlayers}
                  lineups={lineups}
                  rules={OUR_DEFENSE_RULES}
                  events={events}
                  period={period}
                  onLog={log}
                />
              )}
            </Grid>
            <Grid size={{ xs: 12, md: 4.5 }}>
              <InsightsRail side={side} events={events} defense={side === "our_off" ? theirDefense : ourDefense} expected={expected} />
              <Button component={Link} href={`/scouting/${opponent.id}`} color="inherit" sx={{ mt: 1.5, opacity: 0.6 }}>
                Edit pre-game scout →
              </Button>
            </Grid>
          </Grid>
        ) : (
          <AnalysisPanel events={events} onDelete={remove} />
        )}
      </Box>

      <Dialog open={noteOpen} onClose={() => setNoteOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          Note
          <Typography sx={{ fontSize: 13, color: "text.secondary" }}>{periodLabel(period)} · shows in the timeout view</Typography>
        </DialogTitle>
        <DialogContent>
          <TextField fullWidth multiline minRows={4} autoFocus placeholder="Adjustment, matchup, what to say at the timeout..." value={note} onChange={(e) => setNote(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button color="inherit" sx={{ minHeight: 52 }} onClick={() => setNoteOpen(false)}>
            Cancel
          </Button>
          <Button variant="contained" sx={{ minHeight: 52, px: 3 }} disabled={!note.trim()} onClick={saveNote}>
            Save note
          </Button>
        </DialogActions>
      </Dialog>

      <LineupDialog open={lineupOpen} onClose={() => setLineupOpen(false)} rosters={{ ours: ourPlayers, theirs: opponentPlayers }} lineups={lineups} onSave={saveLineup} />
      <GradeDialog
        open={gradeOpen}
        onClose={() => setGradeOpen(false)}
        rules={rules}
        roster={ourPlayers}
        onCourt={lineups.ours}
        onRule={logRule}
        onGrade={logGrade}
        onAddRule={addRule}
        onRemoveRule={removeRule}
      />

      <Snackbar open={error !== null} autoHideDuration={5000} onClose={() => setError(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity="error" variant="filled" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}
