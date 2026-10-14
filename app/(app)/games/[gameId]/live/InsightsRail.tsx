"use client";

import { useState } from "react";
import { Box, Button, Card, CardContent, Collapse, Stack, Typography } from "@mui/material";
import { MIN_SAMPLE, SITUATION_CATEGORIES, actionOf, insights, playOf, pppBy } from "@/lib/liveScouting";
import { DefenseRules, InsightList } from "@/components/live/insights";
import { asPossessions, sectionTitleSx, type LiveEvent } from "@/components/live/shared";

function ScoutReminders({ side, expected }: { side: "our_off" | "our_def"; expected: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  // When we attack we care about their defense, and vice versa.
  const notes = SITUATION_CATEGORIES.filter((c) => c.side === (side === "our_off" ? "defense" : "offense"))
    .map((c) => ({ label: c.label, body: expected[c.key]?.trim() }))
    .filter((n): n is { label: string; body: string } => Boolean(n.body));

  return (
    <Card>
      <CardContent>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
          <Typography sx={{ ...sectionTitleSx, fontSize: 12 }}>Scout · their {side === "our_off" ? "defense" : "offense"}</Typography>
          {notes.length > 0 && (
            <Button size="small" color="inherit" sx={{ opacity: 0.7 }} onClick={() => setOpen((o) => !o)}>
              {open ? "Hide" : `Show (${notes.length})`}
            </Button>
          )}
        </Stack>
        {notes.length === 0 && <Typography sx={{ fontSize: 13, color: "text.disabled", mt: 0.5 }}>No pre-game scout written.</Typography>}
        <Collapse in={open}>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            {notes.map((n) => (
              <Box key={n.label}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: "primary.main", textTransform: "uppercase", letterSpacing: "0.08em" }}>{n.label}</Typography>
                <Typography sx={{ fontSize: 13, color: "text.secondary", whiteSpace: "pre-line" }}>{n.body}</Typography>
              </Box>
            ))}
          </Stack>
        </Collapse>
      </CardContent>
    </Card>
  );
}

// Right-hand column: the 3–4 answers the bench needs for the side currently on the floor.
export function InsightsRail({
  side,
  events,
  defense,
  expected,
}: {
  side: "our_off" | "our_def";
  events: LiveEvent[];
  defense: string | null;
  expected: Record<string, string>;
}) {
  const poss = asPossessions(events, side);
  const empty = `Needs ${MIN_SAMPLE}+ possessions of the same play.`;

  const byPlay = pppBy(poss, side === "our_off" ? playOf : actionOf);
  const { best, worst } = insights(byPlay, side);
  const vsDefense = defense ? insights(pppBy(poss.filter((p) => p.defense === defense), side === "our_off" ? playOf : actionOf), side, 2).best : [];
  const byPlayer = pppBy(poss, (p) => p.player).sort((a, b) => b.pts - a.pts || b.poss - a.poss).slice(0, 3);

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Stack spacing={2.25}>
            {side === "our_off" ? (
              <>
                <InsightList title="Working — keep calling" tone="good" rows={best} side={side} empty={empty} />
                <InsightList title="Not working" tone="bad" rows={worst} side={side} empty={empty} />
                {defense && <InsightList title={`Best vs their ${defense}`} tone="neutral" rows={vsDefense} side={side} empty={`Not enough possessions vs ${defense} yet.`} />}
                <InsightList title="Targets we attacked" tone="neutral" rows={byPlayer} side={side} empty="Tag 'Attacking' on a possession to track targets." />
              </>
            ) : (
              <>
                <InsightList title="Hurting us" tone="bad" rows={worst} side={side} empty={empty} />
                <InsightList title="We're stopping" tone="good" rows={best} side={side} empty={empty} />
                <DefenseRules possessions={poss} />
                <InsightList title="Who's scoring on us" tone="neutral" rows={byPlayer} side={side} empty="Tag 'Who' on a possession to track their scorers." />
              </>
            )}
          </Stack>
        </CardContent>
      </Card>
      <ScoutReminders side={side} expected={expected} />
    </Stack>
  );
}
