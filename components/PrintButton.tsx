"use client";

export function PrintButton({ label = "Print / save as PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden rounded-[14px] border border-white/20 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/70 hover:border-white/40 hover:text-white"
    >
      {label}
    </button>
  );
}
