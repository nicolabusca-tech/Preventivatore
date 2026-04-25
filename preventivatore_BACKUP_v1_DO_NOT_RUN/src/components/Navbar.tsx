"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isAdmin = session?.user?.role === "admin";

  const navItems = [
    { href: "/preventivi", label: "I miei preventivi" },
    { href: "/preventivi/nuovo", label: "Nuovo preventivo" },
    ...(isAdmin
      ? [
          { href: "/admin/listino", label: "Gestione listino" },
          { href: "/admin/utenti", label: "Utenti" },
        ]
      : []),
  ];

  return (
    <nav className="bg-mc-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/preventivi" className="flex items-center gap-3">
          <span className="text-mc-orange font-bold uppercase tracking-wider text-sm">
            Metodo Cantiere®
          </span>
          <span className="text-sm italic text-mc-muted hidden md:inline">Preventivatore</span>
        </Link>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1 md:gap-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm px-3 py-2 rounded transition-colors ${
                  pathname === item.href || (item.href !== "/preventivi" && pathname?.startsWith(item.href))
                    ? "bg-mc-orange text-white"
                    : "hover:text-mc-orange"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3 pl-4 border-l border-white/20">
            <span className="text-sm text-white/70 hidden md:inline">{session?.user?.name}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm text-white/70 hover:text-white"
            >
              Esci
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
