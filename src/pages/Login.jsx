import { useState, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContextDefinition.jsx';
import { useToast } from '../components/Toast.jsx';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const { login, user } = useContext(AuthContext);
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/pdv" />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.username.trim().toLowerCase(), form.password);
      showToast('Bem-vindo!', 'success');
    } catch (err) {
      const mensagem = err.response?.data?.msg || 'Usuário ou senha inválidos';
      showToast(mensagem, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg, #fff7ed 0%, #fefcf8 50%, #f0fdf4 100%)',
      padding: 20, fontFamily: "'Quicksand', sans-serif"
    }}>
      <div style={{
        background: '#fff', padding: '36px 28px', borderRadius: 20,
        boxShadow: '0 8px 40px rgba(0,0,0,.08)', width: '100%', maxWidth: 380,
        textAlign: 'center'
      }}>
        <div style={{
          width: 68, height: 68, borderRadius: 18, margin: '0 auto 16px',
          background: 'rgba(234,88,12,.14)', color: '#ea580c',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34
        }}>🛒</div>

        <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px', color: '#0f172a' }}>PDV Mercado</h1>
        <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 20px' }}>
          Entre para acessar o sistema
        </p>
          <form onSubmit={handleSubmit}>
            <div style={{ textAlign: 'left', marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 6, display: 'block' }}>Usuário</label>
              <input
                placeholder="Digite seu usuário" value={form.username} autoComplete="username"
                onChange={e => setForm({ ...form, username: e.target.value })} required
                style={{
                  width: '100%', padding: '14px 16px', border: '1.5px solid rgba(15,23,42,.1)',
                  borderRadius: 12, fontSize: 16, boxSizing: 'border-box',
                  outline: 'none', transition: 'border-color .2s', background: '#fff', color: '#0f172a',
                  minHeight: 50
                }}
                onFocus={e => e.target.style.borderColor = '#ea580c'}
                onBlur={e => e.target.style.borderColor = 'rgba(15,23,42,.1)'}
              />
            </div>

            <div style={{ textAlign: 'left', marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 6, display: 'block' }}>Senha</label>
              <input
                type="password" placeholder="Digite sua senha" value={form.password} autoComplete="current-password"
                onChange={e => setForm({ ...form, password: e.target.value })} required
                style={{
                  width: '100%', padding: '14px 16px', border: '1.5px solid rgba(15,23,42,.1)',
                  borderRadius: 12, fontSize: 16, boxSizing: 'border-box',
                  outline: 'none', transition: 'border-color .2s', background: '#fff', color: '#0f172a',
                  minHeight: 50
                }}
                onFocus={e => e.target.style.borderColor = '#ea580c'}
                onBlur={e => e.target.style.borderColor = 'rgba(15,23,42,.1)'}
              />
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '14px', background: '#ea580c', color: '#fff',
              border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700,
              cursor: 'pointer', transition: 'all .15s', minHeight: 52
            }}>
              {loading ? 'Entrando...' : 'Entrar no Sistema'}
            </button>
          </form>
      </div>
    </div>
  );
}