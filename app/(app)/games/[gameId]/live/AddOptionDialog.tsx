"use client";

import { useState } from "react";
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from "@mui/material";
import { slugify, type OptionList, type OptionRow, type PlayGroup } from "@/lib/liveScouting";

type Kind = "play" | "defense";

const QUESTION_SX = { fontSize: 13, fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.1em", mb: 1 } as const;

// "+ Add" asks a couple of short questions so the new card lands in the right list and group.
export function AddOptionDialog({
  open,
  onClose,
  attacking,
  playList,
  defenseList,
  groups,
  existing,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  attacking: boolean;
  playList: OptionList;
  defenseList: OptionList;
  groups: readonly PlayGroup[];
  existing: readonly OptionRow[];
  onAdd: (row: Omit<OptionRow, "id">) => void;
}) {
  const [kind, setKind] = useState<Kind | null>(null);
  const [groupKey, setGroupKey] = useState<string | null>(null);
  const [newGroup, setNewGroup] = useState("");
  const [name, setName] = useState("");

  function reset() {
    setKind(null);
    setGroupKey(null);
    setNewGroup("");
    setName("");
  }

  function close() {
    reset();
    onClose();
  }

  const kindOptions: { kind: Kind; label: string; hint: string }[] = attacking
    ? [
        { kind: "play", label: "A play we run", hint: "e.g. Horns, Floppy, ATO" },
        { kind: "defense", label: "A defense they play", hint: "e.g. Box-and-1, Triangle-and-2" },
      ]
    : [
        { kind: "play", label: "An action they run", hint: "e.g. Spain PnR, Elevator" },
        { kind: "defense", label: "A defense we play", hint: "e.g. 1-3-1, Box-and-1" },
      ];

  const isNewGroup = groupKey === "__new";
  const group = isNewGroup
    ? { key: slugify(newGroup), label: newGroup.trim() }
    : groups.find((g) => g.key === groupKey) ?? null;
  const list = kind === "defense" ? defenseList : playList;
  const trimmed = name.trim();
  const duplicate =
    trimmed !== "" &&
    existing.some((o) => o.list === list && (kind === "defense" || o.group_key === group?.key) && o.label.toLowerCase() === trimmed.toLowerCase());
  const ready = kind !== null && trimmed !== "" && !duplicate && (kind === "defense" || (group !== null && group.label !== ""));

  function save() {
    if (!ready || !kind) return;
    onAdd({
      list,
      group_key: kind === "defense" ? "" : group!.key,
      group_label: kind === "defense" ? "" : group!.label,
      label: trimmed,
      sort_order: existing.reduce((max, o) => Math.max(max, o.sort_order), 0) + 1,
    });
    close();
  }

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800 }}>Add a card</DialogTitle>
      <DialogContent>
        <Typography sx={QUESTION_SX}>1 · What are you adding?</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.25, mb: 3 }}>
          {kindOptions.map((o) => (
            <Button
              key={o.kind}
              variant={kind === o.kind ? "contained" : "outlined"}
              color={kind === o.kind ? "primary" : "inherit"}
              onClick={() => setKind(o.kind)}
              sx={{ minHeight: 76, flexDirection: "column", fontSize: 16, fontWeight: 800 }}
            >
              {o.label}
              <Box component="span" sx={{ fontSize: 12, fontWeight: 500, opacity: 0.7 }}>
                {o.hint}
              </Box>
            </Button>
          ))}
        </Box>

        {kind === "play" && (
          <>
            <Typography sx={QUESTION_SX}>2 · Which group does it belong to?</Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: isNewGroup ? 1.25 : 3 }}>
              {groups.map((g) => (
                <Chip
                  key={g.key}
                  label={g.label}
                  color={groupKey === g.key ? "primary" : "default"}
                  variant={groupKey === g.key ? "filled" : "outlined"}
                  onClick={() => setGroupKey(g.key)}
                  sx={{ height: 44, fontSize: 15 }}
                />
              ))}
              <Chip
                label="+ New group"
                color={isNewGroup ? "primary" : "default"}
                variant={isNewGroup ? "filled" : "outlined"}
                onClick={() => setGroupKey("__new")}
                sx={{ height: 44, fontSize: 15 }}
              />
            </Box>
            {isNewGroup && (
              <TextField fullWidth placeholder="Group name, e.g. ATO" value={newGroup} onChange={(e) => setNewGroup(e.target.value)} sx={{ mb: 3 }} />
            )}
          </>
        )}

        {kind !== null && (
          <>
            <Typography sx={QUESTION_SX}>{kind === "play" ? "3" : "2"} · What&apos;s it called?</Typography>
            <TextField
              fullWidth
              autoFocus
              placeholder={kind === "play" ? "Name on the button" : "Defense name"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              error={duplicate}
              helperText={duplicate ? "That card already exists here." : " "}
            />
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button color="inherit" sx={{ minHeight: 52 }} onClick={close}>
          Cancel
        </Button>
        <Button variant="contained" sx={{ minHeight: 52, px: 3, fontWeight: 800 }} disabled={!ready} onClick={save}>
          Add card
        </Button>
      </DialogActions>
    </Dialog>
  );
}
