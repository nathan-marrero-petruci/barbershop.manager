import { useEffect, useState, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { apiFetch } from "../../api/client.js";

const STATUS_LABEL  = { Pending: 'Aguardando Pgto.', Confirmed: 'Confirmado', Cancelled: 'Cancelado', Done: 'Concluído' };
const STATUS_CLASS  = { Pending: 'badge-pending', Confirmed: 'badge-scheduled', Cancelled: 'badge-cancelled', Done: 'badge-done' };
const STATUS_BORDER = { Pending: '#f59e0b', Confirmed: 'var(--gold)', Cancelled: '#ef4444', Done: '#22c55e' };
const PAGE_SIZE = 20;

function todayStr()    { return new Date().toLocaleDateString('sv'); }
function tomorrowStr() { return new Date(Date.now() + 86400000).toLocaleDateString('sv'); }

export default function AppointmentsSection() {
  const [items, setItems]           = useState([]);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(false);

  const [dateFilter, setDateFilter]     = useState('today');
  const [customDate, setCustomDate]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [phoneFilter, setPhoneFilter]   = useState('');
  const [phoneInput, setPhoneInput]     = useState('');
  const debounceRef = useRef(null);

  function handlePhoneChange(value) {
    setPhoneInput(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPhoneFilter(value.trim());
      setPage(1);
    }, 400);
  }

  const buildParams = useCallback((p = page) => {
    const params = new URLSearchParams({ page: p, pageSize: PAGE_SIZE });
    if (statusFilter) params.set('status', statusFilter);
    if (phoneFilter)  params.set('phone',  phoneFilter);
    if (dateFilter === 'today')         params.set('date', todayStr());
    else if (dateFilter === 'tomorrow') params.set('date', tomorrowStr());
    else if (dateFilter === 'custom' && customDate) params.set('date', customDate);
    return params.toString();
  }, [page, dateFilter, customDate, statusFilter, phoneFilter]);

  const load = useCallback(async (p = page) => {
    setLoading(true);
    const res = await apiFetch(`/admin/appointments?${buildParams(p)}`);
    if (!res) { setLoading(false); return; }
    if (!res.ok) { toast.error("Erro ao carregar agendamentos"); setLoading(false); return; }
    const data = await res.json();
    setItems(data.items);
    setTotal(data.total);
    setTotalPages(data.totalPages);
    setLoading(false);
  }, [buildParams, page]);

  // Reload when filters or page change
  useEffect(() => { load(page); }, [page, dateFilter, customDate, statusFilter, phoneFilter]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => load(page), 30000);
    return () => clearInterval(interval);
  }, [load, page]);

  function setDateFilterAndReset(v) { setDateFilter(v); setPage(1); }
  function setStatusFilterAndReset(v) { setStatusFilter(v); setPage(1); }

  async function changeStatus(id, status) {
    const res = await apiFetch(`/admin/appointments/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    if (!res) return;
    if (!res.ok) { toast.error(await res.text()); return; }
    await load(page);
  }

  const fmtHour = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const fmtDate = (iso) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="admin-section-card">
      <h3 className="admin-section-title">Agendamentos</h3>

      <div className="date-filter-row">
        {[['today','Hoje'],['tomorrow','Amanhã'],['all','Todos'],['custom','Data']].map(([v,l]) => (
          <button key={v} className={`filter-btn${dateFilter === v ? ' active' : ''}`} onClick={() => setDateFilterAndReset(v)}>{l}</button>
        ))}
        {dateFilter === 'custom' && (
          <input type="date" value={customDate} onChange={e => { setCustomDate(e.target.value); setPage(1); }} />
        )}
      </div>

      <div className="date-filter-row" style={{ marginBottom: 16 }}>
        <select
          value={statusFilter}
          onChange={e => setStatusFilterAndReset(e.target.value)}
          style={{ flex: '1 1 140px', minWidth: 0 }}
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Telefone..."
          value={phoneInput}
          onChange={e => handlePhoneChange(e.target.value)}
          style={{ flex: '1 1 140px', minWidth: 0 }}
        />

        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {total} agendamento{total !== 1 ? 's' : ''}
        </span>

        <button className="btn-secondary" style={{ marginLeft: 'auto' }} onClick={() => load(page)}>↻ Atualizar</button>
      </div>

      {loading ? <p className="loading-msg">Carregando...</p> : items.length === 0 ? (
        <p className="loading-msg">Nenhum agendamento para este filtro.</p>
      ) : (
        <>
          <div className="appt-cards">
            {items.map(a => (
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 20 }}>
              <button
                className="btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                ← Anterior
              </button>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Página {page} de {totalPages}
              </span>
              <button
                className="btn-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Próximo →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

