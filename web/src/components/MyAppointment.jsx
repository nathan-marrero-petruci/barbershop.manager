import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { API } from '../api/client.js'
import { formatDateTimeBR } from '../utils/date.js'

const STATUS_LABEL = {
  Pending:   { label: 'Aguardando pagamento', color: '#f59e0b' },
  Confirmed: { label: 'Confirmado',           color: '#22c55e' },
  Cancelled: { label: 'Cancelado',            color: '#ef4444' },
  Completed: { label: 'Concluído',            color: '#6b7280' },
}


export default function MyAppointment() {
  const [params] = useSearchParams()
  const id    = params.get('id')
  const phone = params.get('phone')

  const [appt, setAppt]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    if (!id || !phone) return
    setLoading(true)
    setError(null)
    fetch(`${API}/meu-agendamento?id=${encodeURIComponent(id)}&phone=${encodeURIComponent(phone)}`)
      .then(async r => {
        if (!r.ok) throw new Error(r.status === 404 ? 'Agendamento não encontrado.' : 'Erro ao buscar agendamento.')
        return r.json()
      })
      .then(data => setAppt(data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, phone])

  async function cancelAppointment() {
    setCancelling(true)
    try {
      const r = await fetch(`${API}/meu-agendamento/${id}?phone=${encodeURIComponent(phone)}`, { method: 'DELETE' })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.message ?? 'Erro ao cancelar agendamento.')
      }
      setAppt(a => ({ ...a, status: 'Cancelled' }))
      toast.success('Agendamento cancelado com sucesso.')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setCancelling(false)
      setConfirmOpen(false)
    }
  }

  const status = appt ? (STATUS_LABEL[appt.status] ?? { label: appt.status, color: '#6b7280' }) : null
  const canCancel = appt && (appt.status === 'Pending' || appt.status === 'Confirmed')

  if (!id || !phone) {
    return (
      <div className="client-layout">
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'var(--text-muted)' }}>
            Link inválido. Use o link enviado pelo WhatsApp para acessar seu agendamento.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="client-layout">
      <div className="card">
        <h2 className="booking-card-title">Meu <span>Agendamento</span></h2>

        {loading && <p className="loading-msg">Carregando...</p>}

        {error && (
          <div className="error-msg" style={{ marginTop: 0 }}>
            {error}
          </div>
        )}

        {appt && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                display: 'inline-block',
                padding: '4px 14px',
                borderRadius: 20,
                fontSize: '0.82rem',
                fontWeight: 600,
                background: status.color + '22',
                color: status.color,
                border: `1px solid ${status.color}55`,
              }}>
                {status.label}
              </span>
            </div>

            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <tbody>
                {[
                  ['Cliente',    appt.customerName],
                  ['Barbeiro',   appt.barberName],
                  ['Serviço',    appt.serviceName],
                  ['Horário',    formatDateTimeBR(appt.start)],
                  ...(appt.addons?.length ? [['Adicionais', appt.addons.join(', ')]] : []),
                ].map(([label, value]) => (
                  <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 8px', color: 'var(--text-muted)', fontSize: '0.85rem', width: '35%' }}>{label}</td>
                    <td style={{ padding: '10px 8px', fontWeight: 500 }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {canCancel && (
              <div style={{ marginTop: 8 }}>
                {!confirmOpen ? (
                  <button className="btn-danger" style={{ width: '100%' }} onClick={() => setConfirmOpen(true)}>
                    Cancelar agendamento
                  </button>
                ) : (
                  <div className="confirm-overlay" onClick={() => setConfirmOpen(false)}>
                    <div className="confirm-box" onClick={e => e.stopPropagation()}>
                      <p className="confirm-msg">Tem certeza que deseja cancelar este agendamento?</p>
                      <div className="confirm-actions">
                        <button onClick={() => setConfirmOpen(false)}>Voltar</button>
                        <button className="btn-danger" onClick={cancelAppointment} disabled={cancelling}>
                          {cancelling ? 'Cancelando...' : 'Confirmar cancelamento'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
