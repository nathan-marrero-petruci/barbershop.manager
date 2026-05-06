import { formatTimeBR } from '../utils/date.js';
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { API } from "../api/client.js";

export default function BookingForm({ onBooked }) {
  const [barbers, setBarbers] = useState([]);
  const [services, setServices] = useState([]);
  const [availableAddons, setAvailableAddons] = useState([]);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [minDate, setMinDate] = useState(() => new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [minAdvanceHours, setMinAdvanceHours] = useState(24);

  const initialForm = { barberId: '', serviceId: '', date: '', slot: '', name: '', email: '', phone: '' };
  const [form, setForm] = useState(initialForm);
  const [pixInfo, setPixInfo] = useState(null);

  useEffect(() => {
    fetch(`${API}/barbers`).then(r => r.json()).then(setBarbers).catch(() => setBarbers([]));
    fetch(`${API}/services`).then(r => r.json()).then(setServices).catch(() => setServices([]));
    fetch(`${API}/settings/public`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.minBookingAdvanceHours != null) {
          setMinAdvanceHours(data.minBookingAdvanceHours);
          const d = new Date(Date.now() + data.minBookingAdvanceHours * 3600000);
          setMinDate(d.toISOString().split('T')[0]);
        }
      })
      .catch(() => {});
  }, []);

  // Load add-ons whenever selected service changes
  useEffect(() => {
    setSelectedAddons([]);
    setAvailableAddons([]);
    if (!form.serviceId) return;
    const svc = services.find(s => String(s.id) === String(form.serviceId));
    if (!svc) return;
    const cat = svc.category || 'both';
    fetch(`${API}/addons?category=${cat}`)
      .then(r => r.ok ? r.json() : [])
      .then(setAvailableAddons)
      .catch(() => setAvailableAddons([]));
  }, [form.serviceId, services]);

  useEffect(() => {
    async function loadSlots() {
      setSlots([]);
      setForm(f => ({ ...f, slot: '' }));
      if (!form.barberId || !form.serviceId || !form.date) return;
      setLoadingSlots(true);
      try {
        const addonParam = selectedAddons.length ? `&addonIds=${selectedAddons.join(',')}` : '';
        const res = await fetch(`${API}/barbers/${form.barberId}/availability?date=${form.date}&serviceId=${form.serviceId}${addonParam}`);
        if (res.ok) {
          const all = await res.json();
          // Filter out slots that haven't passed the minimum advance threshold yet
          const cutoff = new Date(Date.now() + minAdvanceHours * 3600000);
          const filtered = all.filter(s => new Date(s) >= cutoff);
          setSlots(filtered);
        } else { console.error(await res.text()); setSlots([]); }
      } catch (err) { console.error(err); setSlots([]); }
      finally { setLoadingSlots(false); }
    }
    loadSlots();
  }, [form.barberId, form.serviceId, form.date, selectedAddons, minAdvanceHours]);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.slot) { toast.error('Escolha um horário disponível'); return; }
    setSubmitting(true);
    try {
      const payload = {
        barberId: Number(form.barberId),
        serviceId: Number(form.serviceId),
        start: form.slot,
        customerName: form.name,
        customerEmail: form.email,
        customerPhone: form.phone,
        addonIds: selectedAddons
      };
      const res = await fetch(`${API}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const ct = res.headers.get('content-type') || '';
      if (res.status === 201) {
        const data = await res.json();
        setPixInfo({ pixKey: data.pixKey, pixBeneficiario: data.pixBeneficiario, totalPrice: data.totalPrice });
        if (typeof onBooked === 'function') onBooked();
        toast.success('Agendamento realizado com sucesso!');
        setSelectedAddons([]);
        setSlots([]);
        setForm(initialForm);
      } else if (res.status === 409) {
        const body = ct.includes('application/json') ? await res.json() : { message: await res.text() };
        toast.error(body.message || 'Horário ocupado');
        const addonParam = selectedAddons.length ? `&addonIds=${selectedAddons.join(',')}` : '';
        const slotsRes = await fetch(`${API}/barbers/${form.barberId}/availability?date=${form.date}&serviceId=${form.serviceId}${addonParam}`);
        if (slotsRes.ok) setSlots(await slotsRes.json());
      } else if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After');
        const seconds = retryAfter ? ` Tente novamente em ${retryAfter} segundos.` : '';
        toast.error(`Muitas tentativas. Aguarde um momento e tente novamente.${seconds}`);
      } else if (res.status === 400) {
        const body = ct.includes('application/json') ? await res.json() : await res.text();
        if (body.errors && Array.isArray(body.errors)) toast.error(body.errors.join('\n'));
        else toast.error(String(body));
      } else {
        toast.error(`Erro: ${res.status} - ${await res.text()}`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de rede');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card">
      <div className="booking-card-title">
        <span>✂</span> Novo Agendamento
      </div>

      {pixInfo && (
        <div className="pix-card">
          <div className="pix-card-header">✅ Agendamento Realizado!</div>
          <p className="pix-card-subtitle">
            Para confirmar seu horário, realize o pagamento via PIX abaixo.
            O barbeiro irá confirmar assim que receber o pagamento.
          </p>
          <div className="pix-total">
            Total a pagar: <strong>R$ {Number(pixInfo.totalPrice).toFixed(2)}</strong>
          </div>
          <div className="pix-key-row">
            <span className="pix-label">Chave PIX:</span>
            <code className="pix-key-value">{pixInfo.pixKey || '(não configurada)'}</code>
            {pixInfo.pixKey && (
              <button
                type="button"
                className="btn-copy"
                onClick={() =>
                  navigator.clipboard.writeText(pixInfo.pixKey)
                    .then(() => toast.success('Chave PIX copiada!'))
                }
              >
                Copiar
              </button>
            )}
          </div>
          <p className="pix-beneficiary">Beneficiário: <strong>{pixInfo.pixBeneficiario}</strong></p>
          <button type="button" className="btn-secondary" onClick={() => setPixInfo(null)}>
            Fazer novo agendamento
          </button>
        </div>
      )}

      {!pixInfo && <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="booking-grid-2">
          <div className="form-group">
            <label className="form-label">Barbeiro</label>
            <select required value={form.barberId} onChange={set('barberId')}>
              <option value=''>Selecione...</option>
              {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Serviço</label>
            <select required value={form.serviceId} onChange={set('serviceId')}>
              <option value=''>Selecione...</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.duration}min — R${Number(s.price).toFixed(2)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {availableAddons.length > 0 && (
          <div className="form-group">
            <label className="form-label">Extras (opcional)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {availableAddons.map(addon => {
                const checked = selectedAddons.includes(addon.id);
                return (
                  <label
                    key={addon.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                      border: `1px solid ${checked ? 'var(--gold)' : 'var(--border)'}`,
                      background: checked ? 'rgba(212,175,55,0.12)' : 'var(--surface)',
                      color: checked ? 'var(--gold)' : 'var(--text-secondary)',
                      fontSize: '0.875rem', userSelect: 'none', transition: 'all .15s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      style={{ accentColor: 'var(--gold)', width: 14, height: 14 }}
                      onChange={() =>
                        setSelectedAddons(prev =>
                          prev.includes(addon.id) ? prev.filter(id => id !== addon.id) : [...prev, addon.id]
                        )
                      }
                    />
                    {addon.name}
                    <span style={{ opacity: 0.7, fontSize: '0.8rem' }}>
                      +R${Number(addon.price).toFixed(2)}
                      {addon.extraMinutes > 0 && <span style={{ marginLeft: 4 }}>(+{addon.extraMinutes}min)</span>}
                    </span>
                  </label>
                );
              })}
            </div>
            {(() => {
              const svc = services.find(s => String(s.id) === String(form.serviceId));
              if (!svc) return null;
              const selectedAddonObjs = availableAddons.filter(a => selectedAddons.includes(a.id));
              const extraDuration = selectedAddonObjs.reduce((sum, a) => sum + (a.extraMinutes || 0), 0);
              const totalDuration = svc.duration + extraDuration;
              const extraPrice = selectedAddonObjs.reduce((sum, a) => sum + Number(a.price), 0);
              if (selectedAddons.length === 0) return null;
              return (
                <p style={{ marginTop: 6, fontSize: '0.85rem', color: 'var(--gold)' }}>
                  ⏱ Duração estimada: {totalDuration} min{extraDuration > 0 ? ` (+${extraDuration} min)` : ''}
                  {' · '}💰 Total: R${(Number(svc.price) + extraPrice).toFixed(2)}
                </p>
              );
            })()}
          </div>
        )}

        <div className="form-group" style={{ maxWidth: 220 }}>
          <label className="form-label">Data</label>
          <input type="date" required value={form.date} min={minDate} onChange={set('date')} />
        </div>

        {(form.barberId && form.serviceId && form.date) && (
          <div className="form-group">
            <label className="form-label">
              Horário disponível
              {form.slot && (
                <span style={{ color: 'var(--gold)', marginLeft: 8, fontSize: '0.75rem' }}>
                  ✓ {formatTimeBR(form.slot)}
                </span>
              )}
            </label>
            {loadingSlots ? (
              <p className="loading-msg">Carregando horários...</p>
            ) : slots.length === 0 ? (
              <p className="loading-msg">Nenhum horário disponível para esta data.</p>
            ) : (
              <div className="slot-grid">
                {slots.map(slot => (
                  <button
                    key={slot}
                    type="button"
                    className={`slot-btn${form.slot === slot ? ' selected' : ''}`}
                    onClick={() => setForm(f => ({ ...f, slot }))}
                  >
                    {formatTimeBR(slot)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <hr className="divider" />

        <div className="booking-form-cols">
          <div className="form-group">
            <label className="form-label">Nome</label>
            <input placeholder="Seu nome" value={form.name} onChange={set('name')} required />
          </div>
          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input type="email" placeholder="email@exemplo.com" value={form.email} onChange={set('email')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Telefone</label>
            <input placeholder="(11) 9 0000-0000" value={form.phone} onChange={set('phone')} required />
          </div>
        </div>

        <div className="booking-submit-row">
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Aguarde...' : 'Confirmar Agendamento'}
          </button>
        </div>
      </form>}
    </div>
  );
}