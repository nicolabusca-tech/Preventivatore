"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  createdAt?: string;
};

function formatDate(d: string | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function AdminUtentiPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "danger"; text: string } | null>(null);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("commerciale");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

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
  }

  async function handleCreateUser() {
    setFormError("");
    setMessage(null);
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      setFormError("Nome, email e password sono obbligatori.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        email: newEmail.trim(),
        password: newPassword,
        role: newRole,
      }),
    });
    setSaving(false);

    if (res.ok) {
      resetForm();
      setShowForm(false);
      setMessage({ type: "success", text: "Utente creato." });
      setTimeout(() => setMessage(null), 3000);
      fetchUsers();
    } else {
      const data = await res.json().catch(() => ({}));
      setFormError(data?.error || "Errore nella creazione.");
    }
  }

  async function toggleActive(user: UserRow) {
    setMessage(null);
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !user.active }),
    });
    if (res.ok) {
      setMessage({ type: "success", text: `Utente ${user.active ? "disattivato" : "attivato"}.` });
      setTimeout(() => setMessage(null), 2500);
      fetchUsers();
    } else {
      setMessage({ type: "danger", text: "Errore aggiornando lo stato." });
    }
  }

  async function deleteUser(user: UserRow) {
    if (user.id === session?.user?.id) return;
    const ok = window.confirm(`Cancellare l'utente ${user.name}? L'azione è irreversibile.`);
    if (!ok) return;
    const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    if (res.ok) {
      setMessage({ type: "success", text: "Utente eliminato." });
      setTimeout(() => setMessage(null), 2500);
      fetchUsers();
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage({ type: "danger", text: data?.error || "Errore durante l'eliminazione." });
    }
  }

  async function resetPassword(user: UserRow) {
    const newPass = window.prompt(`Nuova password per ${user.name}:`);
    if (!newPass) return;
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPass }),
    });
    if (res.ok) {
      setMessage({ type: "success", text: "Password aggiornata." });
      setTimeout(() => setMessage(null), 2500);
    } else {
      setMessage({ type: "danger", text: "Errore aggiornando la password." });
    }
  }

  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((u) => u.active).length,
      admin: users.filter((u) => u.role === "admin").length,
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
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
        <div>
          <h1 className="text-4xl mb-1">Utenti</h1>
          <p className="text-sm italic" style={{ color: "var(--mc-text-secondary)" }}>
            Gestione team commerciale e permessi.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 text-xs" style={{ color: "var(--mc-text-muted)" }}>
            <span>
              <strong style={{ color: "var(--mc-text)" }}>{stats.active}</strong> attivi
            </span>
            <span aria-hidden="true">·</span>
            <span>
              <strong style={{ color: "var(--mc-text)" }}>{stats.admin}</strong> admin
            </span>
            <span aria-hidden="true">·</span>
            <span>
              <strong style={{ color: "var(--mc-text)" }}>{stats.total}</strong> totali
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setMessage(null);
              if (showForm) resetForm();
              setShowForm((v) => !v);
            }}
            className="btn-primary"
          >
            {showForm ? "Annulla" : "Nuovo utente"}
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`alert ${message.type === "success" ? "alert-success" : "alert-danger"} mb-4 animate-fade-in`}
        >
          <span>{message.text}</span>
        </div>
      )}

      {showForm && (
        <div className="card-accent p-5 sm:p-6 mb-6 animate-fade-in" style={{ background: "var(--mc-accent-soft)" }}>
          <h2 className="text-2xl mb-4">Nuovo utente</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Nome</label>
              <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="nome@azienda.it"
              />
            </div>
            <div>
              <label className="label">Password iniziale</label>
              <input
                type="text"
                className="input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <p className="helper-text">Consiglio: cambia la password al primo accesso.</p>
            </div>
            <div>
              <label className="label">Ruolo</label>
              <select className="input" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                <option value="commerciale">Commerciale</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {formError && <div className="alert alert-danger mt-4">{formError}</div>}

          <div className="flex items-center gap-2 mt-4">
            <button type="button" onClick={handleCreateUser} disabled={saving} className="btn-primary">
              {saving ? "Creazione..." : "Crea utente"}
            </button>
            <button
              type="button"
              className="btn-ghost"
              disabled={saving}
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
            >
              Chiudi
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="mc-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Ruolo</th>
                <th>Stato</th>
                <th>Creato</th>
                <th className="text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-semibold">{u.name}</td>
                  <td className="text-sm" style={{ color: "var(--mc-text-secondary)" }}>
                    {u.email}
                  </td>
                  <td>
                    <span className={`badge ${u.role === "admin" ? "badge-accepted" : "badge-sent"}`}>
                      <span className="badge-dot" />
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.active ? "badge-accepted" : "badge-expired"}`}>
                      <span className="badge-dot" />
                      {u.active ? "Attivo" : "Disattivato"}
                    </span>
                  </td>
                  <td className="text-sm" style={{ color: "var(--mc-text-secondary)" }}>
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => resetPassword(u)}
                        className="btn-ghost text-xs px-2 py-1"
                      >
                        Reset password
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleActive(u)}
                        className="btn-ghost text-xs px-2 py-1"
                      >
                        {u.active ? "Disattiva" : "Attiva"}
                      </button>
                      {u.id !== session?.user?.id && (
                        <button
                          type="button"
                          onClick={() => deleteUser(u)}
                          className="btn-ghost text-xs px-2 py-1"
                          style={{ color: "var(--mc-danger)" }}
                        >
                          Elimina
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

