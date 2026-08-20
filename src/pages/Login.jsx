import { useState, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import api from '../services/api.jsx';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const { login, user } = useContext(AuthContext);
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  // Estado para cadastro de usuário
  const [abaCadastro, setAbaCadastro] = useState(false);
  const [formCadastro, setFormCadastro] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    role: 'operador'
  });
  const [cadastrando, setCadastrando] = useState(false);

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

  // Cadastrar usuário — usando rota correta /api/auth/register
  const handleCadastro = async (e) => {
    e.preventDefault();

    if (formCadastro.password !== formCadastro.confirmPassword) {
      showToast('As senhas não coincidem!', 'error');
      return;
    }

    if (formCadastro.password.length < 4) {
      showToast('A senha deve ter pelo menos 4 caracteres', 'error');
      return;
    }

    setCadastrando(true);
    try {
      // ✅ Usar register-first — NÃO PRECISA ESTAR LOGADO!
      await api.post('/auth/register-first', {
        username: formCadastro.username.trim().toLowerCase(),
        password: formCadastro.password
      });

      showToast('✅ Administrador criado! Faça login agora.', 'success');
      setFormCadastro({ username: '', password: '', confirmPassword: '', role: 'operador' });
      setAbaCadastro(false);
    } catch (err) {
      // Já tem usuário cadastrado → register-first bloqueia
      if (err.response?.status === 400 && err.response?.data?.msg?.includes('Já existem')) {
        showToast('⚠️ Já existe usuário cadastrado. Faça login primeiro!', 'error');
        setAbaCadastro(false); // Volta para login
        return;
      }
      const mensagem = err.response?.data?.msg || err.response?.data?.errors?.[0]?.msg || 'Erro ao criar usuário';
      showToast(mensagem, 'error');
    } finally {
      setCadastrando(false);
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
          {abaCadastro ? 'Crie um novo usuário de acesso' : 'Entre para acessar o sistema'}
        </p>

        {/* Alternar entre Login e Cadastro */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => setAbaCadastro(false)}
            style={{
              padding: '6px 16px', borderRadius: 20, border: 'none', fontSize: 13, fontWeight: abaCadastro ? 500 : 700,
              background: abaCadastro ? '#f1f5f9' : '#ea580c', color: abaCadastro ? '#475569' : '#fff', cursor: 'pointer'
            }}>
            🔐 Entrar
          </button>
          <button
            type="button"
            onClick={() => setAbaCadastro(true)}
            style={{
              padding: '6px 16px', borderRadius: 20, border: 'none', fontSize: 13, fontWeight: abaCadastro ? 700 : 500,
              background: abaCadastro ? '#ea580c' : '#f1f5f9', color: abaCadastro ? '#fff' : '#475569', cursor: 'pointer'
            }}>
            ➕ Novo Usuário
          </button>
        </div>

        {/* FORMULÁRIO DE LOGIN */}
        {!abaCadastro ? (
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
        ) : (
          /* FORMULÁRIO DE CADASTRO */
          <form onSubmit={handleCadastro}>
            <div style={{ textAlign: 'left', marginBottom: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 6, display: 'block' }}>Nome de Usuário</label>
              <input
                placeholder="Ex: maria" value={formCadastro.username}
                onChange={e => setFormCadastro({ ...formCadastro, username: e.target.value })} required
                style={{
                  width: '100%', padding: '12px 14px', border: '1.5px solid rgba(15,23,42,.1)',
                  borderRadius: 10, fontSize: 15, boxSizing: 'border-box',
                  outline: 'none', background: '#fff', color: '#0f172a', minHeight: 46
                }}
                onFocus={e => e.target.style.borderColor = '#ea580c'}
                onBlur={e => e.target.style.borderColor = 'rgba(15,23,42,.1)'}
              />
            </div>

            <div style={{ textAlign: 'left', marginBottom: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 6, display: 'block' }}>Senha (mínimo 4 caracteres)</label>
              <input
                type="password" placeholder="Crie uma senha" value={formCadastro.password}
                onChange={e => setFormCadastro({ ...formCadastro, password: e.target.value })} required
                style={{
                  width: '100%', padding: '12px 14px', border: '1.5px solid rgba(15,23,42,.1)',
                  borderRadius: 10, fontSize: 15, boxSizing: 'border-box',
                  outline: 'none', background: '#fff', color: '#0f172a', minHeight: 46
                }}
                onFocus={e => e.target.style.borderColor = '#ea580c'}
                onBlur={e => e.target.style.borderColor = 'rgba(15,23,42,.1)'}
              />
            </div>

            <div style={{ textAlign: 'left', marginBottom: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 6, display: 'block' }}>Repetir Senha</label>
              <input
                type="password" placeholder="Digite a senha novamente" value={formCadastro.confirmPassword}
                onChange={e => setFormCadastro({ ...formCadastro, confirmPassword: e.target.value })} required
                style={{
                  width: '100%', padding: '12px 14px', border: '1.5px solid rgba(15,23,42,.1)',
                  borderRadius: 10, fontSize: 15, boxSizing: 'border-box',
                  outline: 'none', background: '#fff', color: '#0f172a', minHeight: 46
                }}
                onFocus={e => e.target.style.borderColor = '#ea580c'}
                onBlur={e => e.target.style.borderColor = 'rgba(15,23,42,.1)'}
              />
            </div>

            <div style={{ textAlign: 'left', marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 6, display: 'block' }}>Nível de Acesso</label>
              <select
                value={formCadastro.role}
                onChange={e => setFormCadastro({ ...formCadastro, role: e.target.value })}
                style={{
                  width: '100%', padding: '12px 14px', border: '1.5px solid rgba(15,23,42,.1)',
                  borderRadius: 10, fontSize: 15, background: '#fff', color: '#0f172a', minHeight: 46
                }}>
                <option value="operador">📋 Operador</option>
                <option value="admin">🔑 Administrador</option>
              </select>
            </div>

            <button type="submit" disabled={cadastrando} style={{
              width: '100%', padding: '13px', background: '#16a34a', color: '#fff',
              border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700,
              cursor: 'pointer', minHeight: 50
            }}>
              {cadastrando ? 'Salvando...' : '✅ Criar Usuário'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}