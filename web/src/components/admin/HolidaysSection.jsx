import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { apiFetch } from "../../api/client.js";
import { toTimeInput, fromTimeInput, confirmToast } from "../../api/admin-utils.jsx";

export default function HolidaysSection() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ date: "", description: "", workStart: "", workEnd: "" });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);

  async function load() {
    setLoading(true);
    const res = await apiFetch("/admin/holidays");
    if (!res) return;
    if (!res.ok) { toast.error("Erro ao carregar feriados"); setLoading(false); return; }
    setHolidays(await res.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!form.date) { toast.error("Selecione uma data"); return; }
    const payload = {
      date: form.date,
      description: form.description.trim() || null,
      workStart: form.workStart ? fromTimeInput(form.workStart) : null,
      workEnd: form.workEnd ? fromTimeInput(form.workEnd) : null,
    };
    setCreating(true);
    const res = await apiFetch("/admin/holidays", { method: "POST", body: JSON.stringify(payload) });
    setCreating(false);
    if (!res) return;
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error || "Erro ao criar"); return; }
    setForm({ date: "", description: "", workStart: "", workEnd: "" });
    await load();
  }

  async function saveEdit() {
    const payload = {
      date: editing.date,
      description: editing.description?.trim() || null,
      workStart: editing.workStart ? fromTimeInput(editing.workStart) : null,
      workEnd: editing.workEnd ? fromTimeInput(editing.workEnd) : null,
    };
    const res = await apiFetch(`/admin/holidays/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
    if (!res) return;
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error || "Erro ao salvar"); return; }
    setEditing(null);
    await load();
  }

  async function remove(id) {
    if (!(await confirmToast("Apagar feriado?"))) return;
    const res = await apiFetch(`/admin/holidays/${id}`, { method: "DELETE" });
    if (!res) return;
    if (!res.ok) { toast.error("Erro ao apagar"); return; }
    toast.success("Feriado removido.");
    await load();
  }

  const fmtDate = (iso) => (iso ? iso.slice(0, 10) : "");

  return (
    <div className="admin-section-card">
      <h3 className="admin-section-title">Feriados / Dias Fechados</h3>
      {loading ? <p className="loading-msg">Carregando...</p> : (
        <table>
          <thead><tr><th>Data</th><th>Descrição</th><th>Funciona</th><th>Ações</th></tr></thead>
          <tbody>
            {holidays.map(h => (
              <tr key={h.id}>
                {editing?.id === h.id ? (
                  <>
                    <td><input type="date" value={editing.date} onChange={e => setEditing({ ...editing, date: e.target.value })} /></td>
                    <td><input value={editing.description ?? ""} onChange={e => setEditing({ ...editing, description: e.target.value })} placeholder="Descrição" /></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <input type="time" value={editing.workStart ?? ""} placeholder="--:--" style={{ width: 90 }} onChange={e => setEditing({ ...editing, workStart: e.target.value })} />
                      <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>–</span>
                      <input type="time" value={editing.workEnd ?? ""} placeholder="--:--" style={{ width: 90 }} onChange={e => setEditing({ ...editing, workEnd: e.target.value })} />
                    </td>
                    <td>
                      <div className="row-actions">
                        <button onClick={saveEdit}>Salvar</button>
                        <button onClick={() => setEditing(null)}>Cancelar</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{fmtDate(h.date)}</td>
                    <td>{h.description || <span className="text-muted">—</span>}</td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {h.workStart
                        ? <span style={{ color: 'var(--gold)' }}>{toTimeInput(h.workStart)} – {toTimeInput(h.workEnd)}</span>
                        : <span className="text-muted">Fechado</span>}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button onClick={() => setEditing({ id: h.id, date: fmtDate(h.date), description: h.description ?? "", workStart: h.workStart ? toTimeInput(h.workStart) : "", workEnd: h.workEnd ? toTimeInput(h.workEnd) : "" })}>Editar</button>
                        <button className="btn-danger" onClick={() => remove(h.id)}>Apagar</button>
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
        <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição (opcional)" />
        <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>Funciona:</label>
        <input type="time" value={form.workStart} placeholder="--:--" style={{ width: 100 }} onChange={e => setForm(f => ({ ...f, workStart: e.target.value }))} />
        <input type="time" value={form.workEnd} placeholder="--:--" style={{ width: 100 }} onChange={e => setForm(f => ({ ...f, workEnd: e.target.value }))} />
        <button onClick={create} disabled={creating || !form.date}>{creating ? "Criando..." : "+ Adicionar"}</button>
      </div>
    </div>
  );
}
