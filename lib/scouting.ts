export type ScoutingSection = "offense" | "defense";

export interface CategoryDef {
  key: string;
  label: string;
  hint?: string;
  optional?: boolean;
}

export const OFFENSE_CATEGORIES: readonly CategoryDef[] = [
  { key: "transition", label: "Transition offense", hint: "Fastbreak, early PnR, seal under the basket" },
  { key: "motion", label: "Motion" },
  { key: "pnr_set", label: "PnR set" },
  { key: "off_reb", label: "Offensive rebound" },
  { key: "slob", label: "SLOB" },
  { key: "blob", label: "BLOB" },
  { key: "ato", label: "ATO", optional: true },
];

export const DEFENSE_CATEGORIES: readonly CategoryDef[] = [
  { key: "transition_def", label: "Transition defense" },
  { key: "pnr_def", label: "PnR defense" },
  { key: "zone", label: "Zone" },
  { key: "press", label: "Press (full/zone)" },
  { key: "anomalies", label: "Anomalies", hint: "Zone after BLOB, zone/press after FT" },
  { key: "def_reb", label: "Defensive rebound" },
];

export const CLIP_TARGET = { min: 2, max: 3 };

export const ALL_CATEGORIES: readonly CategoryDef[] = [...OFFENSE_CATEGORIES, ...DEFENSE_CATEGORIES];

export function categoryLabel(key: string): string {
  return ALL_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}
