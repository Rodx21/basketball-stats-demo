import { CLIP_TARGET } from "@/lib/scouting";
import { addClip } from "@/app/(app)/scouting/actions";
import { ClipCard } from "./ClipCard";

interface Clip {
  id: string;
  video_url: string;
  note: string | null;
}

export function CategoryBlock({
  teamId,
  section,
  categoryKey,
  label,
  hint,
  optional,
  clips,
}: {
  teamId: string;
  section: "offense" | "defense";
  categoryKey: string;
  label: string;
  hint?: string;
  optional?: boolean;
  clips: Clip[];
}) {
  const onTarget = clips.length >= CLIP_TARGET.min;

  return (
    <div className="border-b border-white/[0.09] py-6">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.1em] text-white">
            {label}
            {optional && (
              <span className="rounded-full border border-white/20 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-white/40">
                Optional
              </span>
            )}
          </h3>
          {hint && <p className="mt-1 text-[11px] text-white/40">{hint}</p>}
        </div>
        <span
          className={`shrink-0 text-[11px] font-semibold uppercase tracking-[0.1em] ${
            onTarget ? "text-brand-gold" : "text-white/35"
          }`}
        >
          {clips.length}/{CLIP_TARGET.max} clips
        </span>
      </div>

      {clips.length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-4">
          {clips.map((clip) => (
            <ClipCard key={clip.id} clip={clip} teamId={teamId} />
          ))}
        </div>
      )}

      <details className="group">
        <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.1em] text-white/45 hover:text-white/75">
          + Add clip
        </summary>
        <form action={addClip} className="mt-3 flex flex-wrap items-end gap-3">
          <input type="hidden" name="team_id" value={teamId} />
          <input type="hidden" name="section" value={section} />
          <input type="hidden" name="category" value={categoryKey} />
          <input
            name="video_url"
            required
            placeholder="Video URL (YouTube or link)"
            className="min-w-[260px] flex-1 rounded border border-white/20 bg-court-900 px-3.5 py-2.5 text-[13px] font-medium text-white outline-none focus:border-brand-gold"
          />
          <input
            name="note"
            placeholder="Note (optional)"
            className="min-w-[180px] flex-1 rounded border border-white/20 bg-court-900 px-3.5 py-2.5 text-[13px] font-medium text-white outline-none focus:border-brand-gold"
          />
          <button
            type="submit"
            className="rounded-[14px] border border-white/20 px-[18px] py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/70 hover:border-white/40"
          >
            Add
          </button>
        </form>
      </details>
    </div>
  );
}
