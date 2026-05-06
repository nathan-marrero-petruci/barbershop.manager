import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { apiFetch } from "../../api/client.js";
import { confirmToast } from "../../api/admin-utils.jsx";

export default function ServicesSection() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", duration: 30, price: 0, category: "both" });
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);

  async function load() {
    setLoading(true);
    const res = await apiFetch("/admin/services");
    if (!res) return;
    if (!res.ok) { toast.error("Erro ao carregar serviços"); setLoading(false); return; }
    setServices(await res.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    const payload = { name: form.name.trim(), duration: Number(form.duration), price: Number(form.price), category: form.category };
    if (!payload.name) return;
    setCreating(true);
    const res = await apiFetch("/admin/services", { method: "POST", body: JSON.stringify(payload) });
    setCreating(false);
    if (!res) return;
    if (!res.ok) { toast.error(await res.text()); return; }
    setForm({ name: "", duration: 30, price: 0, category: "both" });
    await load();
  }

  async function saveEdit() {
    const payload = { name: editing.name.trim(), duration: Number(editing.duration), price: Number(editing.price), category: editing.category };
    setSaving(true);
    const res = await apiFetch(`/admin/services/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
    setSaving(false);
    if (!res) return;
    if (!res.ok) { toast.error(await res.text()); return; }
    setEditing(null);
    await load();
  }

  async function remove(id) {
    if (!(await confirmToast("Apagar serviço?"))) return;
    const res = await apiFetch(`/admin/services/${id}`, { method: "DELETE" });
    if (!res) return;
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.message || "Erro ao apagar"); return; }
    toast.success("Serviço removido.");
    await load();
  }

  return (
    <div className="admin-section-card">
      <h3 className="admin-section-title">Serviços</h3>
      {loading ? <p className="loading-msg">Carregando...</p> : (
        <table>
          <thead><tr><th>Nome</th><th>Duração</th><th>Preço</th><th>Tipo</th><th>Ações</th></tr></thead>
          <tbody>
            {services.map(s => (
              <tr key={s.id}>
                {editing?.id === s.id ? (
                  <>
                    <td><input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></td>
                    <td><input type="number" value={editing.duration} min={1} style={{ width: 80 }} onChange={e => setEditing({ ...editing, duration: e.target.value })} /></td>
                    <td><input type="number" value={editing.price} min={0} step="0.01" style={{ width: 90 }} onChange={e => setEditing({ ...editing, price: e.target.value })} /></td>
                    <td>
                      <select value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })}>
                        <option value="hair">Cabelo</option>
                        <option value="beard">Barba</option>
                        <option value="both">Ambos</option>
                      </select>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button onClick={saveEdit} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
                        <button onClick={() => setEditing(null)} disabled={saving}>Cancelar</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{s.name}</td>
                    <td>{s.duration} min</td>
                    <td>R$ {Number(s.price).toFixed(2)}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{{ hair: 'Cabelo', beard: 'Barba', both: 'Ambos' }[s.category] ?? s.category}</td>
                    <td>
                      <div className="row-actions">
                        <button onClick={() => setEditing({ id: s.id, name: s.name, duration: s.duration, price: s.price, category: s.category || 'both' })}>Editar</button>
                        <button className="btn-danger" onClick={() => remove(s.id)}>Apagar</button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="admin-add-row">
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome do serviço" />
        <input type="number" value={form.duration} min={1} style={{ width: 90 }} placeholder="Duração (min)" onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
        <input type="number" value={form.price} min={0} step="0.01" style={{ width: 100 }} placeholder="Preço (R$)" onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
        <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
          <option value="hair">Cabelo</option>
          <option value="beard">Barba</option>
          <option value="both">Ambos</option>
        </select>
        <button onClick={create} disabled={creating || !form.name.trim()}>{creating ? "Criando..." : "+ Adicionar"}</button>
      </div>
    </div>
  );
}
