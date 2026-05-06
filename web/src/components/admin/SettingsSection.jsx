import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { apiFetch } from "../../api/client.js";

export default function SettingsSection() {
  const init = { pixKey: '', pixBeneficiario: '', reminderHoursBefore: 2, whatsappApiUrl: '', whatsappApiToken: '', whatsappInstance: '', minBookingAdvanceHours: 24 };
  const [form, setForm] = useState(init);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await apiFetch('/admin/settings');
    if (!res) return;
    if (!res.ok) { toast.error('Erro ao carregar configurações'); setLoading(false); return; }
    const data = await res.json();
    setForm(f => ({ ...f, ...data }));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    const res = await apiFetch('/admin/settings', { method: 'PUT', body: JSON.stringify(form) });
    setSaving(false);
    if (!res) return;
    if (!res.ok) { toast.error('Erro ao salvar configurações'); return; }
    toast.success('Configurações salvas com sucesso!');
  }

  const setF = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="admin-section-card">
      <h3 className="admin-section-title">Configurações</h3>
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
            <h4 style={{ color: 'var(--gold)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Agendamento</h4>
            <div className="form-group">
              <label className="form-label">Antecedência mínima (horas)</label>
              <input type="number" min={0} value={form.minBookingAdvanceHours} onChange={setF('minBookingAdvanceHours')} style={{ maxWidth: 100 }} />
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Tempo mínimo entre agora e o início do agendamento. Ex: 2 permite agendamentos com 2h de antecedência; 24 permite apenas a partir de amanhã.
              </p>
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
          </div>
          <button className="btn-primary" onClick={save} disabled={saving} style={{ alignSelf: 'flex-start', minWidth: 200 }}>
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      )}
    </div>
  );
}
