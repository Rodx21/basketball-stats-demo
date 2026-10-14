import { createClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";
import { LogoBadge } from "@/components/LogoBadge";
import { NavLinks } from "@/components/NavLinks";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: ownTeam } = await supabase
    .from("teams")
    .select("name")
    .eq("is_own_team", true)
    .maybeSingle();

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-white/[0.13] bg-court-900 px-10 py-5 print:hidden">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <LogoBadge />
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-bold uppercase tracking-[0.13em] text-white">
                {ownTeam?.name ?? "Harbour City BC"}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/40">
                Stats Tracker
              </span>
            </div>
          </div>
          <NavLinks />
          <div className="flex items-center gap-5">
            <button
              type="button"
              className="rounded-[14px] border border-white/20 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/70 hover:border-white/40 hover:text-white"
            >
              Export report
            </button>
            <form action={signOut}>
              <button
                type="submit"
                className="text-[11px] font-medium uppercase tracking-[0.1em] text-white/40 hover:text-white/70"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-10 py-8">{children}</main>
    </div>
  );
}
