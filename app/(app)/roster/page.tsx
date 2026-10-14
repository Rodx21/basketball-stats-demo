import { createClient } from "@/lib/supabase/server";
import { RosterPlayerRow } from "@/components/RosterPlayerRow";
import { createPlayer, createTeam, deletePlayer, deleteTeam, updatePlayer } from "./actions";

const POSITIONS = ["PG", "SG", "SF", "PF", "C"] as const;

export default async function RosterPage() {
  const supabase = await createClient();

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, is_own_team, players(id, full_name, jersey_number, position, active)")
    .order("is_own_team", { ascending: false })
    .order("name");

  const ownTeam = teams?.find((t) => t.is_own_team);
  const players = ownTeam?.players ?? [];
  const activeCount = players.filter((p) => p.active).length;
  const positionsCovered = new Set(players.map((p) => p.position).filter(Boolean)).size;
  const opponentTeams = teams?.filter((t) => !t.is_own_team) ?? [];
  const allPlayers = teams?.flatMap((t) => t.players ?? []) ?? [];

  const { data: statRows } = allPlayers.length > 0
    ? await supabase
        .from("player_game_stats")
        .select("player_id, pts, oreb, dreb, ast, games!inner(status)")
        .eq("games.status", "final")
        .in("player_id", allPlayers.map((p) => p.id))
    : { data: [] };

  const seasonLines = new Map<string, string>();
  for (const p of allPlayers) {
    const rows = (statRows ?? []).filter((r) => r.player_id === p.id);
    const gp = rows.length;
    const ppg = gp > 0 ? rows.reduce((s, r) => s + (r.pts ?? 0), 0) / gp : 0;
    const rpg = gp > 0 ? rows.reduce((s, r) => s + (r.oreb ?? 0) + (r.dreb ?? 0), 0) / gp : 0;
    const apg = gp > 0 ? rows.reduce((s, r) => s + (r.ast ?? 0), 0) / gp : 0;
    seasonLines.set(p.id, gp > 0 ? `${ppg.toFixed(1)} · ${rpg.toFixed(1)} · ${apg.toFixed(1)}` : "—");
  }

  return (
    <div className="mx-auto max-w-[1280px]">
      <section className="grid grid-cols-[minmax(0,1fr)_380px] items-end gap-16 border-b border-white/[0.13] py-14">
        <div>
          <p className="mb-5 font-[family-name:var(--font-serif)] text-[22px] italic text-white/60">
            Squad and tracked opponents
          </p>
          <h1 className="text-[80px] font-bold uppercase leading-[0.94] tracking-[0.03em] text-white">Roster</h1>
        </div>
        <div>
          {[
            ["Roster size", String(players.length)],
            ["Active", String(activeCount)],
            ["Positions covered", `${positionsCovered}/5`],
            ["Teams tracked", String(teams?.length ?? 0)],
          ].map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between border-b border-white/[0.13] py-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.13em] text-white/45">{label}</span>
              <span className="text-[22px] font-semibold tabular-nums text-white">{value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-white/[0.13] py-12">
        <div className="mb-1.5 flex items-baseline justify-between gap-8">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-white">
            {ownTeam?.name ?? "Squad"}
          </h2>
          <details className="group">
            <summary className="cursor-pointer list-none rounded-[14px] border border-white/20 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/70 hover:border-white/40">
              + Add player
            </summary>
            {ownTeam && (
              <form action={createPlayer} className="mt-4 flex flex-wrap items-end gap-3">
                <input type="hidden" name="team_id" value={ownTeam.id} />
                <input
                  name="full_name"
                  required
                  placeholder="Player name"
                  className="rounded border border-white/20 bg-court-900 px-3.5 py-2.5 text-[13px] font-medium text-white outline-none focus:border-brand-gold"
                />
                <input
                  name="jersey_number"
                  type="number"
                  placeholder="#"
                  className="w-20 rounded border border-white/20 bg-court-900 px-3.5 py-2.5 text-[13px] font-medium text-white outline-none focus:border-brand-gold"
                />
                <select
                  name="position"
                  className="rounded border border-white/20 bg-court-900 px-3.5 py-2.5 text-[13px] font-medium text-white outline-none focus:border-brand-gold"
                >
                  <option value="">Position</option>
                  {POSITIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-[14px] bg-brand-gold px-[22px] py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#111] hover:bg-brand-gold-600"
                >
                  Add
                </button>
              </form>
            )}
          </details>
        </div>
        <p className="mb-7 text-[13px] text-white/45">Click any field to edit it — changes save on blur</p>

        {!ownTeam && <p className="text-sm text-white/40">Mark a team as your own to build a squad.</p>}

        {ownTeam && (
          <div className="border-t border-white/[0.13]">
            {players.map((player) => (
              <RosterPlayerRow
                key={player.id}
                player={player}
                seasonLine={seasonLines.get(player.id) ?? "—"}
                updatePlayer={updatePlayer}
                deletePlayer={deletePlayer}
              />
            ))}
            {players.length === 0 && <p className="py-4 text-sm text-white/40">No players yet.</p>}
          </div>
        )}
      </section>

      <section className="py-12">
        <h2 className="mb-1.5 text-[13px] font-bold uppercase tracking-[0.16em] text-white">Tracked opponents</h2>
        <p className="mb-7 text-[13px] text-white/45">
          Add their roster to attribute stats to specific opponent players instead of the team as a whole
        </p>

        {opponentTeams.map((team) => (
          <div key={team.id} className="group/team flex items-start gap-4 border-b border-white/[0.13] py-4">
            <details className="flex-1">
              <summary className="cursor-pointer list-none text-[15px] font-semibold text-white">
                {team.name}{" "}
                <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/35">
                  · {(team.players ?? []).length} player{(team.players ?? []).length === 1 ? "" : "s"}
                </span>
              </summary>

            <div className="mt-4 border-t border-white/[0.09]">
              {(team.players ?? []).map((player) => (
                <RosterPlayerRow
                  key={player.id}
                  player={player}
                  seasonLine={seasonLines.get(player.id) ?? "—"}
                  updatePlayer={updatePlayer}
                  deletePlayer={deletePlayer}
                />
              ))}
              {(team.players ?? []).length === 0 && (
                <p className="py-3 text-sm text-white/40">No players logged for {team.name} yet.</p>
              )}
            </div>

            <form action={createPlayer} className="mt-4 flex flex-wrap items-end gap-3">
              <input type="hidden" name="team_id" value={team.id} />
              <input
                name="full_name"
                required
                placeholder="Player name"
                className="rounded border border-white/20 bg-court-900 px-3.5 py-2.5 text-[13px] font-medium text-white outline-none focus:border-brand-gold"
              />
              <input
                name="jersey_number"
                type="number"
                placeholder="#"
                className="w-20 rounded border border-white/20 bg-court-900 px-3.5 py-2.5 text-[13px] font-medium text-white outline-none focus:border-brand-gold"
              />
              <select
                name="position"
                className="rounded border border-white/20 bg-court-900 px-3.5 py-2.5 text-[13px] font-medium text-white outline-none focus:border-brand-gold"
              >
                <option value="">Position</option>
                {POSITIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-[14px] border border-white/20 px-[18px] py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/70 hover:border-white/40"
              >
                Add player
              </button>
            </form>
            </details>

            <form action={deleteTeam} className="pt-1 opacity-0 group-hover/team:opacity-100">
              <input type="hidden" name="team_id" value={team.id} />
              <button
                type="submit"
                className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/30 hover:text-[#ff5a5a]"
              >
                Remove team
              </button>
            </form>
          </div>
        ))}

        <form action={createTeam} className="mt-6 flex flex-wrap items-end gap-3">
          <input
            name="name"
            required
            placeholder="e.g. Riverside Hawks"
            className="rounded border border-white/20 bg-court-900 px-3.5 py-2.5 text-[13px] font-medium text-white outline-none focus:border-brand-gold"
          />
          <label className="flex items-center gap-2 pb-2.5 text-[13px] text-white/60">
            <input type="checkbox" name="is_own_team" className="accent-brand-gold" />
            This is my team
          </label>
          <button
            type="submit"
            className="rounded-[14px] border border-white/20 px-[18px] py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/70 hover:border-white/40"
          >
            Add team
          </button>
        </form>

        {teams?.length === 0 && <p className="text-sm text-white/40">No teams yet.</p>}
      </section>
    </div>
  );
}
