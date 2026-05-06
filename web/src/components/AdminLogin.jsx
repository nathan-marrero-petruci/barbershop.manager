import { useState } from "react";
import { API } from "../api/client.js";

export default function AdminLogin({ onSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    const user = username.trim();
    if (!user || !password) { setError("Preencha usuário e senha"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user, password })
      });
      if (!res.ok) {
        if (res.status === 429) {
          const retryAfter = res.headers.get('Retry-After');
          const seconds = retryAfter ? ` Tente novamente em ${retryAfter} segundos.` : '';
          setError(`Muitas tentativas. Aguarde um momento e tente novamente.${seconds}`);
        } else {
          setError(res.status === 401 || res.status === 403 ? "Credenciais inválidas" : "Erro ao conectar com o servidor");
        }
        setPassword("");
        return;
      }
      const data = await res.json();
      onSuccess && onSuccess(data.username ?? user);
    } catch {
      setError("Erro de rede");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="card login-card">
        <div className="login-header">
          <div className="login-icon">
            <img src="/logo.png" alt="Espaço Vip" />
          </div>
          <div className="login-title">ESPAÇO VIP</div>
          <div className="login-subtitle">Painel Administrativo</div>
        </div>
        <form className="login-form" onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Usuário</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Senha</label>
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', marginTop: 4 }}
            disabled={loading || !username.trim() || !password}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}