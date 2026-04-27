"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { BrandLogo } from "./BrandLogo";

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isAdmin = session?.user?.role === "admin";

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Chiudi user menu cliccando fuori
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Chiudi mobile menu al cambio pagina
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const commercialItems = [
    { href: "/preventivi", label: "I miei preventivi" },
    { href: "/preventivi/nuovo", label: "Nuovo preventivo" },
  ];

  const adminItems = isAdmin
    ? [
        { href: "/admin/listino", label: "Gestione listino" },
        { href: "/admin/codici-sconto", label: "Codici sconto" },
        { href: "/admin/roi-settings", label: "Impostazioni ROI" },
        { href: "/admin/utenti", label: "Utenti" },
      ]
    : [];

  const isActive = (href: string) => {
    if (href === "/preventivi") return pathname === "/preventivi";
    return pathname === href || pathname?.startsWith(href + "/");
  };

  const userInitials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  return (
    <nav
      className="sticky top-0 z-40"
      style={{
        background: "var(--mc-nav-bg)",
        borderBottom: "1px solid var(--mc-nav-border)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Brand */}
          <Link href="/preventivi" className="flex items-center gap-3 group">
            <BrandLogo className="hidden sm:inline-flex" size="md" priority variant="always-dark" />
            <div
              className="sm:hidden w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
              style={{
                background: "var(--mc-accent)",
                color: "#FFFFFF",
                boxShadow: "0 1px 3px rgba(255, 106, 0, 0.4)",
              }}
              aria-label="Metodo Cantiere"
            >
              M
            </div>
          </Link>

          {/* Nav desktop */}
          <div className="hidden md:flex items-center gap-1">
            {commercialItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${isActive(item.href) ? "nav-link-active" : ""}`}
              >
                {item.label}
              </Link>
            ))}
            {adminItems.length > 0 && (
              <>
                <div
                  className="mx-2 h-5 w-px"
                  style={{ background: "var(--mc-nav-border)" }}
                  aria-hidden="true"
                />
                {adminItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-link ${isActive(item.href) ? "nav-link-active" : ""}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </>
            )}
          </div>

          {/* Azioni destra */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 px-1.5 py-1.5 rounded-lg transition-colors"
                style={{ color: "var(--mc-nav-text)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
                aria-label="Menu utente"
                aria-expanded={userMenuOpen}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: "var(--mc-accent-soft)",
                    color: "var(--mc-accent)",
                    border: "1px solid var(--mc-accent-ring)",
                  }}
                >
                  {userInitials}
                </div>
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="hidden sm:block"
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {userMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-60 rounded-xl overflow-hidden animate-fade-in"
                  style={{
                    background: "var(--mc-bg-elevated)",
                    border: "1px solid var(--mc-border)",
                    boxShadow: "var(--mc-shadow-lg)",
                  }}
                  role="menu"
                >
                  <div
                    className="px-4 py-3"
                    style={{ borderBottom: "1px solid var(--mc-border)" }}
                  >
                    <div className="text-sm font-semibold" style={{ color: "var(--mc-text)" }}>
                      {session?.user?.name}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--mc-text-muted)" }}>
                      {session?.user?.email}
                    </div>
                    {isAdmin && (
                      <span className="badge badge-accent mt-2">
                        <span className="badge-dot" />
                        Admin
                      </span>
                    )}
                  </div>

                  {/* Menu mobile: mostra le voci di navigazione dentro il dropdown su mobile */}
                  <div className="md:hidden py-1" style={{ borderBottom: "1px solid var(--mc-border)" }}>
                    {[...commercialItems, ...adminItems].map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block px-4 py-2 text-sm transition-colors"
                        style={{
                          color: isActive(item.href)
                            ? "var(--mc-accent)"
                            : "var(--mc-text)",
                          fontWeight: isActive(item.href) ? 600 : 400,
                        }}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      signOut({ callbackUrl: "/login" });
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm font-medium transition-colors"
                    style={{ color: "var(--mc-danger)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--mc-danger-bg)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    Esci
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
