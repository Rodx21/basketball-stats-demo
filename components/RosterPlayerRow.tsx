"use client";

import { useState, useTransition } from "react";

const POSITIONS = ["PG", "SG", "SF", "PF", "C"] as const;

interface Player {
  id: string;
  full_name: string;
  jersey_number: number | null;
  position: string | null;
  active: boolean | null;
}

export function RosterPlayerRow({
  player,
  seasonLine,
  updatePlayer,
  deletePlayer,
}: {
  player: Player;
  seasonLine: string;
  updatePlayer: (formData: FormData) => Promise<void>;
  deletePlayer: (formData: FormData) => Promise<void>;
}) {
  const [fullName, setFullName] = useState(player.full_name);
  const [jersey, setJersey] = useState(player.jersey_number != null ? String(player.jersey_number) : "");
  const [position, setPosition] = useState(player.position ?? "");
  const [, startTransition] = useTransition();

  function save(overrides: { fullName?: string; jersey?: string; position?: string }) {
    const name = overrides.fullName ?? fullName;
    if (!name.trim()) return;
    const fd = new FormData();
    fd.set("player_id", player.id);
    fd.set("full_name", name);
    fd.set("jersey_number", overrides.jersey ?? jersey);
    fd.set("position", overrides.position ?? position);
    startTransition(() => {
      updatePlayer(fd);
    });
  }

  return (
    <div className="grid grid-cols-[64px_minmax(0,1fr)_90px_130px_100px_80px] items-center gap-5 border-b border-white/[0.09] py-3.5">
      <input
        value={jersey}
        onChange={(e) => setJersey(e.target.value)}
        onBlur={(e) => save({ jersey: e.target.value })}
        className="rounded border border-transparent bg-transparent px-2.5 py-2 text-center text-[17px] font-bold tabular-nums text-brand-gold outline-none hover:border-white/20 focus:border-white/20"
      />
      <input
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        onBlur={(e) => save({ fullName: e.target.value })}
        className="rounded border border-transparent bg-transparent px-2.5 py-2 text-left text-[15px] font-medium text-white outline-none hover:border-white/20 focus:border-white/20"
      />
      <select
        value={position}
        onChange={(e) => {
          setPosition(e.target.value);
          save({ position: e.target.value });
        }}
        className="rounded border border-white/[0.13] bg-court-900 px-2.5 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-white/70 outline-none focus:border-brand-gold"
      >
        <option value="">—</option>
        {POSITIONS.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/35">{seasonLine}</span>
      <span
        className={`text-[10px] font-bold uppercase tracking-[0.13em] ${
          player.active ? "text-brand-gold" : "text-white/35"
        }`}
      >
        {player.active ? "Active" : "Inactive"}
      </span>
      <form action={deletePlayer} className="text-right">
        <input type="hidden" name="player_id" value={player.id} />
        <button
          type="submit"
          className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/30 hover:text-[#ff5a5a]"
        >
          Remove
        </button>
      </form>
    </div>
  );
}
