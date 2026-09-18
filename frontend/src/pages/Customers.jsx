import { useState, useEffect } from 'react';
import api from '../services/api.jsx';
import { useToast } from '../components/Toast.jsx';


// 🎯 Máscaras
const aplicarMascaraTelefone = (valor) => {
  if (!valor) return '';
  const apenasNumeros = valor.replace(/\D/g, '');
  if (apenasNumeros.length <= 2) return apenasNumeros.replace(/^(\d{0,2})/, '($1');
  if (apenasNumeros.length <= 7) return apenasNumeros.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
  return apenasNumeros.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
};

const aplicarMascaraDocumento = (valor) => {
  if (!valor) return '';
  const apenasNumeros = valor.replace(/\D/g, '');
  if (apenasNumeros.length > 11) {
    return apenasNumeros.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5');
  }
  if (apenasNumeros.length <= 3) return apenasNumeros;
  if (apenasNumeros.length <= 6) return apenasNumeros.replace(/^(\d{3})(\d{0,3})/, '$1.$2');
  if (apenasNumeros.length <= 9) return apenasNumeros.replace(/^(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
  return apenasNumeros.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4');
};

const documentoValido = (valor) => {
  const digitos = valor.replace(/\D/g, '');
  if (![11, 14].includes(digitos.length) || /^(\d)\1+$/.test(digitos)) return false;
  const calcularDigito = (base, pesos) => {
    let soma = 0;
    for (let i = 0; i < base.length; i += 1) soma += Number(base[i]) * pesos[i];
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const cpf = digitos.length === 11;
  const pesosPrimeiro = cpf ? [10, 9, 8, 7, 6, 5, 4, 3, 2] : [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesosSegundo = cpf ? [11, 10, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const base = digitos.slice(0, -2);
  const primeiro = calcularDigito(base, pesosPrimeiro);
  const segundo = calcularDigito(base + primeiro, pesosSegundo);
  return digitos.endsWith(`${primeiro}${segundo}`);
};

const tipoDocumento = (valor) => valor.replace(/\D/g, '').length === 14 ? 'CNPJ' : 'CPF';
const mensagemDocumento = (valor) => {
  const quantidade = valor.replace(/\D/g, '').length;
  if (quantidade < 11) return 'Digite os 11 do CPF ou 14 do CNPJ';
  if (quantidade > 14) return 'CPF/CNPJ inválido. Verifique os dígitos.';
  if (quantidade > 11 && quantidade < 14) return 'Faltam dígitos';
  return documentoValido(valor) ? '' : 'CPF/CNPJ inválido. Verifique os dígitos.';
};


export default function Customers() {
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState({ nome: '', telefone: '', endereco: '', email: '', documento: '' });
  const [documentoErro, setDocumentoErro] = useState('');
  const [editing, setEditing] = useState(null);
  const { showToast } = useToast();


  const carregar = async () => {
    const res = await api.get('/customers');
    setClientes(res.data);
  };

  // O carregamento inicial sincroniza a lista com a API.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { carregar(); }, []);

  const documentoJaExiste = (documento, idEdicao = null) => {
    const documentoLimpo = String(documento).replace(/\D/g, '');
    return clientes.some(c => 
      String(c.documento || c.cpf || '').replace(/\D/g, '') === documentoLimpo && c._id !== idEdicao
    );
  };


  const submit = async (e) => {
    e.preventDefault();
    
    const telefoneLimpo = form.telefone.replace(/\D/g, '');
    const documentoLimpo = form.documento.replace(/\D/g, '');

    // ✅ Validações obrigatórias
    if (!form.nome.trim()) {
      return showToast('⚠️ Nome é obrigatório!', 'warning');
    }
    if (telefoneLimpo.length !== 11) {
      return showToast('⚠️ Telefone inválido! Digite com DDD e 9 dígitos', 'warning');
    }
    const erro = mensagemDocumento(form.documento);
    if (erro) {
      setDocumentoErro(erro);
      return showToast(`⚠️ ${erro}`, 'warning');
    }

    if (documentoJaExiste(documentoLimpo, editing?._id)) {
      return showToast('⚠️ Este documento já está cadastrado!', 'warning');
    }

    const dadosParaEnviar = {
      nome: form.nome.trim(),
      telefone: telefoneLimpo,
      documento: documentoLimpo,
      tipoDocumento: tipoDocumento(form.documento),
      endereco: form.endereco?.trim() || '',
      email: form.email?.trim() || ''
    };

    try {
      editing 
        ? await api.put(`/customers/${editing._id}`, dadosParaEnviar) 
        : await api.post('/customers', dadosParaEnviar);
      
      showToast(editing ? '✅ Cliente atualizado!' : '✅ Cliente cadastrado!', 'success');
      setForm({ nome: '', telefone: '', endereco: '', email: '', documento: '' });
      setDocumentoErro('');
      setEditing(null);
      carregar();
    } catch {
      showToast('❌ Erro ao salvar', 'error');
    }
  };


  const alterar = (c) => {
    setEditing(c);
    setForm({ 
      nome: c.nome, 
      telefone: aplicarMascaraTelefone(c.telefone || ''), 
      endereco: typeof c.endereco === 'object' ? Object.values(c.endereco).filter(Boolean).join(', ') : (c.endereco || ''),
      email: c.email || '',
      documento: aplicarMascaraDocumento(c.documento || c.cpf || '')
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  const remover = async (id) => {
    if (!window.confirm('Excluir este cliente?')) return;
    await api.delete(`/customers/${id}`);
    showToast('Cliente removido', 'warning');
    carregar();
  };


  const handleTelefoneChange = (e) => {
    const valor = e.target.value.replace(/\D/g, '').slice(0, 11);
    setForm({ ...form, telefone: aplicarMascaraTelefone(valor) });
  };

  const handleCpfChange = (e) => {
    const valor = e.target.value.replace(/\D/g, '').slice(0, 14);
    setForm({ ...form, documento: aplicarMascaraDocumento(valor) });
    setDocumentoErro('');
  };

  const validarDocumento = () => setDocumentoErro(mensagemDocumento(form.documento));


  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>👤 Cadastro de Clientes</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>Gerencie sua base de clientes</p>
      </div>


      <div style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
        borderRadius: 16, padding: 16, marginBottom: 16
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 14px', color: 'var(--text-primary)' }}>
          {editing ? '✏️ Editar Cliente' : '➕ Novo Cliente'}
        </h3>
        <form onSubmit={submit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }} className="form-grid-cli">
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5, display: 'block' }}>
                Nome * <span style={{ color: 'var(--error-bg)', fontSize: 10 }}>(obrigatório)</span>
              </label>
              <input 
                placeholder="Nome completo" 
                value={form.nome} 
                required
                onChange={e => setForm({ ...form, nome: e.target.value })}
                style={inputStyle} 
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5, display: 'block' }}>
                Telefone * <span style={{ color: 'var(--error-bg)', fontSize: 10 }}>(obrigatório)</span>
              </label>
              <input 
                placeholder="(11) 99999-9999" 
                value={form.telefone}
                onChange={handleTelefoneChange}
                style={inputStyle} 
                required
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5, display: 'block' }}>E-mail</label>
              <input
                type="email"
                placeholder="cliente@email.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5, display: 'block' }}>
                Documento * <span style={{ color: 'var(--error-bg)', fontSize: 10 }}>(CPF ou CNPJ)</span>
              </label>
              <input 
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                value={form.documento}
                onChange={handleCpfChange}
                onBlur={validarDocumento}
                style={{ ...inputStyle, borderColor: documentoErro ? 'var(--error-bg)' : 'var(--border-color)' }}
                required
              />
              {documentoErro && <small style={{ color: 'var(--error-bg)', display: 'block', marginTop: 5 }}>{documentoErro}</small>}
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5, display: 'block' }}>
                Endereço
              </label>
              <input 
                placeholder="Rua, número, bairro (opcional)" 
                value={form.endereco}
                onChange={e => setForm({ ...form, endereco: e.target.value })}
                style={inputStyle} 
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button type="submit" className="primary-button" style={{ flex: 1, minHeight: 46 }}>{editing ? 'Atualizar' : 'Cadastrar'}</button>
            {editing && <button type="button" className="secondary-button" onClick={() => { 
              setEditing(null); 
              setForm({ nome: '', telefone: '', endereco: '', email: '', documento: '' });
              setDocumentoErro('');
            }} style={{ minHeight: 46 }}>Cancelar</button>}
          </div>
        </form>
      </div>


      <div style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
        borderRadius: 16, padding: 16
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          Cadastrados
          <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-bg)', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
            {clientes.length}
          </span>
        </h3>
        <div style={{ overflowX: 'auto', margin: '0 -16px', padding: '0 16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                {['Nome', 'Telefone', 'Documento', 'Endereço', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '10px 8px', textAlign: 'left', fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clientes.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)', fontSize: 13 }}>Nenhum cliente cadastrado</td></tr>
              ) : clientes.map(c => (
                <tr key={c._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '10px 8px', fontWeight: 600, fontSize: 13 }}>{c.nome}</td>
                  <td style={{ padding: '10px 8px', fontSize: 13, fontFamily: 'monospace' }}>
                    {aplicarMascaraTelefone(c.telefone) || '-'}
                  </td>
                  <td style={{ padding: '10px 8px', fontSize: 13, fontFamily: 'monospace' }}>
                    {aplicarMascaraDocumento(c.documento || c.cpf) || '-'}
                  </td>
                  <td style={{ padding: '10px 8px', fontSize: 13, color: 'var(--text-secondary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {typeof c.endereco === 'object' ? Object.values(c.endereco).filter(Boolean).join(', ') || '-' : (c.endereco || '-')}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button onClick={() => alterar(c)} style={btnTable}>Editar</button>
                    <button onClick={() => remover(c._id)} style={{ ...btnTable, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error-bg)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


      <style>{`
        @media (min-width: 640px) {
          .form-grid-cli { grid-template-columns: 1fr 1fr !important; }
        }
        @media (min-width: 1024px) {
          .form-grid-cli { grid-template-columns: 2fr 1fr 1fr 2fr !important; }
        }
      `}</style>
    </div>
  );
}


const inputStyle = {
  width: '100%', padding: '12px 14px', border: '1.5px solid var(--border-color)',
  borderRadius: 12, fontSize: 16, boxSizing: 'border-box',
  outline: 'none', background: 'var(--input-bg)', color: 'var(--input-text)', minHeight: 48,
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease'
};


const btnTable = {
  padding: '7px 12px', margin: '0 3px', background: 'var(--bg-secondary)', color: 'var(--text-primary)',
  border: '1.5px solid var(--border-color)', borderRadius: 10, fontSize: 12,
  fontWeight: 700, cursor: 'pointer', minHeight: 34
};