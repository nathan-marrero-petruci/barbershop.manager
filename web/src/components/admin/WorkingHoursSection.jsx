import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { apiFetch } from "../../api/client.js";
import { DAYS, toTimeInput, fromTimeInput, confirmToast } from "../../api/admin-utils.jsx";

export default function WorkingHoursSection({ barbers }) {
  const [hours, setHours] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ barberId: "", dayOfWeek: 1, start: "09:00", end: "18:00", breakStart: "", breakEnd: "" });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);

  async function load() {
    setLoading(true);
    const res = await apiFetch("/admin/workinghours");
    if (!res) return;
    if (!res.ok) { toast.error("Erro ao carregar horários"); setLoading(false); return; }
    setHours(await res.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!form.barberId) { toast.error("Selecione um barbeiro"); return; }
    const payload = {
      barberId: Number(form.barberId), dayOfWeek: Number(form.dayOfWeek),
      start: fromTimeInput(form.start), end: fromTimeInput(form.end),
      breakStart: form.breakStart ? fromTimeInput(form.breakStart) : null,
      breakEnd: form.breakEnd ? fromTimeInput(form.breakEnd) : null,
    };
    setCreating(true);
    const res = await apiFetch("/admin/workinghours", { method: "POST", body: JSON.stringify(payload) });
    setCreating(false);
    if (!res) return;
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error || "Erro ao criar"); return; }
    setForm(f => ({ ...f, barberId: "", start: "09:00", end: "18:00", breakStart: "", breakEnd: "" }));
    await load();
  }

  async function saveEdit() {
    const payload = {
      barberId: Number(editing.barberId), dayOfWeek: Number(editing.dayOfWeek),
      start: fromTimeInput(editing.start), end: fromTimeInput(editing.end),
      breakStart: editing.breakStart ? fromTimeInput(editing.breakStart) : null,
      breakEnd: editing.breakEnd ? fromTimeInput(editing.breakEnd) : null,
    };
    const res = await apiFetch(`/admin/workinghours/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
    if (!res) return;
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error || "Erro ao salvar"); return; }
    setEditing(null);
    await load();
  }

  async function remove(id) {
    if (!(await confirmToast("Apagar horário?"))) return;
    const res = await apiFetch(`/admin/workinghours/${id}`, { method: "DELETE" });
    if (!res) return;
    if (!res.ok) { toast.error("Erro ao apagar"); return; }
    toast.success("Horário removido.");
    await load();
  }

  const barberName = (id) => barbers.find(b => b.id === id)?.name ?? `#${id}`;

  return (
    <div className="admin-section-card">
      <h3 className="admin-section-title">Horários de Funcionamento</h3>
      {loading ? <p className="loading-msg">Carregando...</p> : (
        <table>
          <thead><tr><th>Barbeiro</th><th>Dia</th><th>Início</th><th>Fim</th><th>Intervalo</th><th>Ações</th></tr></thead>
          <tbody>
            {hours.map(h => (
              <tr key={h.id}>
                {editing?.id === h.id ? (
                  <>
                    <td>
                      <select value={editing.barberId} onChange={e => setEditing({ ...editing, barberId: e.target.value })}>
                        {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </td>
                    <td>
                      <select value={editing.dayOfWeek} onChange={e => setEditing({ ...editing, dayOfWeek: e.target.value })}>
                        {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                      </select>
                    </td>
                    <td><input type="time" value={editing.start} onChange={e => setEditing({ ...editing, start: e.target.value })} /></td>
                    <td><input type="time" value={editing.end} onChange={e => setEditing({ ...editing, end: e.target.value })} /></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <input type="time" value={editing.breakStart ?? ""} placeholder="--:--" style={{ width: 90 }} onChange={e => setEditing({ ...editing, breakStart: e.target.value })} />
                      <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>–</span>
                      <input type="time" value={editing.breakEnd ?? ""} placeholder="--:--" style={{ width: 90 }} onChange={e => setEditing({ ...editing, breakEnd: e.target.value })} />
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
                    <td>{barberName(h.barberId)}</td>
                    <td>{DAYS[h.dayOfWeek]}</td>
                    <td>{toTimeInput(h.start)}</td>
                    <td>{toTimeInput(h.end)}</td>
                    <td style={{ color: h.breakStart ? 'var(--text-secondary)' : 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {h.breakStart ? `${toTimeInput(h.breakStart)} – ${toTimeInput(h.breakEnd)}` : '—'}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button onClick={() => setEditing({ id: h.id, barberId: h.barberId, dayOfWeek: h.dayOfWeek, start: toTimeInput(h.start), end: toTimeInput(h.end), breakStart: h.breakStart ? toTimeInput(h.breakStart) : "", breakEnd: h.breakEnd ? toTimeInput(h.breakEnd) : "" })}>Editar</button>
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
        <select value={form.barberId} onChange={e => setForm(f => ({ ...f, barberId: e.target.value }))}>
          <option value="">Barbeiro</option>
          {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={form.dayOfWeek} onChange={e => setForm(f => ({ ...f, dayOfWeek: e.target.value }))}>
          {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
        </select>
        <input type="time" value={form.start} onChange={e => setForm(f => ({ ...f, start: e.target.value }))} />
        <input type="time" value={form.end} onChange={e => setForm(f => ({ ...f, end: e.target.value }))} />
        <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>Intervalo:</label>
        <input type="time" value={form.breakStart} placeholder="--:--" style={{ width: 100 }} onChange={e => setForm(f => ({ ...f, breakStart: e.target.value }))} />
        <input type="time" value={form.breakEnd} placeholder="--:--" style={{ width: 100 }} onChange={e => setForm(f => ({ ...f, breakEnd: e.target.value }))} />
        <button onClick={create} disabled={creating || !form.barberId}>{creating ? "Criando..." : "+ Adicionar"}</button>
      </div>
    </div>
  );
}
