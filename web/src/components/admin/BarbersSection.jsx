import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { apiFetch } from "../../api/client.js";
import { confirmToast } from "../../api/admin-utils.jsx";

export default function BarbersSection({ barbers, onChanged }) {
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);

  async function reload() {
    setLoading(true);
    await onChanged();
    setLoading(false);
  }

  async function create() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    const res = await apiFetch("/admin/barbers", { method: "POST", body: JSON.stringify({ name }) });
    setCreating(false);
    if (!res) return;
    if (!res.ok) { toast.error(await res.text()); return; }
    setNewName("");
    await reload();
  }

  async function saveEdit() {
    const name = editing.name.trim();
    if (!name) return;
    setSaving(true);
    const res = await apiFetch(`/admin/barbers/${editing.id}`, { method: "PUT", body: JSON.stringify({ name }) });
    setSaving(false);
    if (!res) return;
    if (!res.ok) { toast.error(await res.text()); return; }
    setEditing(null);
    await reload();
  }

  async function remove(id) {
    if (!(await confirmToast("Apagar barbeiro?"))) return;
    const res = await apiFetch(`/admin/barbers/${id}`, { method: "DELETE" });
    if (!res) return;
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.message || "Erro ao apagar"); return; }
    toast.success("Barbeiro removido.");
    await reload();
  }

  return (
    <div className="admin-section-card">
      <h3 className="admin-section-title">Barbeiros</h3>
      {loading ? <p className="loading-msg">Carregando...</p> : (
        <table>
          <thead><tr><th>Nome</th><th>Ações</th></tr></thead>
          <tbody>
            {barbers.map(b => (
              <tr key={b.id}>
                <td>
                  {editing?.id === b.id
                    ? <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
                    : b.name}
                </td>
                <td>
                  <div className="row-actions">
                    {editing?.id === b.id ? (
                      <>
                        <button onClick={saveEdit} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
                        <button onClick={() => setEditing(null)} disabled={saving}>Cancelar</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setEditing({ id: b.id, name: b.name })}>Editar</button>
                        <button className="btn-danger" onClick={() => remove(b.id)}>Apagar</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="admin-add-row">
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome do novo barbeiro" />
        <button onClick={create} disabled={creating || !newName.trim()}>
          {creating ? "Criando..." : "+ Adicionar"}
        </button>
      </div>
    </div>
  );
}
