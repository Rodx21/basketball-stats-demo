export function LogoBadge({ size = 34 }: { size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded bg-brand-blue font-bold tracking-[0.06em] text-brand-gold"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      SV
    </div>
  );
}
