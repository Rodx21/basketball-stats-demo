"use client";

import { useState } from "react";
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { substitute, type Lineups, type TeamSide } from "@/lib/liveScouting";

const LABEL_SX = { fontSize: 12, fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.1em", mb: 0.75 } as const;

// Starters (pick 5) and substitutions (tap who goes out, who comes in) for either team.
// Saving logs a lineup event, so both iPads follow the same five.
export function LineupDialog({
  open,
  onClose,
  rosters,
  lineups,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  rosters: Record<TeamSide, string[]>;
  lineups: Lineups;
  onSave: (team: TeamSide, five: string[], starters: boolean, note: string) => void;
}) {
  const [team, setTeam] = useState<TeamSide>("ours");
  // Starters mode when the team has no five yet, or when re-picking all five.
  const [repick, setRepick] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [outs, setOuts] = useState<string[]>([]);
  const [ins, setIns] = useState<string[]>([]);

  const onCourt = lineups[team];
  const roster = rosters[team];
  const starters = repick || onCourt.length === 0;
  const bench = roster.filter((p) => !onCourt.includes(p));

  function reset() {
    setRepick(false);
    setPicked([]);
    setOuts([]);
    setIns([]);
  }

  function close() {
    reset();
    onClose();
  }

  function switchTeam(t: TeamSide) {
    setTeam(t);
    reset();
  }

  const toggle = (list: string[], set: (v: string[]) => void, p: string, max = Infinity) =>
    set(list.includes(p) ? list.filter((x) => x !== p) : list.length < max ? [...list, p] : list);

  function save() {
    if (starters) onSave(team, picked, true, `Starters: ${picked.join(", ")}`);
    else onSave(team, substitute(onCourt, outs, ins), false, `In: ${ins.join(", ")} · Out: ${outs.join(", ")}`);
    reset();
  }

  const canSave = starters ? picked.length === 5 : outs.length > 0 && outs.length === ins.length;

  const chip = (p: string, selected: boolean, onClick: () => void, color: "primary" | "error" | "success" = "primary") => (
    <Chip key={p} label={p} color={selected ? color : "default"} variant={selected ? "filled" : "outlined"} onClick={onClick} sx={{ height: 48, fontSize: 15 }} />
  );

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800 }}>{starters ? "Starters" : "Substitution"}</DialogTitle>
      <DialogContent>
        <ToggleButtonGroup
          exclusive
          fullWidth
          value={team}
          onChange={(_, v) => v && switchTeam(v)}
          color="primary"
          sx={{ mb: 2.5, "& .MuiToggleButton-root": { minHeight: 52, fontSize: 16, fontWeight: 800 } }}
        >
          <ToggleButton value="ours">Us {lineups.ours.length === 0 ? "· no five" : ""}</ToggleButton>
          <ToggleButton value="theirs">Them {lineups.theirs.length === 0 ? "· no five" : ""}</ToggleButton>
        </ToggleButtonGroup>

        {roster.length === 0 && <Typography sx={{ color: "warning.main", mb: 2 }}>No players on this roster yet — add them in Roster.</Typography>}

        {starters ? (
          <>
            <Typography sx={LABEL_SX}>Pick the five on the floor ({picked.length}/5)</Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>{roster.map((p) => chip(p, picked.includes(p), () => toggle(picked, setPicked, p, 5)))}</Box>
          </>
        ) : (
          <Stack spacing={2.5}>
            <Box>
              <Typography sx={LABEL_SX}>Out — on the floor</Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>{onCourt.map((p) => chip(p, outs.includes(p), () => toggle(outs, setOuts, p), "error"))}</Box>
            </Box>
            <Box>
              <Typography sx={LABEL_SX}>In — bench</Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>{bench.map((p) => chip(p, ins.includes(p), () => toggle(ins, setIns, p), "success"))}</Box>
            </Box>
            <Typography sx={{ fontSize: 13, color: outs.length === ins.length ? "text.secondary" : "warning.main" }}>
              {outs.length} out · {ins.length} in{outs.length !== ins.length ? " — must match" : ""}
            </Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, justifyContent: "space-between" }}>
        <Button color="inherit" sx={{ minHeight: 52, opacity: 0.7 }} onClick={() => (starters && onCourt.length > 0 ? reset() : setRepick(true))} disabled={onCourt.length === 0}>
          {starters && onCourt.length > 0 ? "← Substitution" : "Re-pick all 5"}
        </Button>
        <Stack direction="row" spacing={1}>
          <Button color="inherit" sx={{ minHeight: 52 }} onClick={close}>
            Cancel
          </Button>
          <Button variant="contained" sx={{ minHeight: 52, px: 3, fontWeight: 800 }} disabled={!canSave} onClick={save}>
            {starters ? "Save five" : "Save sub"}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
