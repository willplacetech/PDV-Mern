import { useState, useEffect } from 'react';
import api from '../services/api.jsx';
import { useToast } from '../components/Toast.jsx';


const categorias = ['Alimentos', 'Bebidas', 'Limpeza', 'Higiene', 'Hortifruti', 'Padaria', 'Outros'];


export default function Products() {
  const [produtos, setProdutos] = useState([]);
  const [form, setForm] = useState({ codigo: '', nome: '', categoria: 'Outros', preco: '', estoque: '' });
  const [editing, setEditing] = useState(null);
  const [filtro, setFiltro] = useState('');
  const { showToast } = useToast();


  useEffect(() => { carregar(); }, []);

  // Gera próximo código automaticamente
  useEffect(() => {
    if (!editing && produtos.length > 0) {
      gerarProximoCodigo();
    }
  }, [produtos, editing]);

  const carregar = async () => {
    const res = await api.get('/products');
    setProdutos(res.data);
  };

  const gerarProximoCodigo = () => {
    if (produtos.length === 0) {
      setForm(prev => ({ ...prev, codigo: '1' }));
      return;
    }
    const maiorCodigo = produtos.reduce((maior, p) => {
      const cod = parseInt(p.codigo) || 0;
      return cod > maior ? cod : maior;
    }, 0);
    setForm(prev => ({ ...prev, codigo: String(maiorCodigo + 1) }));
  };

  // 🔒 Verifica duplicidade de CÓDIGO
  const codigoJaExiste = (codigo, idEdicao = null) => {
    return produtos.some(p => 
      String(p.codigo) === String(codigo) && p._id !== idEdicao
    );
  };


  const submit = async (e) => {
    e.preventDefault();

    // ✅ Verifica duplicidade
    if (codigoJaExiste(form.codigo, editing?._id)) {
      return showToast('⚠️ Este código já está cadastrado! Use outro.', 'warning');
    }

    const dados = { ...form, preco: parseFloat(form.preco), estoque: parseInt(form.estoque) || 0 };
    try {
      editing ? await api.put(`/products/${editing._id}`, dados) : await api.post('/products', dados);
      showToast(editing ? '✅ Produto atualizado!' : '✅ Produto cadastrado!', 'success');
      setForm({ codigo: '', nome: '', categoria: 'Outros', preco: '', estoque: '' });
      setEditing(null);
      carregar();
    } catch (err) {
      showToast(err.response?.data?.msg || '❌ Erro ao salvar', 'error');
    }
  };


  const alterar = (p) => {
    setEditing(p);
    setForm({ codigo: p.codigo, nome: p.nome, categoria: p.categoria, preco: p.preco, estoque: p.estoque });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  const remover = async (id) => {
    if (!window.confirm('Excluir este produto?')) return;
    await api.delete(`/products/${id}`);
    showToast('Produto removido', 'warning');
    carregar();
  };


  const cancelar = () => {
    setEditing(null);
    setForm({ codigo: '', nome: '', categoria: 'Outros', preco: '', estoque: '' });
  };


  const filtrados = produtos.filter(p =>
    p.nome.toLowerCase().includes(filtro.toLowerCase()) || String(p.codigo).includes(filtro)
  );


  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>📦 Cadastro de Produtos</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>Gerencie seu catálogo de produtos</p>
      </div>


      <div style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
        borderRadius: 16, padding: 16, marginBottom: 16
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 14px', color: 'var(--text-primary)' }}>
          {editing ? '✏️ Editar Produto' : '➕ Novo Produto'}
        </h3>
        <form onSubmit={submit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }} className="form-grid-prod">
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5, display: 'block' }}>
                Código {!editing && <span style={{ color: 'var(--success-bg)', fontSize: 11 }}>(automático)</span>}
              </label>
              <input 
                placeholder="Automático" 
                value={form.codigo} 
                readOnly={!editing}
                onChange={e => setForm({ ...form, codigo: e.target.value })}
                style={{
                  ...inputStyle,
                  background: !editing ? 'var(--bg-tertiary)' : 'var(--input-bg)',
                  cursor: !editing ? 'not-allowed' : 'text'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5, display: 'block' }}>Nome *</label>
              <input placeholder="Nome do produto" value={form.nome} required
                onChange={e => setForm({ ...form, nome: e.target.value })}
                style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5, display: 'block' }}>Categoria</label>
              <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} style={inputStyle}>
                {categorias.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5, display: 'block' }}>Preço (R$) *</label>
              <input type="number" step="0.01" min={0} placeholder="0.00" value={form.preco} required
                onChange={e => setForm({ ...form, preco: e.target.value })}
                style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5, display: 'block' }}>Estoque</label>
              <input type="number" min={0} placeholder="0" value={form.estoque}
                onChange={e => setForm({ ...form, estoque: e.target.value })}
                style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button type="submit" style={{
              flex: 1, padding: '12px', background: 'var(--accent-primary)', color: '#fff',
              border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
              cursor: 'pointer', minHeight: 46
            }}>{editing ? 'Atualizar' : 'Cadastrar'}</button>
            {editing && <button type="button" onClick={cancelar} style={{
              padding: '12px 20px', background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
              border: '1.5px solid var(--border-color)', borderRadius: 10,
              fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 46
            }}>Cancelar</button>}
          </div>
        </form>
      </div>


      <div style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
        borderRadius: 16, padding: 16
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            Cadastrados
            <span style={{ background: 'var(--accent-light)', color: 'var(--accent-primary)', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
              {filtrados.length}
            </span>
          </h3>
          <input placeholder="Filtrar..." value={filtro}
            onChange={e => setFiltro(e.target.value)}
            style={{ ...inputStyle, width: 180, padding: '8px 12px', minHeight: 40 }} />
        </div>


        <div style={{ overflowX: 'auto', margin: '0 -16px', padding: '0 16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                {['Código', 'Nome', 'Categoria', 'Preço', 'Estoque', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '10px 8px', textAlign: 'left', fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)', fontSize: 13 }}>Nenhum produto cadastrado</td></tr>
              ) : filtrados.map(p => (
                <tr key={p._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '10px 8px', fontFamily: 'monospace', fontSize: 13 }}>{p.codigo}</td>
                  <td style={{ padding: '10px 8px', fontWeight: 600, fontSize: 13, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{
                      background: (corCategoria[p.categoria] || corCategoria.Outros).bg,
                      color: (corCategoria[p.categoria] || corCategoria.Outros).txt,
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600
                    }}>{p.categoria}</span>
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)', fontVariantNumeric: 'tabular-nums' }}>R$ {Number(p.preco).toFixed(2).replace('.', ',')}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'center', color: p.estoque <= 5 ? 'var(--error-bg)' : 'var(--text-primary)', fontWeight: p.estoque <= 5 ? 700 : 500 }}>{p.estoque}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button onClick={() => alterar(p)} style={btnTable}>Editar</button>
                    <button onClick={() => remover(p._id)} style={{ ...btnTable, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error-bg)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


      <style>{`
        @media (min-width: 640px) {
          .form-grid-prod { grid-template-columns: 1fr 1fr !important; }
        }
        @media (min-width: 1024px) {
          .form-grid-prod { grid-template-columns: 1fr 2fr 1fr 1fr 1fr !important; }
        }
      `}</style>
    </div>
  );
}


const corCategoria = {
  Alimentos: { bg: 'rgba(234,88,12,.12)', txt: '#ea580c' },
  Bebidas: { bg: 'rgba(37,99,171,.12)', txt: '#2563ab' },
  Limpeza: { bg: 'rgba(13,148,136,.12)', txt: '#0d9488' },
  Higiene: { bg: 'rgba(189,49,147,.12)', txt: '#bd3193' },
  Hortifruti: { bg: 'rgba(22,163,74,.12)', txt: '#16a34a' },
  Padaria: { bg: 'rgba(180,83,9,.12)', txt: '#b45309' },
  Outros: { bg: 'rgba(100,116,139,.12)', txt: '#64748b' }
};


const inputStyle = {
  width: '100%', padding: '12px 14px', border: '1.5px solid var(--border-color)',
  borderRadius: 10, fontSize: 16, boxSizing: 'border-box',
  outline: 'none', background: 'var(--input-bg)', color: 'var(--input-text)', minHeight: 48
};


const btnTable = {
  padding: '6px 12px', margin: '0 3px', background: 'var(--bg-secondary)', color: 'var(--text-primary)',
  border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12,
  fontWeight: 600, cursor: 'pointer', minHeight: 34
};