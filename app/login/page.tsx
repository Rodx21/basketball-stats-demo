import { LogoBadge } from "@/components/LogoBadge";
import { signIn } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form action={signIn} className="w-full max-w-sm space-y-4">
        <div className="mb-2 flex items-center gap-3">
          <LogoBadge />
          <div>
            <h1 className="text-xl font-semibold">Harbour City BC</h1>
            <p className="text-sm text-white/50">Coaching staff sign in</p>
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium text-white/70">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-lg border border-white/15 bg-court-900 px-3 py-2 outline-none focus:border-brand-gold"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium text-white/70">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full rounded-lg border border-white/15 bg-court-900 px-3 py-2 outline-none focus:border-brand-gold"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-brand-gold px-3 py-2 font-semibold text-court-950 hover:bg-brand-gold-600"
        >
          Sign in
        </button>
      </form>
    </main>
  );
}
