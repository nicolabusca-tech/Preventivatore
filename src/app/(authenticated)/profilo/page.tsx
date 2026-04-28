"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";

type MeResponse = {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  createdAt: string;
};

export default function ProfiloPage() {
  const { data: session, status } = useSession();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "danger"; text: string } | null>(null);

  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [saving, setSaving] = useState(false);
  const [requiresReauth, setRequiresReauth] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) return;
    fetchMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status]);

  async function fetchMe() {
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/me");
    const data = await res.json().catch(() => null);
    if (res.ok && data) {
      setMe(data);
      setEmail(String(data.email || ""));
    } else {
      setMessage({ type: "danger", text: data?.error || "Errore nel caricamento profilo" });
    }
    setLoading(false);
  }

  async function save() {
    setMessage(null);
    setRequiresReauth(false);

    const wantsEmail = email.trim() && email.trim().toLowerCase() !== (me?.email || "").toLowerCase();
    const wantsPassword = newPassword.trim().length > 0 || newPassword2.trim().length > 0;

    if (!wantsEmail && !wantsPassword) {
      setMessage({ type: "danger", text: "Nessuna modifica da salvare." });
      return;
    }

    if (!currentPassword.trim()) {
      setMessage({ type: "danger", text: "Inserisci la password attuale." });
      return;
    }

    if (wantsPassword) {
      if (newPassword.length < 8) {
        setMessage({ type: "danger", text: "La nuova password deve essere di almeno 8 caratteri." });
        return;
      }
      if (newPassword !== newPassword2) {
        setMessage({ type: "danger", text: "Le nuove password non coincidono." });
        return;
      }
    }

    setSaving(true);
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: wantsEmail ? email.trim() : undefined,
        currentPassword,
        newPassword: wantsPassword ? newPassword : undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setMessage({ type: "danger", text: data?.error || "Errore nel salvataggio." });
      return;
    }

    setMessage({ type: "success", text: "Profilo aggiornato." });
    setRequiresReauth(!!data?.requiresReauth);
    setCurrentPassword("");
    setNewPassword("");
    setNewPassword2("");
    await fetchMe();
  }

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="mb-7">
        <h1 className="text-2xl sm:text-4xl mb-1">Profilo</h1>
        <p className="text-sm italic" style={{ color: "var(--mc-text-secondary)" }}>
          Aggiorna email e password del tuo account.
        </p>
      </div>

      {message && (
        <div className="mb-4">
          <div className={`alert alert-${message.type}`}>{message.text}</div>
        </div>
      )}

      {requiresReauth && (
        <div className="mb-4">
          <div className="alert alert-warning">
            Per applicare le modifiche, fai logout e rientra.
            <div className="mt-3">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                Esci e rientra
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card p-5">
        {loading ? (
          <div className="p-6 text-sm" style={{ color: "var(--mc-text-muted)" }}>
            Caricamento...
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <div className="text-xs font-semibold mb-1" style={{ color: "var(--mc-text-muted)" }}>
                Nome
              </div>
              <div className="text-sm font-semibold" style={{ color: "var(--mc-text)" }}>
                {me?.name}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "var(--mc-text-muted)" }}>
                Ruolo: {me?.role}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--mc-text-muted)" }}>
                Email
              </label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@azienda.it"
              />
            </div>

            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--mc-text-muted)" }}>
                Password attuale (obbligatoria per salvare)
              </label>
              <input
                className="input"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Password attuale"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--mc-text-muted)" }}>
                  Nuova password
                </label>
                <input
                  className="input"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 caratteri"
                />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--mc-text-muted)" }}>
                  Ripeti nuova password
                </label>
                <input
                  className="input"
                  type="password"
                  value={newPassword2}
                  onChange={(e) => setNewPassword2(e.target.value)}
                  placeholder="Ripeti"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" className="btn-ghost" onClick={fetchMe} disabled={saving}>
                Ripristina
              </button>
              <button type="button" className="btn-primary" onClick={save} disabled={saving}>
                {saving ? "Salvataggio..." : "Salva modifiche"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

