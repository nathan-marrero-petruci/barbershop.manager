import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client.js";
import { formatDateBR, formatTimeBR } from '../utils/date.js';
import BarbersSection      from "./admin/BarbersSection.jsx";
import ServicesSection     from "./admin/ServicesSection.jsx";
import WorkingHoursSection from "./admin/WorkingHoursSection.jsx";
import HolidaysSection     from "./admin/HolidaysSection.jsx";
import AddonsSection       from "./admin/AddonsSection.jsx";
import AppointmentsSection from "./admin/AppointmentsSection.jsx";
import SettingsSection     from "./admin/SettingsSection.jsx";

/* OLD_INLINE_COMPONENTS_REMOVED
function BarbersSection({ barbers, onChanged }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
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
    if (!res.ok) { setError(await res.text()); return; }
    setNewName(""); await reload();
  }

  async function saveEdit() {
    const name = editing.name.trim();
    if (!name) return;
    const res = await apiFetch(`/admin/barbers/${editing.id}`, { method: "PUT", body: JSON.stringify({ name }) });
    if (!res) return;
    if (!res.ok) { setError(await res.text()); return; }
    setEditing(null); await reload();
  }

  async function remove(id) {
    if (!confirm("Apagar barbeiro?")) return;
    const res = await apiFetch(`/admin/barbers/${id}`, { method: "DELETE" });
    if (!res) return;
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.message || "Erro ao apagar"); return; }
    await reload();
  }

  return (
    <div className="admin-section-card">
      <h3 className="admin-section-title">Barbeiros</h3>
      {error && <p className="error-msg">{error}</p>}
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
                        <button onClick={saveEdit}>Salvar</button>
                        <button onClick={() => setEditing(null)}>Cancelar</button>
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

// ─────────────── Serviços ───────────────
function ServicesSection() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", duration: 30, price: 0, category: "both" });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);

  async function load() {
    setLoading(true); setError("");
    const res = await apiFetch("/admin/services");
    if (!res) return;
    if (!res.ok) { setError("Erro ao carregar serviços"); setLoading(false); return; }
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
    if (!res.ok) { setError(await res.text()); return; }
    setForm({ name: "", duration: 30, price: 0, category: "both" }); await load();
  }

  async function saveEdit() {
    const payload = { name: editing.name.trim(), duration: Number(editing.duration), price: Number(editing.price), category: editing.category };
    const res = await apiFetch(`/admin/services/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
    if (!res) return;
    if (!res.ok) { setError(await res.text()); return; }
    setEditing(null); await load();
  }

  async function remove(id) {
    if (!confirm("Apagar serviço?")) return;
    const res = await apiFetch(`/admin/services/${id}`, { method: "DELETE" });
    if (!res) return;
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.message || "Erro ao apagar"); return; }
    await load();
  }

  return (
    <div className="admin-section-card">
      <h3 className="admin-section-title">Serviços</h3>
      {error && <p className="error-msg">{error}</p>}
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
                        <button onClick={saveEdit}>Salvar</button>
                        <button onClick={() => setEditing(null)}>Cancelar</button>
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

// ─────────────── Horários de Funcionamento ───────────────
function WorkingHoursSection({ barbers }) {
  const [hours, setHours] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ barberId: "", dayOfWeek: 1, start: "09:00", end: "18:00", breakStart: "", breakEnd: "" });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);

  async function load() {
    setLoading(true); setError("");
    const res = await apiFetch("/admin/workinghours");
    if (!res) return;
    if (!res.ok) { setError("Erro ao carregar horários"); setLoading(false); return; }
    setHours(await res.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!form.barberId) { setError("Selecione um barbeiro"); return; }
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
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || "Erro ao criar"); return; }
    setForm(f => ({ ...f, barberId: "", start: "09:00", end: "18:00", breakStart: "", breakEnd: "" })); await load();
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
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || "Erro ao salvar"); return; }
    setEditing(null); await load();
  }

  async function remove(id) {
    if (!confirm("Apagar horário?")) return;
    const res = await apiFetch(`/admin/workinghours/${id}`, { method: "DELETE" });
    if (!res) return;
    if (!res.ok) { setError("Erro ao apagar"); return; }
    await load();
  }

  const barberName = (id) => barbers.find(b => b.id === id)?.name ?? `#${id}`;

  return (
    <div className="admin-section-card">
      <h3 className="admin-section-title">Horários de Funcionamento</h3>
      {error && <p className="error-msg">{error}</p>}
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

// ─────────────── Feriados ───────────────
function HolidaysSection() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ date: "", description: "", workStart: "", workEnd: "" });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);

  async function load() {
    setLoading(true); setError("");
    const res = await apiFetch("/admin/holidays");
    if (!res) return;
    if (!res.ok) { setError("Erro ao carregar feriados"); setLoading(false); return; }
    setHolidays(await res.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!form.date) { setError("Selecione uma data"); return; }
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
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || "Erro ao criar"); return; }
    setForm({ date: "", description: "", workStart: "", workEnd: "" }); await load();
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
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || "Erro ao salvar"); return; }
    setEditing(null); await load();
  }

  async function remove(id) {
    if (!confirm("Apagar feriado?")) return;
    const res = await apiFetch(`/admin/holidays/${id}`, { method: "DELETE" });
    if (!res) return;
    if (!res.ok) { setError("Erro ao apagar"); return; }
    await load();
  }

  const fmtDate = (iso) => (iso ? iso.slice(0, 10) : "");

  return (
    <div className="admin-section-card">
      <h3 className="admin-section-title">Feriados / Dias Fechados</h3>
      {error && <p className="error-msg">{error}</p>}
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

// ─────────────── Add-ons ───────────────
function AddonsSection() {
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", price: 0, isHairCompatible: true, isBeardCompatible: true, addsExtraTime: true });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);

  async function load() {
    setLoading(true); setError("");
    const res = await apiFetch("/admin/addons");
    if (!res) return;
    if (!res.ok) { setError("Erro ao carregar add-ons"); setLoading(false); return; }
    setAddons(await res.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    const payload = { name: form.name.trim(), price: Number(form.price), isHairCompatible: form.isHairCompatible, isBeardCompatible: form.isBeardCompatible, addsExtraTime: form.addsExtraTime };
    if (!payload.name) return;
    setCreating(true);
    const res = await apiFetch("/admin/addons", { method: "POST", body: JSON.stringify(payload) });
    setCreating(false);
    if (!res) return;
    if (!res.ok) { setError(await res.text()); return; }
    setForm({ name: "", price: 0, isHairCompatible: true, isBeardCompatible: true, addsExtraTime: true });
    await load();
  }

  async function saveEdit() {
    const payload = { name: editing.name.trim(), price: Number(editing.price), isHairCompatible: editing.isHairCompatible, isBeardCompatible: editing.isBeardCompatible, addsExtraTime: editing.addsExtraTime };
    const res = await apiFetch(`/admin/addons/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
    if (!res) return;
    if (!res.ok) { setError(await res.text()); return; }
    setEditing(null); await load();
  }

  async function remove(id) {
    if (!confirm("Apagar add-on?")) return;
    const res = await apiFetch(`/admin/addons/${id}`, { method: "DELETE" });
    if (!res) return;
    if (!res.ok) { setError("Erro ao apagar"); return; }
    await load();
  }

  const compat = (a) => [a.isHairCompatible && "Cabelo", a.isBeardCompatible && "Barba"].filter(Boolean).join(" + ") || "—";

  return (
    <div className="admin-section-card">
      <h3 className="admin-section-title">Add-ons / Serviços Extras</h3>
      {error && <p className="error-msg">{error}</p>}
      {loading ? <p className="loading-msg">Carregando...</p> : (
        <table>
          <thead><tr><th>Nome</th><th>Preço</th><th>Compatível</th><th>+Tempo</th><th>Ações</th></tr></thead>
          <tbody>
            {addons.map(a => (
              <tr key={a.id}>
                {editing?.id === a.id ? (
                  <>
                    <td><input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></td>
                    <td><input type="number" value={editing.price} min={0} step="0.01" style={{ width: 90 }} onChange={e => setEditing({ ...editing, price: e.target.value })} /></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <label style={{ marginRight: 8 }}><input type="checkbox" checked={editing.isHairCompatible} onChange={e => setEditing({ ...editing, isHairCompatible: e.target.checked })} /> Cabelo</label>
                      <label><input type="checkbox" checked={editing.isBeardCompatible} onChange={e => setEditing({ ...editing, isBeardCompatible: e.target.checked })} /> Barba</label>
                    </td>
                    <td><input type="checkbox" checked={editing.addsExtraTime} onChange={e => setEditing({ ...editing, addsExtraTime: e.target.checked })} /></td>
                    <td><div className="row-actions"><button onClick={saveEdit}>Salvar</button><button onClick={() => setEditing(null)}>Cancelar</button></div></td>
                  </>
                ) : (
                  <>
                    <td>{a.name}</td>
                    <td>R$ {Number(a.price).toFixed(2)}</td>
                    <td>{compat(a)}</td>
                    <td>{a.addsExtraTime ? <span className="badge badge-scheduled">+30 min</span> : <span className="text-muted">—</span>}</td>
                    <td><div className="row-actions">
                      <button onClick={() => setEditing({ ...a })}>Editar</button>
                      <button className="btn-danger" onClick={() => remove(a.id)}>Apagar</button>
                    </div></td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="admin-add-row">
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome do add-on" />
        <input type="number" value={form.price} min={0} step="0.01" style={{ width: 100 }} placeholder="Preço (R$)" onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <input type="checkbox" checked={form.isHairCompatible} onChange={e => setForm(f => ({ ...f, isHairCompatible: e.target.checked }))} /> Cabelo
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <input type="checkbox" checked={form.isBeardCompatible} onChange={e => setForm(f => ({ ...f, isBeardCompatible: e.target.checked }))} /> Barba
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <input type="checkbox" checked={form.addsExtraTime} onChange={e => setForm(f => ({ ...f, addsExtraTime: e.target.checked }))} /> +30 min
        </label>
        <button onClick={create} disabled={creating || !form.name.trim()}>{creating ? "Criando..." : "+ Adicionar"}</button>
      </div>
    </div>
  );
}

// ─────────────── Agendamentos Admin ───────────────
function AppointmentsSection() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dateFilter, setDateFilter] = useState('today');
  const [customDate, setCustomDate] = useState('');

  async function load() {
    setLoading(true); setError("");
    const res = await apiFetch("/admin/appointments");
    if (!res) return;
    if (!res.ok) { setError("Erro ao carregar agendamentos"); setLoading(false); return; }
    setList(await res.json());
    setLoading(false);
  }
  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // auto-refresh a cada 30s
    return () => clearInterval(interval);
  }, []);

  async function changeStatus(id, status) {
    const res = await apiFetch(`/admin/appointments/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    if (!res) return;
    if (!res.ok) { setError(await res.text()); return; }
    await load();
  }

  const fmtHour = (iso) => formatTimeBR(iso);
  const fmtDate = (iso) => formatDateBR(iso);
  const getDateStr = (iso) => new Date(iso).toLocaleDateString('sv');
  const todayStr    = new Date().toLocaleDateString('sv');
  const tomorrowStr = new Date(Date.now() + 86400000).toLocaleDateString('sv');

  let filtered = list;
  if (dateFilter === 'today')    filtered = list.filter(a => getDateStr(a.start) === todayStr);
  else if (dateFilter === 'tomorrow') filtered = list.filter(a => getDateStr(a.start) === tomorrowStr);
  else if (dateFilter === 'custom' && customDate) filtered = list.filter(a => getDateStr(a.start) === customDate);

  const STATUS_LABEL = { Pending: 'Aguardando Pgto.', Confirmed: 'Confirmado', Cancelled: 'Cancelado', Done: 'Concluído' };
  const STATUS_CLASS = { Pending: 'badge-pending', Confirmed: 'badge-scheduled', Cancelled: 'badge-cancelled', Done: 'badge-done' };
  const STATUS_BORDER = { Pending: '#f59e0b', Confirmed: 'var(--gold)', Cancelled: '#ef4444', Done: '#22c55e' };

  return (
    <div className="admin-section-card">
      <h3 className="admin-section-title">Agendamentos</h3>
      {error && <p className="error-msg">{error}</p>}

      <div className="date-filter-row">
        {[['today','Hoje'],['tomorrow','Amanhã'],['all','Todos'],['custom','Data']].map(([v,l]) => (
          <button key={v} className={`filter-btn${dateFilter === v ? ' active' : ''}`} onClick={() => setDateFilter(v)}>{l}</button>
        ))}
        {dateFilter === 'custom' && (
          <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} style={{ marginLeft: 4 }} />
        )}
        <button className="btn-secondary" style={{ marginLeft: 'auto' }} onClick={load}>↻ Atualizar</button>
      </div>

      {loading ? <p className="loading-msg">Carregando...</p> : filtered.length === 0 ? (
        <p className="loading-msg">Nenhum agendamento para este período.</p>
      ) : (
        <div className="appt-cards">
          {filtered.map(a => (
            <div key={a.id} className="appt-card" style={{ borderLeftColor: STATUS_BORDER[a.status] ?? 'var(--border)' }}>
              <div className="appt-card-header">
                <div className="appt-card-time">
                  <span className="appt-card-hour">{fmtHour(a.start)}</span>
                  <span className="appt-card-date">{fmtDate(a.start)}</span>
                </div>
                <span className={`badge ${STATUS_CLASS[a.status] ?? 'badge-scheduled'}`}>
                  {STATUS_LABEL[a.status] ?? a.status}
                </span>
              </div>
              <div className="appt-card-body">
                <div className="appt-card-client">{a.customerName}</div>
                <div className="appt-card-service">✂&nbsp; {a.serviceName}</div>
                {a.customerPhone && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>📲 {a.customerPhone}</div>
                )}
                {a.addons && a.addons.length > 0 && (
                  <div className="appt-extras-list" style={{ marginTop: 6 }}>
                    {a.addons.map(ad => (
                      <div key={ad.serviceAddonId} className="appt-extra-item">
                        <span className="appt-extra-name">+ {ad.name}</span>
                        <span className="appt-extra-price">R$ {Number(ad.price).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="appt-card-footer">
                <span className="appt-card-barber">💈 {a.barberName}</span>
                <span style={{ color: 'var(--gold)', fontWeight: 600 }}>R$ {Number(a.totalPrice ?? 0).toFixed(2)}</span>
              </div>
              {(a.status === 'Pending' || a.status === 'Confirmed') && (
                <div className="appt-card-actions">
                  {a.status === 'Pending' && (
                    <button className="btn-primary" style={{ fontSize: '0.82rem', padding: '6px 14px' }} onClick={() => changeStatus(a.id, 'Confirmed')}>
                      ✓ PIX Recebido
                    </button>
                  )}
                  {a.status === 'Confirmed' && (
                    <button className="btn-primary" style={{ fontSize: '0.82rem', padding: '6px 14px' }} onClick={() => changeStatus(a.id, 'Done')}>
                      ✓ Concluir
                    </button>
                  )}
                  <button className="btn-danger" style={{ fontSize: '0.82rem', padding: '6px 14px' }} onClick={() => changeStatus(a.id, 'Cancelled')}>
                    ✗ Cancelar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────── Configurações ───────────────
function SettingsSection() {
  const init = { pixKey: '', pixBeneficiario: '', reminderHoursBefore: 2, whatsappApiUrl: '', whatsappApiToken: '', whatsappInstance: '' };
  const [form, setForm] = useState(init);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    setLoading(true); setError('');
    const res = await apiFetch('/admin/settings');
    if (!res) return;
    if (!res.ok) { setError('Erro ao carregar configurações'); setLoading(false); return; }
    const data = await res.json();
    setForm(f => ({ ...f, ...data }));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true); setError(''); setSuccess('');
    const res = await apiFetch('/admin/settings', { method: 'PUT', body: JSON.stringify(form) });
    setSaving(false);
    if (!res) return;
    if (!res.ok) { setError('Erro ao salvar configurações'); return; }
    setSuccess('Configurações salvas com sucesso!');
  }

  const setF = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="admin-section-card">
      <h3 className="admin-section-title">Configurações</h3>
      {error && <p className="error-msg">{error}</p>}
      {success && <p style={{ color: '#22c55e', marginBottom: 12, fontSize: '0.9rem' }}>{success}</p>}
      {loading ? <p className="loading-msg">Carregando...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 500 }}>
          <div>
            <h4 style={{ color: 'var(--gold)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>PIX</h4>
            <div className="form-group">
              <label className="form-label">Chave PIX</label>
              <input value={form.pixKey} onChange={setF('pixKey')} placeholder="Celular, CPF, CNPJ ou chave aleatória" />
            </div>
            <div className="form-group">
              <label className="form-label">Beneficiário</label>
              <input value={form.pixBeneficiario} onChange={setF('pixBeneficiario')} placeholder="Nome exibido no pagamento" />
            </div>
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />
          <div>
            <h4 style={{ color: 'var(--gold)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>WhatsApp — Lembretes (UltraMsg)</h4>
            <div className="form-group">
              <label className="form-label">Horas de antecedência</label>
              <input type="number" min={0} value={form.reminderHoursBefore} onChange={setF('reminderHoursBefore')} style={{ maxWidth: 100 }} />
            </div>
            <div className="form-group">
              <label className="form-label">Instance ID <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(ex: instance12345)</span></label>
              <input value={form.whatsappInstance} onChange={setF('whatsappInstance')} placeholder="instanceXXXXX" />
            </div>
            <div className="form-group">
              <label className="form-label">Token <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(painel UltraMsg → Instance → Token)</span></label>
              <input type="password" value={form.whatsappApiToken} onChange={setF('whatsappApiToken')} placeholder="••••••••" />
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Para testes, deixe o Instance ID como <code style={{ color: 'var(--gold)' }}>webhook.site/SEU-UUID</code> e o Token em branco — o backend logará as chamadas mas não enviará mensagens reais.
            </p>
          </div>
          <button className="btn-primary" onClick={save} disabled={saving} style={{ alignSelf: 'flex-start', minWidth: 200 }}>
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      )}
    </div>
  );
}

*/

// ─────────────── Root ───────────────
export default function AdminPanel() {
  const { tab = 'barbers' } = useParams();
  const navigate = useNavigate();
  const [barbers, setBarbers] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);

  async function loadBarbers() {
    const res = await apiFetch("/admin/barbers");
    if (res && res.ok) setBarbers(await res.json());
  }

  async function loadPendingCount() {
    const res = await apiFetch("/admin/appointments");
    if (res && res.ok) {
      const data = await res.json();
      const items = Array.isArray(data) ? data : (data.items ?? []);
      setPendingCount(items.filter(a => a.status === 'Pending').length);
    }
  }

  useEffect(() => {
    loadBarbers();
    loadPendingCount();
    const interval = setInterval(loadPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    ["barbers",      "Barbeiros"],
    ["services",     "Serviços"],
    ["hours",        "Horários"],
    ["holidays",     "Feriados"],
    ["addons",       "Extras"],
    ["appointments", <>Agendamentos{pendingCount > 0 && <span className="tab-badge">{pendingCount}</span>}</>],
    ["settings",     "Configurações"],
  ];

  return (
    <div>
      <div className="admin-panel-title">Painel Administrativo</div>
      <nav className="nav-tabs">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            className={`nav-tab${tab === key ? ' active' : ''}`}
            onClick={() => navigate(`/admin/${key}`)}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === "barbers"      && <BarbersSection barbers={barbers} onChanged={loadBarbers} />}
      {tab === "services"     && <ServicesSection />}
      {tab === "hours"        && <WorkingHoursSection barbers={barbers} />}
      {tab === "holidays"     && <HolidaysSection />}
      {tab === "addons"       && <AddonsSection />}
      {tab === "appointments" && <AppointmentsSection />}
      {tab === "settings"     && <SettingsSection />}
    </div>
  );
}