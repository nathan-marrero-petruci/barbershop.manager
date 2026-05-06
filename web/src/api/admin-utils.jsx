import toast from "react-hot-toast";

export const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export const toTimeInput = (ts) => (ts ? ts.slice(0, 5) : "");
export const fromTimeInput = (t) => (t ? `${t}:00` : "");

export function confirmToast(message) {
  return new Promise((resolve) => {
    toast.custom(
      (t) => (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 20px', maxWidth: 340, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
          <p style={{ margin: '0 0 12px', color: 'var(--text-primary)', fontSize: '0.9rem' }}>{message}</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem' }}
              onClick={() => { toast.dismiss(t.id); resolve(false); }}
            >
              Cancelar
            </button>
            <button
              className="btn-danger"
              style={{ padding: '6px 16px', borderRadius: 6, cursor: 'pointer', fontSize: '0.875rem' }}
              onClick={() => { toast.dismiss(t.id); resolve(true); }}
            >
              Confirmar
            </button>
          </div>
        </div>
      ),
      { duration: Infinity, position: 'top-center' }
    );
  });
}
