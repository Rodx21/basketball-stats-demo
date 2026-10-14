const STYLES: Record<string, string> = {
  scheduled: "bg-white/10 text-white/60",
  live: "bg-red-500/20 text-red-300",
  final: "bg-brand-gold/15 text-brand-gold",
};

const LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  live: "Live",
  final: "Final",
};

export function StatusBadge({ status }: { status: string | null }) {
  const value = status ?? "scheduled";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        STYLES[value] ?? STYLES.scheduled
      }`}
    >
      {value === "live" && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
      )}
      {LABELS[value] ?? value}
    </span>
  );
}
