"use client";

import { useEffect, useState } from "react";
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

  // Form nuovo utente
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("commerciale");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "admin") {
      router.push("/preventivi");
      return;
    }
    fetchUsers();
  }, [session, status]);

  async function fetchUsers() {
    setLoading(true);
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  }

  async function handleCreateUser() {
    setFormError("");
    if (!newName || !newEmail || !newPassword) {
      setFormError("Tutti i campi sono obbligatori");
      return;
    }
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, email: newEmail, password: newPassword, role: newRole }),
    });
    if (res.ok) {
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("commerciale");
      setShowForm(false);
      fetchUsers();
    } else {
      const data = await res.json();
      setFormError(data.error || "Errore");
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
    if (!confirm(`Cancellare l'utente ${user.name}? L'azione è irreversibile.`)) return;
    const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    if (res.ok) fetchUsers();
  }

  async function resetPassword(user: User) {
    const newPass = prompt(`Nuova password per ${user.name}:`);
    if (!newPass) return;
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPass }),
    });
    if (res.ok) alert("Password aggiornata");
  }

  if (status === "loading" || loading) return <div className="text-center py-12 text-mc-muted">Caricamento...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl mb-1">Gestione utenti</h1>
          <p className="text-mc-muted italic">Team commerciale Metodo Cantiere</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? "Annulla" : "+ Nuovo utente"}
        </button>
      </div>

      {showForm && (
        <div className="card p-6 mb-6 bg-orange-50">
          <h2 className="text-xl mb-4">Nuovo utente</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Nome</label>
              <input type="text" className="input" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>
            <div>
              <label className="label">Password iniziale</label>
              <input
                type="text"
                className="input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Ruolo</label>
              <select className="input" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                <option value="commerciale">Commerciale</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          {formError && <p className="text-mc-red text-sm mt-2">{formError}</p>}
          <button onClick={handleCreateUser} className="btn-primary mt-4">
            Crea utente
          </button>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-mc-beige-warm">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-semibold">Nome</th>
              <th className="text-left px-4 py-3 text-sm font-semibold">Email</th>
              <th className="text-left px-4 py-3 text-sm font-semibold">Ruolo</th>
              <th className="text-left px-4 py-3 text-sm font-semibold">Stato</th>
              <th className="text-right px-4 py-3 text-sm font-semibold">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-mc-border">
                <td className="px-4 py-3 font-semibold">{u.name}</td>
                <td className="px-4 py-3 text-sm">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${u.role === "admin" ? "badge-accepted" : "badge-sent"}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${u.active ? "badge-accepted" : "badge-expired"}`}>
                    {u.active ? "Attivo" : "Disattivato"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  <button onClick={() => resetPassword(u)} className="text-mc-orange hover:underline mr-3">
                    Reset password
                  </button>
                  <button onClick={() => toggleActive(u)} className="text-mc-orange hover:underline mr-3">
                    {u.active ? "Disattiva" : "Attiva"}
                  </button>
                  {u.id !== session?.user?.id && (
                    <button onClick={() => deleteUser(u)} className="text-mc-red hover:underline">
                      Elimina
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
