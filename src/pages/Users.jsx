import { useContext, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import api from '../services/api.jsx';

export default function Users() {
  const { user } = useContext(AuthContext);
  const { showToast } = useToast();
  const [form, setForm] = useState({ username: '', password: '', role: 'operador' });
  const [loading, setLoading] = useState(false);

  if (user && user.role !== 'admin') return <Navigate to="/pdv" replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/register', {
        username: form.username.trim().toLowerCase(),
        password: form.password,
        role: form.role,
      });
      setForm({ username: '', password: '', role: 'operador' });
      showToast('Usuário criado com sucesso!', 'success');
    } catch (error) {
      const message = error.response?.data?.msg
        || error.response?.data?.errors?.[0]?.msg
        || 'Não foi possível criar o usuário';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={{ maxWidth: 620, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, color: '#0f172a' }}>Novo usuário</h2>
        <p style={{ color: '#64748b', margin: '8px 0 0' }}>Cadastre acessos para sua equipe.</p>
      </div>
      <form onSubmit={handleSubmit} style={{ background: '#fff', padding: 24, borderRadius: 14, boxShadow: '0 6px 24px rgba(15,23,42,.07)' }}>
        <label style={{ display: 'block', marginBottom: 16, color: '#475569', fontWeight: 600 }}>
          Usuário
          <input
            value={form.username}
            onChange={(event) => setForm({ ...form, username: event.target.value })}
            minLength={2}
            required
            autoComplete="username"
            style={inputStyle}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 16, color: '#475569', fontWeight: 600 }}>
          Senha
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            minLength={4}
            required
            autoComplete="new-password"
            style={inputStyle}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 22, color: '#475569', fontWeight: 600 }}>
          Perfil
          <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} style={inputStyle}>
            <option value="operador">Operador</option>
            <option value="admin">Administrador</option>
          </select>
        </label>
        <button type="submit" disabled={loading} style={{ width: '100%', padding: 14, border: 0, borderRadius: 10, background: '#ea580c', color: '#fff', fontWeight: 700, fontSize: 15, cursor: loading ? 'wait' : 'pointer' }}>
          {loading ? 'Criando...' : 'Criar usuário'}
        </button>
      </form>
    </section>
  );
}

const inputStyle = {
  display: 'block', width: '100%', marginTop: 7, padding: '12px 14px',
  border: '1px solid rgba(15,23,42,.15)', borderRadius: 9, fontSize: 16,
  boxSizing: 'border-box', background: '#fff', color: '#0f172a',
};
