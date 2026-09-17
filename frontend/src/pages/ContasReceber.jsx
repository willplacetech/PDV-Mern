import { useState, useEffect, useMemo } from 'react';
import api from '../services/api.jsx';
import { useToast } from '../components/Toast.jsx';
import { enviarMensagemWhatsApp } from '../services/whatsapp.js';


const statusCor = {
  pendente: { bg: '#fff7ed', txt: '#c2410c', label: 'Pendente' },
  parcial: { bg: '#fef3c7', txt: '#b45309', label: 'Pagamento Parcial' },
  pago: { bg: '#f0fdf4', txt: '#166534', label: 'Quitado' },
  cancelado: { bg: '#f3f4f6', txt: '#6b7280', label: 'Cancelado' }
};


const formaPagamentoLabel = {
  dinheiro: '💵 Dinheiro',
  pix: '🔄 PIX',
  credito_loja: '🏪 Crédito Loja',
  cartao_credito: '💳 Cartão Crédito',
  cartao_debito: '💳 Cartão Débito',
  cheque: '📄 Cheque'
};


export default function ContasReceber() {
  const [carregando, setCarregando] = useState(true);
  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [clienteFiltro, setClienteFiltro] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('pendente');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [pagamentoModal, setPagamentoModal] = useState(null);
  const [pagamentoMultiploModal, setPagamentoMultiploModal] = useState(null);
  const [formPagamento, setFormPagamento] = useState({ tipo: 'credito_loja', valorRecebido: '', observacao: '' });
  const [formPagamentoMultiplo, setFormPagamentoMultiplo] = useState({ tipo: 'credito_loja', observacao: '' });
  const [selecionados, setSelecionados] = useState(new Set());
  const { showToast } = useToast();


  useEffect(() => { carregarDados(); }, []);
  useEffect(() => { 
    carregarPedidos(); 
    setSelecionados(new Set());
  }, [clienteFiltro, statusFiltro, inicio, fim]);


  const carregarDados = async () => {
    try {
      const res = await api.get('/customers');
      setClientes(res.data);
    } catch { showToast('Erro ao carregar clientes', 'error'); }
  };


  const carregarPedidos = async () => {
    try {
      setCarregando(true);
      const params = new URLSearchParams();
      if (clienteFiltro) params.append('clienteId', clienteFiltro);
      if (statusFiltro) params.append('status', statusFiltro);
      if (inicio) params.append('inicio', inicio);
      if (fim) params.append('fim', fim);

      const res = await api.get(`/orders?${params}`);
      setPedidos(res.data || []);
    } catch { 
      showToast('Erro ao carregar pedidos', 'error'); 
      setPedidos([]);
    } finally {
      setCarregando(false);
    }
  };


  const totais = useMemo(() => {
    let totalEmAberto = 0;
    let totalBruto = 0;
    let totalPagoGeral = 0;

    if (!Array.isArray(pedidos) || pedidos.length === 0) {
      return { totalEmAberto, totalBruto, totalPagoGeral };
    }

    pedidos.forEach(pedido => {
      const valorTotal = parseFloat(pedido?.total) || 0;
      totalBruto += valorTotal;

      const valorPago = Array.isArray(pedido?.pagamentos)
        ? pedido.pagamentos.reduce((soma, pg) => soma + (parseFloat(pg?.valorRecebido) || 0), 0)
        : 0;
      totalPagoGeral += valorPago;

      const status = String(pedido?.status || '').toLowerCase();
      if (status !== 'pago' && status !== 'cancelado') {
        totalEmAberto += Math.max(0, valorTotal - valorPago);
      }
    });

    return { totalEmAberto, totalBruto, totalPagoGeral };
  }, [pedidos]);


  const toggleSelecionarTodos = () => {
    const todosIds = new Set(pedidos.map(p => p._id));
    if (selecionados.size === pedidos.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(todosIds);
    }
  };


  const toggleSelecionar = (id) => {
    const proximo = new Set(selecionados);
    if (proximo.has(id)) proximo.delete(id);
    else proximo.add(id);
    setSelecionados(proximo);
  };


  // ✅ Calcular valor total a receber dos selecionados
  const valorTotalSelecionados = useMemo(() => {
    return pedidos
      .filter(p => selecionados.has(p._id))
      .reduce((soma, pedido) => {
        const valorTotal = parseFloat(pedido?.total) || 0;
        const valorPago = Array.isArray(pedido?.pagamentos)
          ? pedido.pagamentos.reduce((s, pg) => s + (parseFloat(pg?.valorRecebido) || 0), 0)
          : 0;
        return soma + Math.max(0, valorTotal - valorPago);
      }, 0);
  }, [pedidos, selecionados]);


  // ✅ Abrir modal de RECEBIMENTO MÚLTIPLO dos marcados
  const abrirReceberMarcados = () => {
    if (selecionados.size === 0) {
      return showToast('Selecione pelo menos um pedido!', 'warning');
    }
    setPagamentoMultiploModal(true);
    setFormPagamentoMultiplo({
      tipo: 'credito_loja',
      observacao: ''
    });
  };


  // ✅ Registrar pagamento de TODOS os marcados
  const registrarPagamentoMultiplo = async () => {
    const pedidosSelecionados = pedidos.filter(p => selecionados.has(p._id));
    let sucessos = 0;
    let falhas = 0;

    for (const pedido of pedidosSelecionados) {
      try {
        const valorTotal = parseFloat(pedido?.total) || 0;
        const valorPago = Array.isArray(pedido?.pagamentos)
          ? pedido.pagamentos.reduce((s, pg) => s + (parseFloat(pg?.valorRecebido) || 0), 0)
          : 0;
        const valorAReceber = valorTotal - valorPago;

        await api.patch(`/orders/${pedido._id}/pagar`, {
          tipo: formPagamentoMultiplo.tipo,
          valorRecebido: valorAReceber,
          observacao: formPagamentoMultiplo.observacao
        });
        sucessos++;
      } catch {
        falhas++;
      }
    }

    setPagamentoMultiploModal(null);
    setSelecionados(new Set());
    carregarPedidos();

    if (sucessos > 0 && falhas === 0) {
      showToast(`✅ ${sucessos} pedido(s) recebido(s) com sucesso!`, 'success');
    } else if (sucessos > 0) {
      showToast(`✅ ${sucessos} recebido(s), ⚠️ ${falhas} falha(s)`, 'warning');
    } else {
      showToast('❌ Erro ao registrar pagamentos', 'error');
    }
  };


  // ✅ Receber pedido individual
  const abrirModalReceber = (pedido) => {
    const valorTotal = parseFloat(pedido?.total) || 0;
    const valorPago = Array.isArray(pedido?.pagamentos)
      ? pedido.pagamentos.reduce((soma, pg) => soma + (parseFloat(pg?.valorRecebido) || 0), 0)
      : 0;
    const valorAReceber = (valorTotal - valorPago).toFixed(2);

    setPagamentoModal(pedido);
    setFormPagamento({
      tipo: 'credito_loja',
      valorRecebido: valorAReceber,
      observacao: ''
    });
  };


  const registrarPagamento = async () => {
    try {
      await api.patch(`/orders/${pagamentoModal._id}/pagar`, formPagamento);
      showToast('✅ Pagamento registrado!', 'success');
      setPagamentoModal(null);
      setFormPagamento({ tipo: 'credito_loja', valorRecebido: '', observacao: '' });
      carregarPedidos();
    } catch { showToast('Erro ao registrar pagamento', 'error'); }
  };


  const quitarTotal = async (pedido) => {
    if (!confirm(`Deseja QUITAR totalmente o pedido #${pedido.numero}?`)) return;
    try {
      await api.patch(`/orders/${pedido._id}/quitar`, {});
      showToast('✅ Pedido QUITADO!', 'success');
      carregarPedidos();
    } catch { showToast('Erro ao quitar', 'error'); }
  };


  const imprimirComprovante = (pedido) => {
    const totalPago = Array.isArray(pedido.pagamentos)
      ? pedido.pagamentos.reduce((ac, pg) => ac + (parseFloat(pg.valorRecebido) || 0), 0)
      : 0;

    const data = new Date().toLocaleString('pt-BR');
    
    const cupom = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Comprovante de Quitação #${pedido.numero}</title>
        <style>
          * { font-family: 'Courier New', monospace; font-size: 12px; }
          body { width: 76mm; margin: 0; padding: 4mm; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .linha { border-top: 1px dashed #000; margin: 8px 0; }
          @media print { @page { margin: 0; size: 80mm auto; } }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size:16px;">COMPROVANTE DE QUITAÇÃO</div>
        <div class="center">Mercado Nascimento</div>
        <div class="linha"></div>
        <div><span class="bold">Pedido:</span> #${pedido.numero}</div>
        <div><span class="bold">Cliente:</span> ${pedido.clienteNome}</div>
        <div><span class="bold">Data Emissão:</span> ${data}</div>
        <div class="linha"></div>
        <div><span class="bold">Valor Total:</span> R$ ${parseFloat(pedido.total).toFixed(2).replace('.',',')}</div>
        <div><span class="bold">Total Pago:</span> R$ ${totalPago.toFixed(2).replace('.',',')}</div>
        <div style="color:green; font-weight:bold; font-size:14px; margin-top:10px;">✅ QUITADO</div>
        <div class="linha"></div>
        <div class="center">
          Declaro que o valor foi recebido.<br><br>
          ___________________________<br>
          Assinatura / Data
        </div>
        <script>window.onload=()=>{print();close()}</script>
      </body>
      </html>
    `;
    const janela = window.open('', '_blank', 'width=350,height=600');
    janela.document.write(cupom);
    janela.document.close();
  };


  const imprimirPedido = (pedido) => {
    const totalPago = Array.isArray(pedido.pagamentos)
      ? pedido.pagamentos.reduce((ac, pg) => ac + (parseFloat(pg.valorRecebido) || 0), 0)
      : 0;
    const falta = Math.max(0, parseFloat(pedido.total) - totalPago);
    const data = new Date(pedido.createdAt).toLocaleString('pt-BR');
    
    const itensHtml = pedido.itens.map(item => `
      <div style="display:flex; justify-content:space-between; border-bottom: 1px dashed #000; padding: 4px 0;">
        <div style="flex:1; margin-right:8px;">
          <div style="font-weight:bold;">${item.nome}</div>
          <div style="font-size:10px;">Qtd: ${item.quantidade} x R$ ${item.precoUnitario.toFixed(2).replace('.',',')}</div>
        </div>
        <div style="font-weight:bold; white-space:nowrap;">R$ ${(item.quantidade * item.precoUnitario).toFixed(2).replace('.',',')}</div>
      </div>
    `).join('');

    const cupom = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Pedido #${pedido.numero}</title>
        <style>
          * { font-family: 'Courier New', monospace; font-size: 12px; }
          body { width: 76mm; margin: 0; padding: 4mm; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .linha { border-top: 2px dashed #000; margin: 8px 0; }
          .total { font-size: 14px; font-weight: bold; border-top: 2px solid #000; padding-top: 8px; margin-top: 8px; }
          @media print { @page { margin: 0; size: 80mm auto; } }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size:14px;">Mercado Nascimento</div>
        <div class="center" style="font-size:10px; color:#c2410c; font-weight:bold;">
          ${pedido.status === 'pendente' ? 'PEDIDO PENDENTE' : 'PAGAMENTO PARCIAL'}
        </div>
        <div class="linha"></div>
        <div><span class="bold">Pedido:</span> #${pedido.numero}</div>
        <div><span class="bold">Data:</span> ${data}</div>
        <div><span class="bold">Cliente:</span> ${pedido.clienteNome}</div>
        <div class="linha"></div>
        <div class="bold center">=== ITENS ===</div>
        ${itensHtml}
        <div class="linha"></div>
        <div style="display:flex; justify-content:space-between;">
          <span>Subtotal:</span><span>R$ ${parseFloat(pedido.subtotal || pedido.total).toFixed(2).replace('.',',')}</span>
        </div>
        ${pedido.desconto > 0 ? `
        <div style="display:flex; justify-content:space-between; color:#16a34a;">
          <span>Desconto:</span><span>-R$ ${parseFloat(pedido.desconto).toFixed(2).replace('.',',')}</span>
        </div>
        ` : ''}
        <div class="total" style="display:flex; justify-content:space-between;">
          <span>TOTAL:</span><span>R$ ${parseFloat(pedido.total).toFixed(2).replace('.',',')}</span>
        </div>
        ${totalPago > 0 ? `
        <div style="display:flex; justify-content:space-between; margin-top:8px; color:#16a34a;">
          <span>Já Pago:</span><span>R$ ${totalPago.toFixed(2).replace('.',',')}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-weight:bold; color:#dc2626;">
          <span>FALTA:</span><span>R$ ${falta.toFixed(2).replace('.',',')}</span>
        </div>
        ` : `
        <div style="display:flex; justify-content:space-between; font-weight:bold; color:#c2410c; margin-top:8px;">
          <span>TOTAL A PAGAR:</span><span>R$ ${parseFloat(pedido.total).toFixed(2).replace('.',',')}</span>
        </div>
        `}
        <div class="linha"></div>
        <div class="center" style="font-size:10px;">Obrigado pela preferência!</div>
        <script>window.onload=()=>{print();close()}</script>
      </body>
      </html>
    `;
    const janela = window.open('', '_blank', 'width=350,height=600');
    janela.document.write(cupom);
    janela.document.close();
  };


  const enviarWhatsApp = (pedido) => {
    const totalPago = Array.isArray(pedido.pagamentos)
      ? pedido.pagamentos.reduce((ac, pg) => ac + (parseFloat(pg.valorRecebido) || 0), 0)
      : 0;
    const falta = Math.max(0, parseFloat(pedido.total) - totalPago);
    const data = new Date(pedido.createdAt).toLocaleString('pt-BR');

    const itensTexto = pedido.itens.map(item => 
      `• ${item.nome}\n  ${item.quantidade} x R$ ${item.precoUnitario.toFixed(2).replace('.',',')} = R$ ${(item.quantidade * item.precoUnitario).toFixed(2).replace('.',',')}`
    ).join('\n');

    const statusTexto = pedido.status === 'pago' 
      ? '✅ *QUITADO*' 
      : pedido.status === 'parcial' 
        ? '💰 *PAGAMENTO PARCIAL*' 
        : '⏳ *PENDENTE*';

    const texto =
  `${pedido.status === 'pago' ? '✅' : pedido.status === 'parcial' ? '💰' : '⏳'} *Mercado Nascimento*
  *PEDIDO #${pedido.numero}*
${statusTexto}
📅 ${data}
👤 Cliente: ${pedido.clienteNome}

━━━━━━━━━━━━━━━━
📦 *ITENS:*
${itensTexto}
━━━━━━━━━━━━━━━━

💰 Valor Total: R$ ${parseFloat(pedido.total).toFixed(2).replace('.',',')}
${totalPago > 0 ? `💵 Já Pago: R$ ${totalPago.toFixed(2).replace('.',',')}\n` : ''}
${falta > 0 ? `🔴 *FALTA: R$ ${falta.toFixed(2).replace('.',',')}*\n` : ''}
Obrigado! 🙏`
  ;

    const telefone = pedido.clienteTelefone ? pedido.clienteTelefone.replace(/\D/g, '') : '';
    enviarMensagemWhatsApp(texto, telefone);
  };


  // ✅ Relatório completo do cliente
  const gerarRelatorioCompleto = () => {
    if (!clienteFiltro) return showToast('Selecione um cliente primeiro!', 'warning');
    if (pedidos.length === 0) return showToast('Nenhum pedido encontrado', 'warning');

    const data = new Date().toLocaleString('pt-BR');
    const clienteNome = clientes.find(c => c._id === clienteFiltro)?.nome || 'Cliente';

    const totaisRel = {
      bruto: pedidos.reduce((s, p) => s + (parseFloat(p.total) || 0), 0),
      pago: pedidos.reduce((s, p) => s + (Array.isArray(p.pagamentos) ? p.pagamentos.reduce((a, pg) => a + (parseFloat(pg.valorRecebido) || 0), 0) : 0), 0),
      aberto: pedidos.reduce((s, p) => {
        const st = String(p.status || '').toLowerCase();
        if (st === 'pago' || st === 'cancelado') return s;
        const tp = Array.isArray(p.pagamentos) ? p.pagamentos.reduce((a, pg) => a + (parseFloat(pg.valorRecebido) || 0), 0) : 0;
        return s + Math.max(0, parseFloat(p.total) - tp);
      }, 0)
    };

    const pedidosHtml = pedidos.map(p => {
      const totalPago = Array.isArray(p.pagamentos)
        ? p.pagamentos.reduce((ac, pg) => ac + (parseFloat(pg.valorRecebido) || 0), 0)
        : 0;
      const falta = Math.max(0, parseFloat(p.total) - totalPago);
      
      return `
        <div style="border-bottom: 1px dashed #000; padding: 6px 0;">
          <div style="display:flex; justify-content:space-between; font-weight:bold;">
            <span>#${p.numero} - ${p.clienteNome}</span>
            <span>R$ ${parseFloat(p.total).toFixed(2).replace('.',',')}</span>
          </div>
          <div style="font-size:10px;">
            Status: ${statusCor[p.status]?.label || p.status} | 
            ${falta > 0 ? `Falta: R$ ${falta.toFixed(2).replace('.',',')}` : 'Quitado'}
          </div>
        </div>
      `;
    }).join('');

    const relatorio = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório Completo - ${clienteNome}</title>
        <style>
          * { font-family: 'Courier New', monospace; font-size: 12px; }
          body { width: 76mm; margin: 0; padding: 4mm; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .linha { border-top: 2px dashed #000; margin: 8px 0; }
          .total { font-size: 14px; font-weight: bold; border-top: 2px solid #000; padding-top: 8px; margin-top: 8px; }
          @media print { @page { margin: 0; size: 80mm auto; } }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size:14px;">RELATÓRIO COMPLETO DO CLIENTE</div>
        <div class="linha"></div>
        <div><span class="bold">Data:</span> ${data}</div>
        <div><span class="bold">Cliente:</span> ${clienteNome}</div>
        <div><span class="bold">Qtde Pedidos:</span> ${pedidos.length}</div>
        <div class="linha"></div>
        ${pedidosHtml}
        <div class="linha"></div>
        <div class="total" style="display:flex; justify-content:space-between;">
          <span>Total Bruto:</span>
          <span>R$ ${totaisRel.bruto.toFixed(2).replace('.',',')}</span>
        </div>
        <div style="display:flex; justify-content:space-between; color:#16a34a;">
          <span>Total Pago:</span>
          <span>R$ ${totaisRel.pago.toFixed(2).replace('.',',')}</span>
        </div>
        <div class="total" style="display:flex; justify-content:space-between; color:#c2410c;">
          <span>TOTAL A RECEBER:</span>
          <span>R$ ${totaisRel.aberto.toFixed(2).replace('.',',')}</span>
        </div>
        <script>window.onload=()=>{print();close()}</script>
      </body>
      </html>
    `;
    const janela = window.open('', '_blank', 'width=350,height=600');
    janela.document.write(relatorio);
    janela.document.close();
  };


  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px', color: '#0f172a' }}>📊 Contas a Receber</h1>
      <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 20px' }}>Acerto de pendências por cliente</p>

      {/* FILTROS */}
      <div style={{
        background: '#fff', border: '1px solid rgba(15,23,42,.08)', borderRadius: 16,
        padding: 16, marginBottom: 16, display: 'grid', gap: 12,
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))'
      }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Cliente</label>
          <select value={clienteFiltro} onChange={e => setClienteFiltro(e.target.value)} style={{
            width: '100%', padding: '10px', border: '1px solid rgba(15,23,42,.1)', borderRadius: 10
          }}>
            <option value="">Todos os clientes</option>
            {clientes.map(c => <option key={c._id} value={c._id}>{c.nome}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Status</label>
          <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)} style={{
            width: '100%', padding: '10px', border: '1px solid rgba(15,23,42,.1)', borderRadius: 10
          }}>
            <option value="">Todos</option>
            <option value="pendente">Pendentes</option>
            <option value="parcial">Pagamento Parcial</option>
            <option value="pago">Quitados</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Data Início</label>
          <input type="date" value={inicio} onChange={e => setInicio(e.target.value)} style={{
            width: '100%', padding: '10px', border: '1px solid rgba(15,23,42,.1)', borderRadius: 10
          }} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Data Fim</label>
          <input type="date" value={fim} onChange={e => setFim(e.target.value)} style={{
            width: '100%', padding: '10px', border: '1px solid rgba(15,23,42,.1)', borderRadius: 10
          }} />
        </div>
      </div>

      {/* CARD DE TOTAL + BOTÕES */}
      <div style={{
        background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
        color: '#fff', borderRadius: 16, padding: 16, marginBottom: 16
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>Total a Receber</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>
              {carregando ? '⏳ Carregando...' : `R$ ${Number(totais?.totalEmAberto ?? 0).toFixed(2).replace('.', ',')}`}
            </div>
            <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>
              {carregando ? 'Aguardando dados...' : `Bruto: R$ ${Number(totais?.totalBruto ?? 0).toFixed(2).replace('.', ',')} | Pago: R$ ${Number(totais?.totalPagoGeral ?? 0).toFixed(2).replace('.', ',')}`}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* ✅ Selecionar Todos */}
            {pedidos.length > 0 && (
              <button 
                onClick={toggleSelecionarTodos}
                style={{
                  padding: '6px 12px', 
                  background: selecionados.size === pedidos.length && pedidos.length > 0 ? 'rgba(255,255,255,.4)' : 'rgba(255,255,255,.2)', 
                  color: '#fff', border: '1px solid rgba(255,255,255,.3)', borderRadius: 8,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer'
                }}
              >
                {selecionados.size === pedidos.length && pedidos.length > 0 ? '✓ Desmarcar Todos' : '☑ Selecionar Todos'}
              </button>
            )}
            <div style={{ display: 'flex', gap: 6 }}>
              {/* ✅ Botão Alterado: Agora é RECEBER MARCADOS */}
              <button onClick={abrirReceberMarcados} style={{
                padding: '6px 12px', background: '#fff', color: '#c2410c',
                border: 'none', borderRadius: 8,
                fontSize: 12, fontWeight: 700, cursor: 'pointer'
              }}>💰 Receber Marcados ({selecionados.size})</button>
              
              {/* ✅ Arquivo Completo - SÓ aparece quando cliente selecionado */}
              {clienteFiltro && (
                <button onClick={gerarRelatorioCompleto} style={{
                  padding: '6px 12px', background: 'rgba(22,163,74,.9)', color: '#fff',
                  border: 'none', borderRadius: 8,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer'
                }}>📄 Arquivo Completo</button>
              )}
            </div>
            {/* ✅ Mostra valor dos marcados */}
            {selecionados.size > 0 && (
              <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>
                Valor selecionado: <strong>R$ {valorTotalSelecionados.toFixed(2).replace('.',',')}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* LISTA DE PEDIDOS */}
      {pedidos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', background: '#fff', borderRadius: 12 }}>
          {carregando ? 'Carregando pedidos...' : 'Nenhum pedido encontrado'}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {pedidos.map(pedido => {
            const st = statusCor[pedido.status];
            const totalPago = Array.isArray(pedido.pagamentos)
              ? pedido.pagamentos.reduce((ac, pg) => ac + (parseFloat(pg.valorRecebido) || 0), 0)
              : 0;
            const falta = Math.max(0, parseFloat(pedido.total) - totalPago);
            const estaSelecionado = selecionados.has(pedido._id);

            return (
              <div key={pedido._id} style={{
                background: estaSelecionado ? '#f0fdf4' : '#fff', 
                border: estaSelecionado ? '2px solid #16a34a' : '1px solid rgba(15,23,42,.08)', 
                borderRadius: 14, padding: 16,
                transition: 'all 0.15s'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: '1 1 220px' }}>
                    <input 
                      type="checkbox" 
                      checked={estaSelecionado}
                      onChange={() => toggleSelecionar(pedido._id)}
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, overflowWrap: 'anywhere' }}>#{pedido.numero} — {pedido.clienteNome}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {new Date(pedido.createdAt).toLocaleString('pt-BR')} • Atendente: {pedido.atendente}
                      </div>
                    </div>
                  </div>
                  <span style={{
                    background: st?.bg || '#f1f5f9', 
                    color: st?.txt || '#475569', 
                    padding: '4px 10px',
                    borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap'
                  }}>{st?.label || pedido.status}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Valor Total</div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>R$ {parseFloat(pedido.total).toFixed(2).replace('.',',')}</div>
                  </div>
                  {pedido.status !== 'pendente' && (
                    <>
                      <div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>Pago</div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#16a34a' }}>R$ {totalPago.toFixed(2).replace('.',',')}</div>
                      </div>
                      {falta > 0 && (
                        <div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>A Receber</div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: '#dc2626' }}>R$ {falta.toFixed(2).replace('.',',')}</div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {pedido.pagamentos?.length > 0 && (
                  <div style={{ background: '#f8fafc', borderRadius: 8, padding: 10, marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Pagamentos:</div>
                    {pedido.pagamentos.map((pg, i) => (
                      <div key={i} style={{ fontSize: 12, padding: '4px 0', borderTop: '1px solid #eee' }}>
                        {pg.dataPagamento ? new Date(pg.dataPagamento).toLocaleDateString('pt-BR') : '-'}
                        {' • '}{formaPagamentoLabel[pg.tipo] || pg.tipo}
                        {' • '}<strong>R$ {parseFloat(pg.valorRecebido).toFixed(2).replace('.',',')}</strong>
                        {pg.quitado && ' ✅'}
                      </div>
                    ))}
                  </div>
                )}

                {/* ✅ Botões individuais: Imprimir • WhatsApp • Receber • Quitar */}
                <div className="order-actions" style={{
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 10
                }}>
                  <button 
                    onClick={() => pedido.status === 'pago' ? imprimirComprovante(pedido) : imprimirPedido(pedido)} 
                    style={{
                      padding: '10px 8px', 
                      background: '#0f172a', 
                      color: '#fff',
                      border: 'none', borderRadius: 8, 
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      whiteSpace: 'nowrap', width: '100%', boxSizing: 'border-box'
                    }}
                  >
                    🖨️ {pedido.status === 'pago' ? 'Comprovante' : 'Imprimir'}
                  </button>
                  
                  <button 
                    onClick={() => enviarWhatsApp(pedido)} 
                    style={{
                      padding: '10px 8px', 
                      background: '#16a34a', 
                      color: '#fff',
                      border: 'none', borderRadius: 8, 
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      whiteSpace: 'nowrap', width: '100%', boxSizing: 'border-box', flexWrap: 'nowrap' 
                    }}
                  >
                    💬 WhatsApp
                  </button>

                  {pedido.status !== 'pago' && pedido.status !== 'cancelado' && (
                    <>
                      <button 
                        onClick={() => abrirModalReceber(pedido)}
                        style={{
                          padding: '10px 8px', 
                          background: '#16a34a', 
                          color: '#fff',
                          border: 'none', borderRadius: 8, 
                          fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          whiteSpace: 'nowrap', width: '100%', boxSizing: 'border-box', flexWrap: 'nowrap' 
                        }}
                      >
                        💰 Receber
                      </button>
                      
                      <button 
                        onClick={() => quitarTotal(pedido)} 
                        style={{
                          padding: '10px 8px', 
                          background: '#0f172a', 
                          color: '#fff',
                          border: 'none', borderRadius: 8, 
                          fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          whiteSpace: 'nowrap', width: '100%', boxSizing: 'border-box'
                        }}
                      >
                        ✅ Quitar Total
                      </button>
                    </>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ✅ MODAL DE RECEBIMENTO MÚLTIPLO (para marcados) */}
      {pagamentoMultiploModal && (
        <div onClick={() => setPagamentoMultiploModal(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: 20
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 380
          }}>
            <h3 style={{ margin: '0 0 16px' }}>💰 Receber Pedidos Selecionados</h3>
            <p style={{ fontSize: 14, margin: '0 0 16px' }}>
              <strong>{selecionados.size}</strong> pedido(s) selecionado(s)<br/>
              Valor total a receber: <strong style={{ color: '#c2410c', fontSize: 16 }}>R$ {valorTotalSelecionados.toFixed(2).replace('.',',')}</strong>
            </p>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Forma de Pagamento</label>
              <select value={formPagamentoMultiplo.tipo} onChange={e => setFormPagamentoMultiplo({...formPagamentoMultiplo, tipo: e.target.value})} style={{
                width: '100%', padding: 10, border: '1px solid rgba(15,23,42,.1)', borderRadius: 10
              }}>
                <option value="dinheiro">💵 Dinheiro</option>
                <option value="pix">🔄 PIX</option>
                <option value="credito_loja">🏪 Fiado / Crédito Loja</option>
                <option value="cartao_credito">💳 Cartão de Crédito</option>
                <option value="cartao_debito">💳 Cartão de Débito</option>
                <option value="cheque">📄 Cheque</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Observação</label>
              <input type="text" placeholder="Ex: Pagamento em lote"
                value={formPagamentoMultiplo.observacao}
                onChange={e => setFormPagamentoMultiplo({...formPagamentoMultiplo, observacao: e.target.value})}
                style={{ width: '100%', padding: 10, border: '1px solid rgba(15,23,42,.1)', borderRadius: 10 }} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setPagamentoMultiploModal(null)} style={{
                flex: 1, padding: 12, background: '#f1f5f9', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer'
              }}>Cancelar</button>
              <button onClick={registrarPagamentoMultiplo} style={{
                flex: 1, padding: 12, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer'
              }}>✅ Receber Tudo</button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ MODAL DE RECEBIMENTO INDIVIDUAL */}
      {pagamentoModal && (
        <div onClick={() => setPagamentoModal(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: 20
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 360
          }}>
            <h3 style={{ margin: '0 0 16px' }}>Receber Pagamento</h3>
            <p style={{ fontSize: 14, margin: '0 0 16px' }}>
              Pedido #{pagamentoModal.numero} — <strong>{pagamentoModal.clienteNome}</strong>
            </p>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Forma de Pagamento</label>
              <select value={formPagamento.tipo} onChange={e => setFormPagamento({...formPagamento, tipo: e.target.value})} style={{
                width: '100%', padding: 10, border: '1px solid rgba(15,23,42,.1)', borderRadius: 10
              }}>
                <option value="dinheiro">💵 Dinheiro</option>
                <option value="pix">🔄 PIX</option>
                <option value="credito_loja">🏪 Fiado / Crédito Loja</option>
                <option value="cartao_credito">💳 Cartão de Crédito</option>
                <option value="cartao_debito">💳 Cartão de Débito</option>
                <option value="cheque">📄 Cheque</option>
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Valor Recebido (R$)</label>
              <input type="number" step="0.01" min="0" autoFocus
                value={formPagamento.valorRecebido}
                onChange={e => setFormPagamento({...formPagamento, valorRecebido: e.target.value})}
                style={{ width: '100%', padding: 10, border: '1px solid rgba(15,23,42,.1)', borderRadius: 10, fontSize: 16 }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Observação</label>
              <input type="text" placeholder="Ex: Pagamento parcial"
                value={formPagamento.observacao}
                onChange={e => setFormPagamento({...formPagamento, observacao: e.target.value})}
                style={{ width: '100%', padding: 10, border: '1px solid rgba(15,23,42,.1)', borderRadius: 10 }} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setPagamentoModal(null)} style={{
                flex: 1, padding: 12, background: '#f1f5f9', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer'
              }}>Cancelar</button>
              <button onClick={registrarPagamento} style={{
                flex: 1, padding: 12, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer'
              }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .order-actions {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 480px) {
          .order-actions {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}