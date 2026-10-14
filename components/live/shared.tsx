"use client";

import { createTheme } from "@mui/material";
import type { Possession } from "@/lib/liveScouting";

export type Outcome = "good" | "bad" | null;
export type EventKind = "scout" | "our_off" | "our_def" | "lineup" | "rule" | "grade";

export interface LiveEvent {
  id: string;
  kind: EventKind;
  category: string;
  option: string;
  outcome: Outcome;
  points: number | null;
  turnover: boolean;
  defense: string | null;
  player: string | null;
  coverage: string | null;
  rules: Record<string, string> | null;
  tov_by: string | null;
  tov_forced_by: string | null;
  actor: string | null;
  broken: boolean;
  bad_shot: boolean;
  on_court_ours: string[] | null;
  on_court_theirs: string[] | null;
  penalty: number | null;
  score: number | null;
  period: number;
  note: string | null;
  created_at: string | null;
}

export type NewEvent = Omit<LiveEvent, "id" | "created_at" | "period">;

// A new event with every optional field empty; callers fill in what they know.
export function blankEvent(kind: EventKind, category: string, option: string, extra: Partial<NewEvent> = {}): NewEvent {
  return {
    kind,
    category,
    option,
    outcome: null,
    points: null,
    turnover: false,
    defense: null,
    player: null,
    coverage: null,
    rules: null,
    tov_by: null,
    tov_forced_by: null,
    actor: null,
    broken: false,
    bad_shot: false,
    on_court_ours: null,
    on_court_theirs: null,
    penalty: null,
    score: null,
    note: null,
    ...extra,
  };
}

export const GENERAL = "general";

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#f2b705", contrastText: "#111" },
    success: { main: "#3ecf8e" },
    error: { main: "#ff5a5a" },
    background: { default: "#05070d", paper: "#0b1020" },
  },
  shape: { borderRadius: 14 },
  typography: { fontFamily: "var(--font-inter), Arial, Helvetica, sans-serif", button: { textTransform: "none" } },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiCard: { styleOverrides: { root: { border: "1px solid rgba(255,255,255,0.13)", backgroundImage: "none" } } },
  },
});

export const sectionTitleSx = { fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" } as const;

export function asPossessions(events: LiveEvent[], kind: "our_off" | "our_def"): Possession[] {
  return events.filter((e) => e.kind === kind);
}

export function formatPpp(ppp: number): string {
  return ppp.toFixed(2);
}

// Colour for a PPP value from our perspective: high is good on offense, bad on defense.
export function pppColor(ppp: number, side: "our_off" | "our_def", poss: number): string {
  if (poss < 2) return "text.primary";
  const good = side === "our_off" ? ppp >= 1.0 : ppp <= 0.8;
  const bad = side === "our_off" ? ppp < 0.7 : ppp >= 1.1;
  return good ? "success.main" : bad ? "error.main" : "text.primary";
}
