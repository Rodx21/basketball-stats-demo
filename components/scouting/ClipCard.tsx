import { toYoutubeEmbedUrl } from "@/lib/videoEmbed";
import { deleteClip } from "@/app/(app)/scouting/actions";

interface Clip {
  id: string;
  video_url: string;
  note: string | null;
}

export function ClipCard({ clip, teamId }: { clip: Clip; teamId: string }) {
  const embedUrl = toYoutubeEmbedUrl(clip.video_url);

  return (
    <div className="group/clip relative overflow-hidden rounded-[14px] border border-white/[0.13] bg-white/[0.03]">
      {embedUrl ? (
        <div className="aspect-video w-full bg-black">
          <iframe
            src={embedUrl}
            title={clip.note ?? "Scouting clip"}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <a
          href={clip.video_url}
          target="_blank"
          rel="noreferrer"
          className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-court-800 text-center hover:bg-court-700"
        >
          <span className="text-[26px] text-brand-gold">▶</span>
          <span className="max-w-[85%] truncate text-[11px] font-medium text-white/50">{clip.video_url}</span>
        </a>
      )}
      <div className="flex items-start justify-between gap-3 px-3.5 py-2.5">
        <p className="text-[12px] text-white/60">{clip.note || "—"}</p>
        <form action={deleteClip}>
          <input type="hidden" name="clip_id" value={clip.id} />
          <input type="hidden" name="team_id" value={teamId} />
          <button
            type="submit"
            className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/30 opacity-0 hover:text-[#ff5a5a] group-hover/clip:opacity-100"
          >
            Remove
          </button>
        </form>
      </div>
    </div>
  );
}
