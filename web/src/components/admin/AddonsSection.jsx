import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { apiFetch } from "../../api/client.js";
import { confirmToast } from "../../api/admin-utils.jsx";

export default function AddonsSection() {
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", price: 0, isHairCompatible: true, isBeardCompatible: true, extraMinutes: 0 });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);

  async function load() {
    setLoading(true);
    const res = await apiFetch("/admin/addons");
    if (!res) return;
    if (!res.ok) { toast.error("Erro ao carregar add-ons"); setLoading(false); return; }
    setAddons(await res.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    const payload = { name: form.name.trim(), price: Number(form.price), isHairCompatible: form.isHairCompatible, isBeardCompatible: form.isBeardCompatible, extraMinutes: Number(form.extraMinutes) };
    if (!payload.name) return;
    setCreating(true);
    const res = await apiFetch("/admin/addons", { method: "POST", body: JSON.stringify(payload) });
    setCreating(false);
    if (!res) return;
    if (!res.ok) { toast.error(await res.text()); return; }
    setForm({ name: "", price: 0, isHairCompatible: true, isBeardCompatible: true, extraMinutes: 0 });
    await load();
  }

  async function saveEdit() {
    const payload = { name: editing.name.trim(), price: Number(editing.price), isHairCompatible: editing.isHairCompatible, isBeardCompatible: editing.isBeardCompatible, extraMinutes: Number(editing.extraMinutes) };
    const res = await apiFetch(`/admin/addons/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
    if (!res) return;
    if (!res.ok) { toast.error(await res.text()); return; }
    setEditing(null);
    await load();
  }

  async function remove(id) {
    if (!(await confirmToast("Apagar add-on?"))) return;
    const res = await apiFetch(`/admin/addons/${id}`, { method: "DELETE" });
    if (!res) return;
    if (!res.ok) { toast.error("Erro ao apagar"); return; }
    toast.success("Add-on removido.");
    await load();
  }

  const compat = (a) => [a.isHairCompatible && "Cabelo", a.isBeardCompatible && "Barba"].filter(Boolean).join(" + ") || "—";

  return (
    <div className="admin-section-card">
      <h3 className="admin-section-title">Serviços Extras</h3>
      {loading ? <p className="loading-msg">Carregando...</p> : (
        <table>
          <thead><tr><th>Nome</th><th>Preço</th><th>Compatível</th><th>Tempo Extra</th><th>Ações</th></tr></thead>
          <tbody>
            {addons.map(a => (
              <tr key={a.id}>
                {editing?.id === a.id ? (
                  <>
                    <td><input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></td>
                    <td><input type="number" value={editing.price} min={0} step="0.01" style={{ width: 90 }} onChange={e => setEditing({ ...editing, price: e.target.value })} /></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginRight: 10 }}><input type="checkbox" style={{ margin: 0 }} checked={editing.isHairCompatible} onChange={e => setEditing({ ...editing, isHairCompatible: e.target.checked })} /><span>Cabelo</span></label>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><input type="checkbox" style={{ margin: 0 }} checked={editing.isBeardCompatible} onChange={e => setEditing({ ...editing, isBeardCompatible: e.target.checked })} /><span>Barba</span></label>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input type="number" min={0} max={120} value={editing.extraMinutes} style={{ width: 60 }} onChange={e => setEditing({ ...editing, extraMinutes: e.target.value })} />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>min</span>
                      </div>
                    </td>
                    <td>
                      <div className="row-actions" style={{ flexWrap: 'nowrap' }}>
                        <button onClick={saveEdit}>Salvar</button>
                        <button onClick={() => setEditing(null)}>Cancelar</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{a.name}</td>
                    <td>R$ {Number(a.price).toFixed(2)}</td>
                    <td>{compat(a)}</td>
                    <td>{a.extraMinutes > 0 ? <span className="badge badge-scheduled">+{a.extraMinutes} min</span> : <span className="text-muted">—</span>}</td>
                    <td><div className="row-actions">
                      <button onClick={() => setEditing({ ...a })}>Editar</button>
                      <button className="btn-danger" onClick={() => remove(a.id)}>Apagar</button>
                    </div></td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid var(--border)' }}>
              <td style={{ paddingTop: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Nome</span>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Pigmentação" style={{ maxWidth: 180 }} />
                </div>
              </td>
              <td style={{ paddingTop: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Preço (R$)</span>
                  <input type="number" value={form.price} min={0} step="0.01" placeholder="0.00" style={{ width: 90, minWidth: 0 }} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                </div>
              </td>
              <td style={{ paddingTop: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Compatível com</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer', width: 'fit-content' }}>
                      <input type="checkbox" style={{ margin: 0, padding: 0 }} checked={form.isHairCompatible} onChange={e => setForm(f => ({ ...f, isHairCompatible: e.target.checked }))} /><span>Cabelo</span>
                    </label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer', width: 'fit-content' }}>
                      <input type="checkbox" style={{ margin: 0, padding: 0 }} checked={form.isBeardCompatible} onChange={e => setForm(f => ({ ...f, isBeardCompatible: e.target.checked }))} /><span>Barba</span>
                    </label>
                  </div>
                </div>
              </td>
              <td style={{ paddingTop: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Duração extra (min)</span>
                  <input type="number" min={0} max={120} value={form.extraMinutes} placeholder="0" style={{ width: 80, minWidth: 0 }} onChange={e => setForm(f => ({ ...f, extraMinutes: e.target.value }))} />
                </div>
              </td>
              <td style={{ paddingTop: 12, paddingLeft: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: '0.7rem', visibility: 'hidden' }}>&nbsp;</span>
                  <button onClick={create} disabled={creating || !form.name.trim()}>
                    {creating ? 'Criando...' : '+ Adicionar'}
                  </button>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}
