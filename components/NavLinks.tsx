"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/team", label: "Dashboard" },
  { href: "/roster", label: "Roster" },
  { href: "/games", label: "Games" },
  { href: "/season", label: "Season" },
  { href: "/ranking", label: "Ranking" },
  { href: "/scouting", label: "Scouting" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-7">
      {LINKS.map((link) => {
        const active = pathname?.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`text-[11px] uppercase tracking-[0.13em] ${
              active
                ? "border-b border-brand-gold pb-0.5 font-semibold text-brand-gold"
                : "font-medium text-white/55 hover:text-white/80"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
