"use client";

import { useState } from "react";
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { TURNOVER_CATEGORY, pppBy, periodLabel, playKey, type Lineups, type OptionList, type OptionRow, type PlayGroup, type TeamRule } from "@/lib/liveScouting";
import { AddOptionDialog } from "./AddOptionDialog";
import { asPossessions, blankEvent, formatPpp, pppColor, type LiveEvent, type NewEvent } from "@/components/live/shared";
import { PlayerPicker } from "@/components/live/PlayerPicker";

const RESULTS: { label: string; points: number; turnover: boolean; tone: "neutral" | "score" | "turnover" }[] = [
  { label: "Miss", points: 0, turnover: false, tone: "neutral" },
  { label: "1", points: 1, turnover: false, tone: "score" },
  { label: "2", points: 2, turnover: false, tone: "score" },
  { label: "3", points: 3, turnover: false, tone: "score" },
  { label: "And-1 (4)", points: 4, turnover: false, tone: "score" },
  { label: "Turnover", points: 0, turnover: true, tone: "turnover" },
];

function ChipRow({
  label,
  options,
  value,
  onChange,
  height = 40,
}: {
  label: string;
  options: readonly string[];
  value: string | null;
  onChange: (v: string | null) => void;
  height?: number;
}) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 0.75 }}>{label}</Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
        {options.map((o) => (
          <Chip
            key={o}
            label={o}
            color={value === o ? "primary" : "default"}
            variant={value === o ? "filled" : "outlined"}
            onClick={() => onChange(value === o ? null : o)}
            sx={{ height, fontSize: 14 }}
          />
        ))}
      </Box>
    </Box>
  );
}

// One possession = tap the play/action, then the result. Optional tags live in the result sheet.
// side = our_off → our plays vs their defense; our_def → their actions vs our defense.
export function PossessionPanel({
  side,
  groups,
  defenseItems,
  playList,
  defenseList,
  options,
  onAddOption,
  onRemoveOption,
  defense,
  onDefenseChange,
  players,
  ourPlayers,
  lineups,
  coverages = [],
  rules = [],
  events,
  period,
  onLog,
}: {
  side: "our_off" | "our_def";
  groups: (PlayGroup & { items: OptionRow[] })[];
  defenseItems: OptionRow[];
  playList: OptionList;
  defenseList: OptionList;
  // All editable buttons (for duplicate checks when adding).
  options: OptionRow[];
  onAddOption: (row: Omit<OptionRow, "id">) => void;
  onRemoveOption: (row: OptionRow) => void;
  defense: string | null;
  onDefenseChange: (d: string | null) => void;
  players: string[];
  ourPlayers: string[];
  // Who is on the floor, so the player chips start with those five.
  lineups: Lineups;
  coverages?: readonly string[];
  // Team rules to tag on each possession (kept / broken).
  rules?: readonly TeamRule[];
  events: LiveEvent[];
  period: number;
  onLog: (e: NewEvent) => void;
}) {
  const [pending, setPending] = useState<{ category: string; option: string } | null>(null);
  const [player, setPlayer] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<string | null>(null);
  const [ruleValues, setRuleValues] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<OptionRow | null>(null);
  // Turnover step: who committed it and who forced it (ours or theirs depending on the side).
  const [tovStep, setTovStep] = useState(false);
  const [tovBy, setTovBy] = useState<string | null>(null);
  const [tovForcedBy, setTovForcedBy] = useState<string | null>(null);
  // Our player who finished our possession; flags for how the play / shot went.
  const [actor, setActor] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);
  const [badShot, setBadShot] = useState(false);

  const statsByPlay = new Map(pppBy(asPossessions(events, side), playKey).map((s) => [s.key, s]));
  const attacking = side === "our_off";
  const ours = { roster: ourPlayers, onCourt: lineups.ours };
  const theirs = { roster: players, onCourt: lineups.theirs };
  const committers = attacking ? ours : theirs;
  const forcers = attacking ? theirs : ours;
  // Every possession belongs to a player: ours when we attack, theirs when they do.
  const finisher = attacking ? actor : player;
  const looseTurnover = pending?.category === TURNOVER_CATEGORY;

  function close() {
    setPending(null);
    setPlayer(null);
    setCoverage(null);
    setRuleValues({});
    setNote("");
    setShowNote(false);
    setTovStep(false);
    setTovBy(null);
    setTovForcedBy(null);
    setActor(null);
    setBroken(false);
    setBadShot(false);
  }

  function startTurnover() {
    setPending({ category: TURNOVER_CATEGORY, option: "Turnover" });
    setTovStep(true);
  }

  function save(points: number, turnover: boolean) {
    if (!pending) return;
    onLog(
      blankEvent(side, pending.category, pending.option, {
        points,
        turnover,
        defense,
        // Theirs: who finished their possession (the committer on a turnover).
        player: !attacking && turnover ? (tovBy ?? player) : player,
        // Ours: who finished our possession (the committer on a turnover).
        actor: attacking ? (turnover ? tovBy : actor) : null,
        coverage,
        rules: Object.keys(ruleValues).length > 0 ? ruleValues : null,
        tov_by: turnover ? tovBy : null,
        tov_forced_by: turnover ? tovForcedBy : null,
        broken: attacking && broken,
        bad_shot: attacking && !turnover && badShot,
        note: note.trim() || null,
      })
    );
    close();
  }

  // Scoring is good for us on offense and bad on defense; a turnover is the opposite.
  function resultColor(tone: "neutral" | "score" | "turnover"): "inherit" | "success" | "error" {
    if (tone === "neutral") return "inherit";
    const goodForUs = (tone === "score") === attacking;
    return goodForUs ? "success" : "error";
  }

  return (
    <>
      <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", mb: 1.25 }}>
        {!removing && (
          <Button variant="outlined" color="inherit" sx={{ minHeight: 44, fontSize: 15, fontWeight: 700 }} onClick={() => setAddOpen(true)}>
            + Add
          </Button>
        )}
        <Button
          variant={removing ? "contained" : "outlined"}
          color={removing ? "primary" : "error"}
          sx={{ minHeight: 44, fontSize: 15, fontWeight: 700 }}
          onClick={() => setRemoving((r) => !r)}
        >
          {removing ? "Done" : "− Remove"}
        </Button>
      </Stack>
      {removing && (
        <Typography sx={{ fontSize: 14, color: "error.main", fontWeight: 700, mb: 1.25 }}>
          Remove mode — tap a card or defense to remove it. Logged possessions are kept.
        </Typography>
      )}

      <Box
        sx={{
          border: "1px solid",
          borderColor: removing ? "error.main" : defense ? "rgba(255,255,255,0.13)" : "warning.main",
          borderRadius: "14px",
          bgcolor: "background.paper",
          p: 1.75,
          mb: 2.5,
        }}
      >
        <Typography sx={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: defense ? "text.secondary" : "warning.main", mb: 1 }}>
          {defense
            ? `${attacking ? "Their" : "Our"} defense: ${defense} — every possession is saved under it until you change it`
            : `Pick ${attacking ? "their" : "our"} defense — it stays on until you change it`}
        </Typography>
        <ToggleButtonGroup
          exclusive
          value={removing ? null : defense}
          onChange={(_, v) => {
            if (!removing) return onDefenseChange(v);
            const item = defenseItems.find((d) => d.label === v);
            if (item) setConfirmRemove(item);
          }}
          color="primary"
          sx={{ flexWrap: "wrap", "& .MuiToggleButton-root": { minHeight: 52, minWidth: 84, fontSize: 17, fontWeight: 800 } }}
        >
          {defenseItems.map((d) => (
            <ToggleButton key={d.id} value={d.label} sx={removing ? { color: "error.main", borderColor: "error.main" } : undefined}>
              {removing ? `✕ ${d.label}` : d.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {!removing && (
        <Button
          fullWidth
          variant="outlined"
          color={attacking ? "error" : "success"}
          onClick={startTurnover}
          sx={{ minHeight: 64, fontSize: 19, fontWeight: 800, mb: 2.5, borderWidth: 2, "&:hover": { borderWidth: 2 } }}
        >
          {attacking ? "Turnover (ours)" : "Turnover (theirs)"}
        </Button>
      )}

      <Stack spacing={2.5}>
        {groups.map((group) => (
          <Box key={group.key}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "text.secondary", mb: 1 }}>
              {group.label}
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(132px, 1fr))", gap: 1 }}>
              {group.items.map((item) => {
                const play = item.label;
                const s = statsByPlay.get(playKey({ category: group.key, option: play }));
                return (
                  <Button
                    key={item.id}
                    variant="outlined"
                    color={removing ? "error" : "inherit"}
                    onClick={() => (removing ? setConfirmRemove(item) : setPending({ category: group.key, option: play }))}
                    sx={{
                      minHeight: 78,
                      flexDirection: "column",
                      borderColor: removing ? "error.main" : "rgba(255,255,255,0.18)",
                      bgcolor: "background.paper",
                      fontSize: 17,
                      fontWeight: 700,
                      lineHeight: 1.2,
                    }}
                  >
                    {play}
                    <Box component="span" sx={{ fontSize: 12, fontWeight: 500, mt: 0.5, fontVariantNumeric: "tabular-nums", opacity: s || removing ? 1 : 0.3 }}>
                      {removing ? (
                        "✕ remove"
                      ) : s ? (
                        <>
                          {s.poss}× ·{" "}
                          <Box component="span" sx={{ color: pppColor(s.ppp, side, s.poss), fontWeight: 700 }}>
                            {formatPpp(s.ppp)}
                          </Box>
                        </>
                      ) : (
                        "—"
                      )}
                    </Box>
                  </Button>
                );
              })}
            </Box>
          </Box>
        ))}
      </Stack>

      <Dialog open={pending !== null} onClose={close} fullWidth maxWidth="sm">
        <DialogContent sx={{ pt: 3 }}>
          <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
            {periodLabel(period)} · {attacking ? "we attack" : "they attack"}
            {defense ? ` vs ${defense}` : ""}
          </Typography>
          <Typography sx={{ fontSize: 26, fontWeight: 800, mb: 2.5 }}>
            {pending ? (looseTurnover ? `${attacking ? "Our" : "Their"} turnover` : playKey(pending)) : ""}
            {tovStep && !looseTurnover ? " → Turnover" : ""}
          </Typography>

          {tovStep ? (
            <>
              <PlayerPicker label={`Committed by (${attacking ? "ours" : "theirs"})`} {...committers} value={tovBy} onChange={setTovBy} required />
              <PlayerPicker label={`Forced by (${attacking ? "theirs" : "ours"})`} {...forcers} value={tovForcedBy} onChange={setTovForcedBy} />
              <Button
                fullWidth
                variant="contained"
                color={attacking ? "error" : "success"}
                disabled={!tovBy}
                onClick={() => save(0, true)}
                sx={{ minHeight: 72, fontSize: 21, fontWeight: 800, mt: 1, mb: 2 }}
              >
                Save turnover
              </Button>
              <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                <Button color="inherit" sx={{ opacity: 0.6, minHeight: 44, visibility: looseTurnover ? "hidden" : "visible" }} onClick={() => setTovStep(false)}>
                  ← Back
                </Button>
                <Button color="inherit" sx={{ minHeight: 44 }} onClick={close}>
                  Cancel
                </Button>
              </Stack>
            </>
          ) : (
            <>
              {attacking ? (
                <>
                  <PlayerPicker label="Who finished it? (ours — shot or turnover)" {...ours} value={actor} onChange={setActor} required />
                  <PlayerPicker label="Attacking — who did we go at?" {...theirs} value={player} onChange={setPlayer} />
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
                    <Chip
                      label={broken ? "✗ Broken — play started, then stopped" : "Broken play?"}
                      color={broken ? "warning" : "default"}
                      variant={broken ? "filled" : "outlined"}
                      onClick={() => setBroken((b) => !b)}
                      sx={{ height: 48, fontSize: 15, fontWeight: 700 }}
                    />
                    <Chip
                      label={badShot ? "✗ Bad shot" : "Bad shot?"}
                      color={badShot ? "error" : "default"}
                      variant={badShot ? "filled" : "outlined"}
                      onClick={() => setBadShot((b) => !b)}
                      sx={{ height: 48, fontSize: 15, fontWeight: 700 }}
                    />
                  </Box>
                </>
              ) : (
                <PlayerPicker label="Who finished it? (theirs — scored / shot / attacked us)" {...theirs} value={player} onChange={setPlayer} required />
              )}
              {rules.map((rule) => (
                <ChipRow
                  key={rule.key}
                  label={`${rule.label} (optional)`}
                  options={rule.options.map((o) => `${o.kept ? "✓" : "✗"} ${o.label}`)}
                  value={ruleValues[rule.key] ? `${rule.options.find((o) => o.label === ruleValues[rule.key])?.kept ? "✓" : "✗"} ${ruleValues[rule.key]}` : null}
                  onChange={(v) =>
                    setRuleValues((prev) => {
                      const next = { ...prev };
                      if (v) next[rule.key] = v.slice(2);
                      else delete next[rule.key];
                      return next;
                    })
                  }
                />
              ))}
              {coverages.length > 0 && <ChipRow label="Their PnR coverage (optional)" options={coverages} value={coverage} onChange={setCoverage} />}

              <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 0.75 }}>
                {attacking ? "How did it end? (saves)" : "What did they get? (saves)"}
                {!finisher && " — pick who finished it first (turnover asks on the next step)"}
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.25, mb: 3 }}>
                {RESULTS.map((r) => {
                  const color = resultColor(r.tone);
                  return (
                    <Button
                      key={r.label}
                      variant={color === "inherit" ? "outlined" : "contained"}
                      color={color}
                      disabled={!r.turnover && !finisher}
                      onClick={() => {
                        if (!r.turnover) return save(r.points, false);
                        // Carry the finisher over as the likely committer.
                        if (!tovBy) setTovBy(finisher);
                        setTovStep(true);
                      }}
                      sx={{ minHeight: 80, fontSize: 21, fontWeight: 800 }}
                    >
                      {r.label}
                    </Button>
                  );
                })}
              </Box>

              {showNote && <TextField fullWidth multiline minRows={2} autoFocus placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} sx={{ mb: 1 }} />}
              <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                <Button color="inherit" sx={{ opacity: 0.6, minHeight: 44, visibility: showNote ? "hidden" : "visible" }} onClick={() => setShowNote(true)}>
                  + Add note
                </Button>
                <Button color="inherit" sx={{ minHeight: 44 }} onClick={close}>
                  Cancel
                </Button>
              </Stack>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={confirmRemove !== null} onClose={() => setConfirmRemove(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Remove “{confirmRemove?.label}”?</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "text.secondary", fontSize: 14 }}>
            The card disappears from the live screen. Possessions already logged with it stay in the analysis.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button color="inherit" sx={{ minHeight: 52 }} onClick={() => setConfirmRemove(null)}>
            Keep it
          </Button>
          <Button
            variant="contained"
            color="error"
            sx={{ minHeight: 52, px: 3, fontWeight: 800 }}
            onClick={() => {
              if (confirmRemove) {
                if (confirmRemove.list === defenseList && confirmRemove.label === defense) onDefenseChange(null);
                onRemoveOption(confirmRemove);
              }
              setConfirmRemove(null);
            }}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      <AddOptionDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        attacking={attacking}
        playList={playList}
        defenseList={defenseList}
        groups={groups}
        existing={options}
        onAdd={onAddOption}
      />
    </>
  );
}
