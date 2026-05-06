import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div style={{ padding: 60, textAlign: 'center' }}>
      <h2>404 — Página não encontrada</h2>
      <p>A página que você está procurando não existe.</p>
      <Link to="/">Voltar ao início</Link>
    </div>
  )
}
