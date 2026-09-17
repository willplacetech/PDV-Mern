import { useState, useEffect, useMemo } from 'react';
import api from '../services/api.jsx';

export default function Orders() {
  const [pedidos, setPedidos] = useState([]);
  const [selecionado, setSelecionado] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [categoria, setCategoria] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [valorConferido, setValorConferido] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [cancelando, setCancelando] = useState(false);

  const carregar = async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams();
      if (filtroStatus !== 'todos') params.set('status', filtroStatus);
      if (categoria) params.set('categoria', categoria);
      if (inicio && fim) { params.set('inicio', inicio); params.set('fim', fim); }
      const url = `/orders${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await api.get(url);
      setPedidos(res.data || []);
    } catch (err) {
      console.error('Erro ao carregar pedidos:', err);
      setPedidos([]);
    } finally {
      setCarregando(false);
    }
  };

  // O histórico recarrega quando qualquer filtro muda.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
  }, [filtroStatus, categoria, inicio, fim]); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ Função de cancelamento - AJUSTADA PARA SUA ROTA
  const cancelarPedido = async (pedidoId) => {
    if (!window.confirm('Tem certeza que deseja cancelar este pedido?')) {
      return;
    }

    setCancelando(true);
    try {
      // ✅ Rota correta: /orders/:id/cancelar
      await api.patch(`/orders/${pedidoId}/cancelar`);
      alert('✅ Pedido cancelado com sucesso!');
      setSelecionado(null);
      carregar(); // Recarrega a lista para atualizar o status
    } catch (err) {
      console.error('Erro ao cancelar pedido:', err);
      // ✅ Backend retorna { msg: '...' }
      alert(err.response?.data?.msg || '❌ Erro ao cancelar pedido. Tente novamente.');
    } finally {
      setCancelando(false);
    }
  };

  // ✅ Só permite cancelar se NÃO estiver pago e NÃO já cancelado
  const podeCancelar = (status) => {
    return ['pendente', 'parcial'].includes(status);
  };

  const totalVendido = useMemo(() => {
    if (!Array.isArray(pedidos) || pedidos.length === 0) return 0;

    const soma = pedidos.reduce((ac, p) => {
      const valor = parseFloat(
        p.total || 
        p.valorTotal || 
        p.totalPedido || 
        p.valor || 
        p.subtotal || 
        0
      ) || 0;
      return ac + valor;
    }, 0);

    return soma;
  }, [pedidos]);

  const vendasPorCategoria = useMemo(() => pedidos.reduce((resumo, pedido) => {
    (pedido.itens || []).forEach(item => {
      const nome = item.categoria || 'Sem categoria';
      resumo[nome] = (resumo[nome] || 0) + Number(item.precoUnitario || 0) * Number(item.pesoKg || item.quantidade || 0);
    });
    return resumo;
  }, {}), [pedidos]);
  const diferencaCaixa = valorConferido === '' ? null : Number(valorConferido) - totalVendido;

  const getStatusInfo = (status) => {
    const map = {
      pendente: { cor: '#f59e0b', texto: '⏳ PENDENTE' },
      pago: { cor: '#22c55e', texto: '✅ PAGO' },
      parcial: { cor: '#3b82f6', texto: '💰 PARCIAL' },
      cancelado: { cor: '#ef4444', texto: '❌ CANCELADO' }
    };
    return map[status] || { cor: '#94a3b8', texto: status?.toUpperCase() || '—' };
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>📋 Histórico de Pedidos</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>Acompanhe todas as vendas realizadas</p>
      </div>

      {/* FILTRO DE STATUS */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { valor: 'todos', label: '📋 Todos' },
          { valor: 'pendente', label: '⏳ Pendentes' },
          { valor: 'parcial', label: '💰 Parciais' },
          { valor: 'pago', label: '✅ Pagos' },
          { valor: 'cancelado', label: '❌ Cancelados' }
        ].map(item => (
          <button
            key={item.valor}
            onClick={() => setFiltroStatus(item.valor)}
            style={{
              padding: '6px 14px', borderRadius: '20px', border: 'none',
              fontSize: '12px', fontWeight: filtroStatus === item.valor ? '700' : '500',
              cursor: 'pointer', transition: 'all 0.2s',
              background: filtroStatus === item.valor ? '#ea580c' : '#f1f5f9',
              color: filtroStatus === item.valor ? '#fff' : '#475569'
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>De <input type="date" value={inicio} onChange={e => setInicio(e.target.value)} /></label>
        <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Até <input type="date" value={fim} onChange={e => setFim(e.target.value)} /></label>
        <select value={categoria} onChange={e => setCategoria(e.target.value)} style={{ padding: '7px 10px', borderRadius: 8 }}>
          <option value="">Todas as categorias</option>
          {['Frios', 'Padaria', 'Hortifruti', 'Açougue', 'Bebidas', 'Limpeza', 'Mercearia'].map(item => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      <div style={{ background: '#fff', border: '1px solid rgba(15,23,42,.08)', borderRadius: 16, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            Pedidos
            <span style={{ background: 'rgba(234,88,12,.14)', color: '#ea580c', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
              {pedidos.length}
            </span>
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>Total vendido:</span>
            <span style={{ fontWeight: 700, color: '#16a34a', fontSize: 16 }}>
              {carregando ? (
                <span style={{ color: '#94a3b8' }}>Carregando...</span>
              ) : (
                `R$ ${totalVendido.toFixed(2).replace('.', ',')}`
              )}
            </span>
          </div>
        </div>

        {carregando ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            ⏳ Carregando pedidos...
          </div>
        ) : (
          <div style={{ overflowX: 'auto', margin: '0 -16px', padding: '0 16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 650 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(15,23,42,.08)' }}>
                  {['Nº', 'Data', 'Status', 'Cliente', 'Itens', 'Total', 'Ver'].map(h => (
                    <th key={h} style={{ padding: '10px 8px', textAlign: ['Total','Ver'].includes(h) ? 'right' : 'left', fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pedidos.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#64748b', fontSize: 13 }}>Nenhum pedido realizado</td></tr>
                ) : pedidos.slice(0, 100).map(p => {
                  const statusInfo = getStatusInfo(p.status);
                  const valorTotal = Number(p?.total || p?.valorTotal || p?.subtotal || 0);
                  return (
                    <tr key={p._id} style={{ borderBottom: '1px solid rgba(15,23,42,.06)' }}>
                      <td style={{ padding: '10px 8px', fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>#{p.numero}</td>
                      <td style={{ padding: '10px 8px', fontSize: 12, color: '#64748b' }}>
                        {new Date(p.createdAt).toLocaleDateString('pt-BR')} {new Date(p.createdAt).toLocaleTimeString('pt-BR').slice(0, 5)}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                          background: `${statusInfo.cor}15`, color: statusInfo.cor, whiteSpace: 'nowrap'
                        }}>
                          {statusInfo.texto}
                        </span>
                      </td>
                      <td style={{ padding: '10px 8px', fontSize: 13, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.clienteNome}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: 13 }}>{p.itens?.length || 0}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#ea580c', fontVariantNumeric: 'tabular-nums' }}>
                        R$ {valorTotal.toFixed(2).replace('.', ',')}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                        <button onClick={() => setSelecionado(p)} style={{
                          padding: '6px 14px', background: 'rgba(234,88,12,.1)', color: '#ea580c',
                          border: '1px solid rgba(234,88,12,.2)', borderRadius: 8, fontSize: 12,
                          fontWeight: 600, cursor: 'pointer', minHeight: 34
                        }}>Detalhes</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 16 }}>
        {Object.entries(vendasPorCategoria).map(([nome, valor]) => (
          <div key={nome} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{nome}</div>
            <strong style={{ display: 'block', marginTop: 5, color: 'var(--accent-primary)' }}>R$ {valor.toFixed(2).replace('.', ',')}</strong>
          </div>
        ))}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Conferência de caixa</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 7 }}>
            <input type="number" step="0.01" min="0" placeholder="Valor contado" value={valorConferido} onChange={e => setValorConferido(e.target.value)} style={{ width: '100%', minWidth: 0 }} />
          </div>
          {diferencaCaixa !== null && <small style={{ color: Math.abs(diferencaCaixa) < 0.01 ? 'var(--success-bg)' : 'var(--error-bg)' }}>{Math.abs(diferencaCaixa) < 0.01 ? 'Caixa conferido' : `Diferença: R$ ${diferencaCaixa.toFixed(2).replace('.', ',')}`}</small>}
        </div>
      </div>

      {/* Modal Detalhes */}
      {selecionado && (
        <div onClick={() => setSelecionado(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          zIndex: 100, padding: 0
        }} className="modal-bg">
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 500,
            maxHeight: '85vh', overflowY: 'auto', padding: 24
          }} className="modal-inner">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px 0' }}>Pedido #{selecionado.numero}</h3>
                <span style={{ fontSize: '13px', fontWeight: 600, color: getStatusInfo(selecionado.status).cor }}>
                  {getStatusInfo(selecionado.status).texto}
                </span>
              </div>
              <button onClick={() => setSelecionado(null)} style={{
                background: 'transparent', border: 'none', fontSize: 26,
                color: '#64748b', cursor: 'pointer', minWidth: 44, minHeight: 44
              }}>×</button>
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
              📅 {new Date(selecionado.createdAt).toLocaleString('pt-BR')}<br />
              👤 {selecionado.clienteNome}<br />
              💼 Atendente: {selecionado.atendente || '—'}
            </div>
            <div style={{ borderTop: '1px solid rgba(15,23,42,.08)', paddingTop: 10, marginBottom: 10 }}>
              {(selecionado.itens || []).map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dashed rgba(15,23,42,.08)' }}>
                  <div style={{ paddingRight: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{item.nome}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {item.quantidade} × R$ {Number(item.precoUnitario || 0).toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                    R$ {Number((item.quantidade || 0) * (item.precoUnitario || 0)).toFixed(2).replace('.', ',')}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '2px solid #ea580c', paddingTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#64748b', marginBottom: 4 }}>
                <span>Subtotal</span>
                <span>R$ {Number(selecionado.subtotal || 0).toFixed(2).replace('.', ',')}</span>
              </div>
              {(selecionado.desconto || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#16a34a', marginBottom: 4 }}>
                  <span>Desconto</span>
                  <span>-R$ {Number(selecionado.desconto || 0).toFixed(2).replace('.', ',')}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 22, color: '#ea580c', marginTop: 8 }}>
                <span>Total</span>
                <span>R$ {Number(selecionado.total || selecionado.valorTotal || 0).toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            {/* ✅ BOTÃO CANCELAR — SÓ APARECE SE PENDENTE OU PARCIAL */}
            {podeCancelar(selecionado.status) && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(15,23,42,.08)' }}>
                <button
                  onClick={() => cancelarPedido(selecionado._id)}
                  disabled={cancelando}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: cancelando ? '#fca5a5' : '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: cancelando ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                  {cancelando ? '⏳ Cancelando...' : '❌ Cancelar Pedido'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @media (min-width: 640px) {
          .modal-bg { align-items: center !important; padding: 20px !important; }
          .modal-inner { border-radius: 16px !important; }
        }
      `}</style>
    </div>
  );
}