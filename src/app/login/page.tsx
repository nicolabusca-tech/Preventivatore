"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Email o password non corretti.");
    } else {
      router.push("/preventivi");
      router.refresh();
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: "var(--mc-bg)" }}
    >
      {/* Accenti decorativi di sfondo */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 600px 400px at 10% 0%, var(--mc-accent-soft) 0%, transparent 60%),
            radial-gradient(ellipse 500px 300px at 90% 100%, var(--mc-accent-soft) 0%, transparent 50%)
          `,
        }}
      />

      {/* Theme toggle in alto a destra */}
      <div className="absolute top-5 right-5 z-10">
        <ThemeToggle />
      </div>

      {/* Contenuto */}
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md animate-fade-in">
          {/* Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-6">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl"
                style={{
                  background: "var(--mc-accent)",
                  color: "#FFFFFF",
                  boxShadow: "0 4px 12px rgba(255, 106, 0, 0.35)",
                }}
              >
                M
              </div>
              <div className="text-left leading-none">
                <div
                  className="text-xs font-bold uppercase tracking-[0.22em]"
                  style={{ color: "var(--mc-accent)" }}
                >
                  Metodo Cantiere
                </div>
                <div
                  className="text-[10px] font-medium mt-1"
                  style={{ color: "var(--mc-text-muted)", letterSpacing: "0.12em" }}
                >
                  PREVENTIVATORE
                </div>
              </div>
            </div>

            <h1 className="text-4xl sm:text-5xl mb-2">Accedi</h1>
            <p
              className="text-sm italic"
              style={{ color: "var(--mc-text-secondary)" }}
            >
              Dal contatto al contratto, passo passo.
            </p>
          </div>

          {/* Form */}
          <div
            className="card p-7 sm:p-8"
            style={{ boxShadow: "var(--mc-shadow-lg)" }}
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                  placeholder="nome@metodocantiere.com"
                />
              </div>

              <div>
                <label className="label" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="input pr-11"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors hover:bg-[var(--mc-border)]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mc-accent)]"
                    style={{ color: "var(--mc-text-muted)" }}
                    aria-pressed={showPassword}
                    aria-label={
                      showPassword
                        ? "Nascondi password"
                        : "Mostra password scritta"
                    }
                  >
                    {showPassword ? (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="alert alert-danger">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="flex-shrink-0 mt-0.5"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="btn-primary w-full justify-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      aria-hidden="true"
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Accesso in corso...
                  </>
                ) : (
                  <>
                    Accedi
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      aria-hidden="true"
                    >
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>

          <p
            className="text-center text-xs mt-6"
            style={{ color: "var(--mc-text-muted)" }}
          >
            Accesso riservato al team Metodo Cantiere.
            <br />
            Se hai problemi di accesso contatta l&apos;amministratore.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer
        className="py-5 text-center text-xs relative z-10"
        style={{ color: "var(--mc-text-muted)" }}
      >
        © Metodo Cantiere® — strumento interno
      </footer>
    </div>
  );
}
