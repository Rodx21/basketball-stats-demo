"use client";

import { useState, type ReactNode } from "react";
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { PlayerPicker } from "@/components/live/PlayerPicker";
import { GRADE_ACTIONS, type AccountabilityRule, type GradeAction } from "@/lib/liveScouting";

const LABEL_SX = { fontSize: 12, fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.1em", mb: 0.75 } as const;
const ACTION_SX = { height: 52, fontSize: 15, fontWeight: 700 } as const;

// Player +/−: pick our player, then tap what he did — it saves on the tap.
// Rules weigh most (broken = rule points lost), defensive errors −2, positive plays +1.
// Bad shots, turnovers and forced turnovers are scored from the possession log instead.
export function GradeDialog({
  open,
  onClose,
  rules,
  roster,
  onCourt,
  onRule,
  onGrade,
  onAddRule,
  onRemoveRule,
}: {
  open: boolean;
  onClose: () => void;
  rules: AccountabilityRule[];
  roster: string[];
  onCourt: string[];
  onRule: (rule: AccountabilityRule, player: string) => void;
  onGrade: (action: GradeAction, player: string) => void;
  onAddRule: (label: string, points: number) => void;
  onRemoveRule: (rule: AccountabilityRule) => void;
}) {
  const [player, setPlayer] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState("");
  const [points, setPoints] = useState("3");

  const pointsValue = Number.parseInt(points, 10);
  const canAdd = label.trim().length > 0 && pointsValue > 0 && !rules.some((r) => r.label.toLowerCase() === label.trim().toLowerCase());

  function close() {
    setPlayer(null);
    setEditing(false);
    setLabel("");
    setPoints("3");
    onClose();
  }

  function addRule() {
    if (!canAdd) return;
    onAddRule(label.trim(), pointsValue);
    setLabel("");
    setPoints("3");
  }

  function pick(save: (p: string) => void) {
    if (!player) return;
    save(player);
    close();
  }

  const section = (title: string, color: string, children: ReactNode) => (
    <Box sx={{ mb: 2.5 }}>
      <Typography sx={{ ...LABEL_SX, color }}>{title}</Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>{children}</Box>
    </Box>
  );

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800 }}>
        Player +/−
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>Pick the player, then tap what he did — it saves on the tap.</Typography>
      </DialogTitle>
      <DialogContent>
        {!editing && <PlayerPicker label="Who? (ours)" roster={roster} onCourt={onCourt} value={player} onChange={setPlayer} required />}

        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
          <Typography sx={{ ...LABEL_SX, color: "error.main" }}>Game rules — broken</Typography>
          <Button size="small" color={editing ? "primary" : "inherit"} sx={{ opacity: editing ? 1 : 0.7, mb: 0.75 }} onClick={() => setEditing((e) => !e)}>
            {editing ? "Done editing" : "Edit rules"}
          </Button>
        </Stack>
        {rules.length === 0 && !editing && (
          <Typography sx={{ color: "text.disabled", mb: 2, fontSize: 14 }}>No rules for this game yet — tap “Edit rules” to add this week&apos;s rules.</Typography>
        )}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 2.5 }}>
          {rules.map((r) => (
            <Chip
              key={r.id}
              label={editing ? `✕ ${r.label} (−${r.points})` : `${r.label}  −${r.points}`}
              color="error"
              variant="outlined"
              disabled={!editing && !player}
              onClick={() => (editing ? onRemoveRule(r) : pick((p) => onRule(r, p)))}
              sx={ACTION_SX}
            />
          ))}
        </Box>

        {editing ? (
          <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: "center" }}>
            <TextField size="small" label="New rule" placeholder="e.g. PnR D: Under" value={label} onChange={(e) => setLabel(e.target.value)} sx={{ flex: 1 }} />
            <TextField
              size="small"
              label="Points lost"
              type="number"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              slotProps={{ htmlInput: { min: 1, inputMode: "numeric" } }}
              sx={{ width: 110 }}
            />
            <Button variant="contained" sx={{ minHeight: 40 }} disabled={!canAdd} onClick={addRule}>
              Add
            </Button>
          </Stack>
        ) : (
          <>
            {section(
              "Defensive errors",
              "warning.main",
              GRADE_ACTIONS.filter((a) => a.type === "def_error").map((a) => (
                <Chip key={a.label} label={`${a.label}  ${a.score}`} color="warning" variant="outlined" disabled={!player} onClick={() => pick((p) => onGrade(a, p))} sx={ACTION_SX} />
              ))
            )}
            {section(
              "Positives",
              "success.main",
              GRADE_ACTIONS.filter((a) => a.type === "positive").map((a) => (
                <Chip key={a.label} label={`${a.label}  +${a.score}`} color="success" variant="outlined" disabled={!player} onClick={() => pick((p) => onGrade(a, p))} sx={ACTION_SX} />
              ))
            )}
            <Typography sx={{ fontSize: 12, color: "text.disabled" }}>
              Bad shot −1, turnover −1 and forced turnover / steal +1 count automatically from the possessions.
            </Typography>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button color="inherit" sx={{ minHeight: 52 }} onClick={close}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
