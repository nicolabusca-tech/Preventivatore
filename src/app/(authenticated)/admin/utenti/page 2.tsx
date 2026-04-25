"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
};

export default function AdminUtentiPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
  const [resetPassFor, setResetPassFor] = useState<User | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [resetPassError, setResetPassError] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "danger"; text: string } | null>(
    null
  );

  // Form nuovo utente
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("commerciale");
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "admin") {
      router.push("/preventivi");
      return;
    }
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status]);

  async function fetchUsers() {
    setLoading(true);
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  function resetForm() {
    setNewName("");
    setNewEmail("");
    setNewPassword("");
    setNewRole("commerciale");
    setFormError("");
    setShowNewPassword(false);
  }

  async function handleCreateUser() {
    setFormError("");
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      setFormError("Tutti i campi sono obbligatori.");
      return;
    }
    if (newPassword.length < 8) {
      setFormError("La password deve essere di almeno 8 caratteri.");
      return;
    }
    setCreating(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        email: newEmail,
        password: newPassword,
        role: newRole,
      }),
    });
    setCreating(false);
    if (res.ok) {
      resetForm();
      setShowForm(false);
      setMessage({ type: "success", text: "Utente creato." });
      setTimeout(() => setMessage(null), 3000);
      fetchUsers();
    } else {
      const data = await res.json();
      setFormError(data.error || "Errore nella creazione");
    }
  }

  async function toggleActive(user: User) {
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !user.active }),
    });
    if (res.ok) fetchUsers();
  }

  async function deleteUser(user: User) {
    const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    if (res.ok) {
      setMessage({ type: "success", text: `Utente ${user.name} eliminato.` });
      setTimeout(() => setMessage(null), 3000);
      fetchUsers();
    } else {
      setMessage({ type: "danger", text: "Errore durante l'eliminazione." });
    }
    setConfirmDelete(null);
  }

  async function resetPasswordConfirm() {
    if (!resetPassFor) return;
    setResetPassError("");
    if (newPasswordInput.length < 8) {
      setResetPassError("La password deve essere di almeno 8 caratteri.");
      return;
    }
    const res = await fetch(`/api/users/${resetPassFor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPasswordInput }),
    });
    if (res.ok) {
      setMessage({
        type: "success",
        text: `Password aggiornata per ${resetPassFor.name}.`,
      });
      setTimeout(() => setMessage(null), 3000);
      setResetPassFor(null);
      setNewPasswordInput("");
    } else {
      setResetPassError("Errore nell'aggiornamento della password.");
    }
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((u) => u.active).length,
      admin: users.filter((u) => u.role === "admin").length,
      commerciale: users.filter((u) => u.role === "commerciale").length,
    };
  }, [users]);

  if (status === "loading" || loading) {
    return (
      <div className="py-20 text-center" style={{ color: "var(--mc-text-muted)" }}>
        <div className="inline-flex items-center gap-2">
          <svg
            className="animate-spin"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden="true"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <span className="text-sm">Caricamento utenti...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
        <div>
          <h1 className="text-4xl mb-1">Gestione utenti</h1>
          <p className="text-sm italic" style={{ color: "var(--mc-text-secondary)" }}>
            Team commerciale Metodo Cantiere.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (showForm) {
              resetForm();
              setShowForm(false);
            } else {
              setShowForm(true);
            }
          }}
          className="btn-primary"
        >
          {showForm ? (
            "Annulla"
          ) : (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Nuovo utente
            </>
          )}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="stat-card">
          <div className="stat-label">Totali</div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-sub">utenti</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Attivi</div>
          <div className="stat-value">{stats.active}</div>
          <div className="stat-sub">possono accedere</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Admin</div>
          <div className="stat-value">{stats.admin}</div>
          <div className="stat-sub">amministratori</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Commerciali</div>
          <div className="stat-value">{stats.commerciale}</div>
          <div className="stat-sub">team vendita</div>
        </div>
      </div>

      {/* Toast */}
      {message && (
        <div
          className={`alert ${
            message.type === "success" ? "alert-success" : "alert-danger"
          } mb-4 animate-fade-in`}
        >
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
            {message.type === "success" ? (
              <polyline points="20 6 9 17 4 12" />
            ) : (
              <>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
              </>
            )}
          </svg>
          <span>{message.text}</span>
        </div>
      )}

      {/* Form nuovo utente */}
      {showForm && (
        <div
          className="card-accent p-5 sm:p-6 mb-6 animate-fade-in"
          style={{ background: "var(--mc-accent-soft)" }}
        >
          <h2 className="text-2xl mb-4">Nuovo utente</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="newName">
                Nome <span style={{ color: "var(--mc-accent)" }}>*</span>
              </label>
              <input
                id="newName"
                type="text"
                className="input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Mario Rossi"
                autoFocus
              />
            </div>
            <div>
              <label className="label" htmlFor="newEmail">
                Email <span style={{ color: "var(--mc-accent)" }}>*</span>
              </label>
              <input
                id="newEmail"
                type="email"
                className="input"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="mario@metodocantiere.com"
              />
            </div>
            <div>
              <label className="label" htmlFor="newPassword">
                Password iniziale <span style={{ color: "var(--mc-accent)" }}>*</span>
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  className="input pr-10"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="min. 8 caratteri"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded"
                  style={{ color: "var(--mc-text-muted)" }}
                  aria-label={showNewPassword ? "Nascondi password" : "Mostra password"}
                >
                  {showNewPassword ? (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="helper-text">
                Comunicala all&apos;utente, sarà cambiabile via &quot;Reset password&quot;.
              </p>
            </div>
            <div>
              <label className="label" htmlFor="newRole">
                Ruolo
              </label>
              <select
                id="newRole"
                className="input"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                <option value="commerciale">Commerciale</option>
                <option value="admin">Admin</option>
              </select>
              <p className="helper-text">
                Admin: accesso a listino, codici, utenti. Commerciale: solo
                preventivi propri.
              </p>
            </div>
          </div>

          {formError && (
            <div className="alert alert-danger mt-4">
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
              </svg>
              <span>{formError}</span>
            </div>
          )}

          <div className="flex items-center gap-2 mt-4">
            <button
              type="button"
              onClick={handleCreateUser}
              disabled={creating}
              className="btn-primary"
            >
              {creating ? "Creazione..." : "Crea utente"}
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
              className="btn-ghost"
              disabled={creating}
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Tabella utenti */}
      {users.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-sm" style={{ color: "var(--mc-text-muted)" }}>
            Nessun utente nel sistema.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="mc-table">
              <thead>
                <tr>
                  <th>Utente</th>
                  <th>Email</th>
                  <th>Ruolo</th>
                  <th>Stato</th>
                  <th className="text-right">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isMe = u.id === session?.user?.id;

                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{
                              background:
                                u.role === "admin"
                                  ? "var(--mc-accent-soft)"
                                  : "var(--mc-info-bg)",
                              color:
                                u.role === "admin"
                                  ? "var(--mc-accent)"
                                  : "var(--mc-info)",
                              border: `1px solid ${
                                u.role === "admin"
                                  ? "var(--mc-accent-ring)"
                                  : "var(--mc-info-border)"
                              }`,
                            }}
                          >
                            {getInitials(u.name)}
                          </div>
                          <div>
                            <div className="font-semibold">
                              {u.name}
                              {isMe && (
                                <span
                                  className="text-xs ml-2 italic font-normal"
                                  style={{ color: "var(--mc-text-muted)" }}
                                >
                                  (tu)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="text-sm" style={{ color: "var(--mc-text-secondary)" }}>
                        {u.email}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            u.role === "admin" ? "badge-accent" : "badge-sent"
                          }`}
                        >
                          <span className="badge-dot" />
                          {u.role === "admin" ? "Admin" : "Commerciale"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            u.active ? "badge-accepted" : "badge-expired"
                          }`}
                        >
                          <span className="badge-dot" />
                          {u.active ? "Attivo" : "Disattivato"}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setResetPassFor(u);
                              setNewPasswordInput("");
                              setResetPassError("");
                            }}
                            className="btn-ghost text-xs px-2 py-1"
                          >
                            Reset password
                          </button>
                          {!isMe && (
                            <>
                              <button
                                type="button"
                                onClick={() => toggleActive(u)}
                                className="btn-ghost text-xs px-2 py-1"
                              >
                                {u.active ? "Disattiva" : "Attiva"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDelete(u)}
                                className="btn-ghost text-xs px-2 py-1"
                                style={{ color: "var(--mc-danger)" }}
                              >
                                Elimina
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal conferma eliminazione utente */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="card p-6 max-w-md w-full"
            style={{ boxShadow: "var(--mc-shadow-lg)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl mb-2">Eliminare l&apos;utente?</h3>
            <p className="text-sm mb-1" style={{ color: "var(--mc-text-secondary)" }}>
              Stai per eliminare{" "}
              <span className="font-semibold" style={{ color: "var(--mc-text)" }}>
                {confirmDelete.name}
              </span>
              .
            </p>
            <p className="text-sm" style={{ color: "var(--mc-text-muted)" }}>
              L&apos;azione è irreversibile. L&apos;utente non potrà più accedere al
              sistema, ma i preventivi che ha creato resteranno visibili.
            </p>

            <div className="flex items-center gap-2 mt-5">
              <button
                type="button"
                onClick={() => deleteUser(confirmDelete)}
                className="btn-danger"
              >
                Sì, elimina
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="btn-ghost"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal reset password */}
      {resetPassFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => {
            setResetPassFor(null);
            setNewPasswordInput("");
            setResetPassError("");
          }}
        >
          <div
            className="card p-6 max-w-md w-full"
            style={{ boxShadow: "var(--mc-shadow-lg)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl mb-2">Reset password</h3>
            <p className="text-sm mb-4" style={{ color: "var(--mc-text-secondary)" }}>
              Imposta una nuova password per{" "}
              <span className="font-semibold" style={{ color: "var(--mc-text)" }}>
                {resetPassFor.name}
              </span>
              . Dovrai comunicargliela manualmente.
            </p>

            <div>
              <label className="label">Nuova password</label>
              <input
                type="text"
                className="input"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                placeholder="min. 8 caratteri"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && resetPasswordConfirm()}
              />
            </div>

            {resetPassError && (
              <div className="alert alert-danger mt-3">
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
                </svg>
                <span>{resetPassError}</span>
              </div>
            )}

            <div className="flex items-center gap-2 mt-5">
              <button
                type="button"
                onClick={resetPasswordConfirm}
                className="btn-primary"
              >
                Aggiorna password
              </button>
              <button
                type="button"
                onClick={() => {
                  setResetPassFor(null);
                  setNewPasswordInput("");
                  setResetPassError("");
                }}
                className="btn-ghost"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
