"use client";

import { useState } from "react";
import { Box, Chip, Typography } from "@mui/material";
import { STAND_INS } from "@/lib/liveScouting";

// Player chips for the live sheets: the five on the floor first, bench one tap away,
// plus Coach / #999 for actions that aren't one player's.
export function PlayerPicker({
  label,
  onCourt,
  roster,
  value,
  onChange,
  required = false,
}: {
  label: string;
  onCourt: readonly string[];
  roster: readonly string[];
  value: string | null;
  onChange: (v: string | null) => void;
  required?: boolean;
}) {
  const [showBench, setShowBench] = useState(false);
  const bench = roster.filter((p) => !onCourt.includes(p));
  const hasLineup = onCourt.length > 0;
  // A bench pick stays visible even with the bench collapsed.
  const main = hasLineup ? [...onCourt, ...(value && bench.includes(value) ? [value] : [])] : roster;

  const chip = (p: string, faded = false) => (
    <Chip
      key={p}
      label={p}
      color={value === p ? "primary" : "default"}
      variant={value === p ? "filled" : "outlined"}
      onClick={() => onChange(value === p ? null : p)}
      sx={{ height: 44, fontSize: 15, opacity: faded && value !== p ? 0.75 : 1 }}
    />
  );

  return (
    <Box sx={{ mb: 2 }}>
      <Typography sx={{ fontSize: 12, color: required && !value ? "warning.main" : "text.secondary", mb: 0.75, fontWeight: required && !value ? 700 : 400 }}>
        {label}
        {required ? " *" : " (optional)"}
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
        {main.map((p) => chip(p))}
        {STAND_INS.map((p) => chip(p, true))}
        {hasLineup && bench.length > 0 && (
          <Chip label={showBench ? "Hide bench" : `Bench (${bench.length})`} variant="outlined" onClick={() => setShowBench((b) => !b)} sx={{ height: 44, fontSize: 14, borderStyle: "dashed" }} />
        )}
      </Box>
      {hasLineup && showBench && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 0.75 }}>{bench.filter((p) => p !== value).map((p) => chip(p, true))}</Box>
      )}
    </Box>
  );
}
