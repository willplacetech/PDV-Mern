import { useState, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import { ThemeContext } from '../context/ThemeContext.jsx';
import { useToast } from '../components/Toast.jsx';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const { login, user } = useContext(AuthContext);
  const { isDark, toggleTheme } = useContext(ThemeContext);
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
      background: isDark 
        ? 'linear-gradient(160deg, #0f1419 0%, #1a1f2e 50%, #1a2332 100%)'
        : 'linear-gradient(160deg, #fff7ed 0%, #fefcf8 50%, #f0fdf4 100%)',
      padding: 20, fontFamily: "'Quicksand', sans-serif",
      transition: 'background 0.3s ease'
    }}>
      <div style={{
        background: 'var(--bg-secondary)', padding: '36px 28px', borderRadius: 20,
        boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 380,
        textAlign: 'center', color: 'var(--text-primary)'
      }}>
        <div style={{
          position: 'absolute', top: 20, right: 20,
          display: 'flex', gap: '10px'
        }}>
          <button onClick={toggleTheme} style={{
            background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            padding: '10px 16px', borderRadius: '10px', fontSize: '16px',
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: '6px',
            transition: 'all 0.2s ease'
          }} title={isDark ? 'Modo claro' : 'Modo escuro'}>
            {isDark ? '☀️' : '🌙'}
          </button>
        </div>

        <div style={{
          width: 68, height: 68, borderRadius: 18, margin: '0 auto 16px',
          background: 'var(--accent-light)', color: 'var(--accent-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34
        }}>🛒</div>

        <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>PDV Mercado</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '0 0 20px' }}>
          Entre para acessar o sistema
        </p>
          <form onSubmit={handleSubmit}>
            <div style={{ textAlign: 'left', marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Usuário</label>
              <input
                placeholder="Digite seu usuário" value={form.username} autoComplete="username"
                onChange={e => setForm({ ...form, username: e.target.value })} required
                style={{
                  width: '100%', padding: '14px 16px', border: '1.5px solid var(--border-color)',
                  borderRadius: 12, fontSize: 16, boxSizing: 'border-box',
                  outline: 'none', transition: 'border-color .2s, background 0.2s, color 0.2s',
                  background: 'var(--input-bg)', color: 'var(--input-text)',
                  minHeight: 50
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
              />
            </div>

            <div style={{ textAlign: 'left', marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Senha</label>
              <input
                type="password" placeholder="Digite sua senha" value={form.password} autoComplete="current-password"
                onChange={e => setForm({ ...form, password: e.target.value })} required
                style={{
                  width: '100%', padding: '14px 16px', border: '1.5px solid var(--border-color)',
                  borderRadius: 12, fontSize: 16, boxSizing: 'border-box',
                  outline: 'none', transition: 'border-color .2s, background 0.2s, color 0.2s',
                  background: 'var(--input-bg)', color: 'var(--input-text)',
                  minHeight: 50
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
              />
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '14px', background: 'var(--accent-primary)', color: '#fff',
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