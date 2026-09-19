import { useState, useEffect, useMemo } from 'react';
import api from '../services/api.jsx';

export default function Orders() {
  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [selecionado, setSelecionado] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [clienteFiltro, setClienteFiltro] = useState('');
  const [categoria, setCategoria] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [valorConferido, setValorConferido] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [cancelando, setCancelando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    const carregarClientes = async () => {
      try {
        const { data } = await api.get('/customers');
        setClientes(data || []);
      } catch (error) {
        console.error('Erro ao carregar clientes:', error);
      }
    };

    carregarClientes();
  }, []);

  const carregar = async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams();
      if (filtroStatus !== 'todos') params.set('status', filtroStatus);
      if (clienteFiltro) params.set('clienteId', clienteFiltro);
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
  }, [filtroStatus, clienteFiltro, categoria, inicio, fim]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const excluirPedido = async (pedidoId) => {
    if (!window.confirm('Tem certeza que deseja excluir permanentemente este pedido?')) {
      return;
    }

    setExcluindo(true);
    try {
      await api.delete(`/orders/${pedidoId}`);
      alert('✅ Pedido excluído com sucesso!');
      setSelecionado(null);
      carregar();
    } catch (err) {
      console.error('Erro ao excluir pedido:', err);
      alert(err.response?.data?.msg || '❌ Erro ao excluir pedido. Tente novamente.');
    } finally {
      setExcluindo(false);
    }
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

  const gerarRelatorio = () => {
    const nomeCliente = clientes.find(c => c._id === clienteFiltro)?.nome || 'Todos os clientes';
    const linhas = pedidos.length > 0
      ? pedidos.map((pedido) => `
          <tr>
            <td>#${pedido.numero}</td>
            <td>${new Date(pedido.createdAt).toLocaleDateString('pt-BR')}</td>
            <td>${pedido.clienteNome || 'Cliente não identificado'}</td>
            <td>${pedido.itens?.length || 0}</td>
            <td>R$ ${(Number(pedido.total || 0)).toFixed(2).replace('.', ',')}</td>
            <td>${(pedido.status || 'pendente').toUpperCase()}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="6">Nenhum pedido encontrado</td></tr>';

    const janela = window.open('', '_blank', 'width=980,height=760');
    if (!janela) {
      alert('O navegador bloqueou a janela de impressão. Permita pop-ups para gerar o relatório.');
      return;
    }

    janela.document.write(`<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Relatório de Pedidos</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 32px; color: #111827; }
            h1 { font-size: 26px; margin-bottom: 8px; }
            .topo { margin-bottom: 20px; }
            .meta { display: grid; grid-template-columns: repeat(3, minmax(180px, 1fr)); gap: 10px; font-size: 13px; margin-bottom: 20px; }
            .meta div { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
            th { background: #f1f5f9; }
            .resumo { font-weight: 700; margin-top: 18px; font-size: 15px; }
            @media print { @page { margin: 20mm; } body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="topo">
            <h1>Relatório de Pedidos</h1>
            <div>Cliente: <strong>${nomeCliente}</strong></div>
          </div>
          <div class="meta">
            <div>Período: ${inicio || 'Qualquer data'}</div>
            <div>Até: ${fim || 'Último registro'}</div>
            <div>Pedidos: <strong>${pedidos.length}</strong></div>
            <div>Status: ${filtroStatus === 'todos' ? 'Todos' : filtroStatus}</div>
            <div>Categoria: ${categoria || 'Todas'}</div>
            <div>Total: <strong>R$ ${totalVendido.toFixed(2).replace('.', ',')}</strong></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Nº</th>
                <th>Data</th>
                <th>Cliente</th>
                <th>Itens</th>
                <th>Valor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>${linhas}</tbody>
          </table>
          <div class="resumo">Total vendido no filtro: R$ ${totalVendido.toFixed(2).replace('.', ',')}</div>
        </body>
      </html>
    `);
    janela.document.close();
    setTimeout(() => {
      janela.focus();
      janela.print();
    }, 250);
  };

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
              padding: '6px 14px', borderRadius: '20px', border: '1px solid var(--border-color)',
              fontSize: '12px', fontWeight: filtroStatus === item.valor ? '700' : '500',
              cursor: 'pointer', transition: 'all 0.2s',
              background: filtroStatus === item.valor ? 'var(--accent-primary)' : 'var(--bg-secondary)',
              color: filtroStatus === item.valor ? '#fff' : 'var(--text-primary)'
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>De <input type="date" value={inicio} onChange={e => setInicio(e.target.value)} /></label>
        <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Até <input type="date" value={fim} onChange={e => setFim(e.target.value)} /></label>
        <select value={clienteFiltro} onChange={e => setClienteFiltro(e.target.value)} style={{ padding: '7px 10px', borderRadius: 8, minWidth: 180 }}>
          <option value="">Todos os clientes</option>
          {clientes.map(cliente => (
            <option key={cliente._id} value={cliente._id}>{cliente.nome}</option>
          ))}
        </select>
        <select value={categoria} onChange={e => setCategoria(e.target.value)} style={{ padding: '7px 10px', borderRadius: 8 }}>
          <option value="">Todas as categorias</option>
          {['Frios', 'Padaria', 'Hortifruti', 'Açougue', 'Bebidas', 'Limpeza', 'Mercearia'].map(item => <option key={item} value={item}>{item}</option>)}
        </select>
        <button
          type="button"
          onClick={gerarRelatorio}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid rgba(234,88,12,.4)',
            background: 'rgba(234,88,12,.1)',
            color: '#ea580c',
            fontWeight: 700,
            cursor: 'pointer',
            marginLeft: 'auto'
          }}
        >
          🖨️ Imprimir relatório
        </button>
      </div>

      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 16, boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
            Pedidos
            <span style={{ background: 'rgba(234,88,12,.14)', color: '#ea580c', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
              {pedidos.length}
            </span>
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Total vendido:</span>
            <span style={{ fontWeight: 700, color: 'var(--success-bg)', fontSize: 16 }}>
              {carregando ? (
                <span style={{ color: 'var(--text-tertiary)' }}>Carregando...</span>
              ) : (
                `R$ ${totalVendido.toFixed(2).replace('.', ',')}`
              )}
            </span>
          </div>
        </div>

        {carregando ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            ⏳ Carregando pedidos...
          </div>
        ) : (
          <div style={{ overflowX: 'auto', margin: '0 -16px', padding: '0 16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 650, background: 'var(--bg-secondary)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  {['Nº', 'Data', 'Status', 'Cliente', 'Itens', 'Total', 'Ver'].map(h => (
                    <th key={h} style={{ padding: '10px 8px', textAlign: ['Total','Ver'].includes(h) ? 'right' : 'left', fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pedidos.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)', fontSize: 13 }}>Nenhum pedido realizado</td></tr>
                ) : pedidos.slice(0, 100).map(p => {
                  const statusInfo = getStatusInfo(p.status);
                  const valorTotal = Number(p?.total || p?.valorTotal || p?.subtotal || 0);
                  return (
                    <tr key={p._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '10px 8px', fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>#{p.numero}</td>
                      <td style={{ padding: '10px 8px', fontSize: 12, color: 'var(--text-secondary)' }}>
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
                      <td style={{ padding: '10px 8px', fontSize: 13, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{p.clienteNome}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: 13, color: 'var(--text-primary)' }}>{p.itens?.length || 0}</td>
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
            <input type="number" step="0.01" min="0" placeholder="Valor contado" value={valorConferido} onChange={e => setValorConferido(e.target.value)} style={{ width: '100%', minWidth: 0, background: 'var(--input-bg)', color: 'var(--input-text)' }} />
          </div>
          {diferencaCaixa !== null && <small style={{ color: Math.abs(diferencaCaixa) < 0.01 ? 'var(--success-bg)' : 'var(--error-bg)', display: 'block', marginTop: 8 }}>{Math.abs(diferencaCaixa) < 0.01 ? 'Caixa conferido' : `Diferença: R$ ${diferencaCaixa.toFixed(2).replace('.', ',')}`}</small>}
        </div>
      </div>

      {/* Modal Detalhes */}
      {selecionado && (
        <div onClick={() => setSelecionado(null)} className="modal-backdrop modal-bg" style={{ padding: 0 }}>
          <div onClick={e => e.stopPropagation()} className="modal-panel modal-inner" style={{ padding: 24, boxSizing: 'border-box', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>Pedido #{selecionado.numero}</h3>
                <span style={{ fontSize: '13px', fontWeight: 600, color: getStatusInfo(selecionado.status).cor }}>
                  {getStatusInfo(selecionado.status).texto}
                </span>
              </div>
              <button onClick={() => setSelecionado(null)} style={{
                background: 'transparent', border: 'none', fontSize: 26,
                color: 'var(--text-secondary)', cursor: 'pointer', minWidth: 44, minHeight: 44
              }}>×</button>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              📅 {new Date(selecionado.createdAt).toLocaleString('pt-BR')}<br />
              👤 {selecionado.clienteNome}<br />
              💼 Atendente: {selecionado.atendente || '—'}
            </div>
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 10, marginBottom: 10 }}>
              {(selecionado.itens || []).map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dashed var(--border-color)' }}>
                  <div style={{ paddingRight: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{item.nome}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {item.quantidade} × R$ {Number(item.precoUnitario || 0).toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, flexShrink: 0, color: 'var(--text-primary)' }}>
                    R$ {Number((item.quantidade || 0) * (item.precoUnitario || 0)).toFixed(2).replace('.', ',')}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '2px solid #ea580c', paddingTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>
                <span>Subtotal</span>
                <span>R$ {Number(selecionado.subtotal || 0).toFixed(2).replace('.', ',')}</span>
              </div>
              {(selecionado.desconto || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--success-bg)', marginBottom: 4 }}>
                  <span>Desconto</span>
                  <span>-R$ {Number(selecionado.desconto || 0).toFixed(2).replace('.', ',')}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 22, color: '#ea580c', marginTop: 8 }}>
                <span>Total</span>
                <span>R$ {Number(selecionado.total || selecionado.valorTotal || 0).toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            <div className="modal-actions" style={{
              position: 'sticky',
              bottom: 0,
              zIndex: 2,
              display: 'grid',
              gap: 12,
              marginTop: 20,
              paddingTop: 16,
              borderTop: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              boxShadow: '0 -12px 20px rgba(15, 23, 42, 0.04)'
            }}>
              <button
                onClick={() => excluirPedido(selecionado._id)}
                disabled={excluindo}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: excluindo ? '#fca5a5' : '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: excluindo ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                {excluindo ? '⏳ Excluindo...' : '🗑️ Excluir Pedido'}
              </button>

              {podeCancelar(selecionado.status) && (
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
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          .modal-bg { align-items: flex-end !important; padding: 0 !important; }
          .modal-inner {
            border-radius: 20px 20px 0 0 !important;
            padding-bottom: 20px !important;
          }
          .modal-actions {
            grid-template-columns: 1fr !important;
            position: sticky !important;
            bottom: 0 !important;
          }
        }

        @media (min-width: 640px) {
          .modal-bg { align-items: center !important; padding: 20px !important; }
          .modal-inner { border-radius: 16px !important; }
          .modal-actions { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  );
}