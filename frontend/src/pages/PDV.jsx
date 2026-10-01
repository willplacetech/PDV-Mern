import { useState, useEffect, useRef } from 'react';
import api from '../services/api.jsx';
import { useToast } from '../components/Toast.jsx';
import { enfileirarVenda, sincronizarVendas } from '../services/offlineSales.js';
import { enviarMensagemWhatsApp } from '../services/whatsapp.js';


const corCategoria = {
  Frios: { bg: 'rgba(14,165,233,.12)', txt: '#0284c7', border: 'rgba(14,165,233,.25)' },
  Açougue: { bg: 'rgba(220,38,38,.12)', txt: '#dc2626', border: 'rgba(220,38,38,.25)' },
  Mercearia: { bg: 'rgba(124,58,237,.12)', txt: '#7c3aed', border: 'rgba(124,58,237,.25)' },
  Alimentos: { bg: 'rgba(234,88,12,.12)', txt: '#ea580c', border: 'rgba(234,88,12,.25)' },
  Bebidas: { bg: 'rgba(37,99,171,.12)', txt: '#2563ab', border: 'rgba(37,99,171,.25)' },
  Limpeza: { bg: 'rgba(13,148,136,.12)', txt: '#0d9488', border: 'rgba(13,148,136,.25)' },
  Higiene: { bg: 'rgba(189,49,147,.12)', txt: '#bd3193', border: 'rgba(189,49,147,.25)' },
  Hortifruti: { bg: 'rgba(22,163,74,.12)', txt: '#16a34a', border: 'rgba(22,163,74,.25)' },
  Padaria: { bg: 'rgba(180,83,9,.12)', txt: '#b45309', border: 'rgba(180,83,9,.25)' },
  Outros: { bg: 'rgba(100,116,139,.12)', txt: '#64748b', border: 'rgba(100,116,139,.25)' }
};

const converterPesoKg = valor => {
  const texto = String(valor || '').trim().toLowerCase().replace(',', '.');
  if (texto.endsWith('g')) return Number.parseFloat(texto) / 1000;
  return Number.parseFloat(texto);
};
const formatarMoeda = valor => Number(valor || 0).toFixed(2).replace('.', ',');
const formatarPeso = valor => Number(valor || 0).toFixed(3).replace('.', ',');


export default function PDV() {
  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [busca, setBusca] = useState('');
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [desconto, setDesconto] = useState(0);
  const [modalSucesso, setModalSucesso] = useState(null);
  const { showToast } = useToast();
  const selectClienteRef = useRef(null); // ✅ Referência para focar na caixa


  // O carregamento inicial depende do ciclo de montagem do PDV.
  // eslint-disable-next-line react-hooks/immutability, react-hooks/exhaustive-deps
  useEffect(() => { carregarDados(); }, []);

  useEffect(() => {
    const sincronizar = async () => {
      const quantidade = await sincronizarVendas();
      if (quantidade) showToast(`${quantidade} venda(s) sincronizada(s)!`, 'success');
    };
    window.addEventListener('online', sincronizar);
    sincronizar();
    return () => window.removeEventListener('online', sincronizar);
  }, [showToast]);


  const carregarDados = async () => {
    try {
      const [resProd, resCli] = await Promise.all([
        api.get('/products'), api.get('/customers')
      ]);
      setProdutos(resProd.data);
      setClientes(resCli.data);
    } catch {
      showToast('Erro ao carregar dados', 'error');
    }
  };


  const adicionarItem = (prod) => {
    const existe = carrinho.find(i => i.produtoId === prod._id);
    if (existe) {
      if (prod.tipo === 'peso') {
        setCarrinho(carrinho.map(i => i.produtoId === prod._id ? { ...i, pesoKg: i.pesoKg + 0.1 } : i));
      } else {
        setCarrinho(carrinho.map(i => i.produtoId === prod._id ? { ...i, quantidade: i.quantidade + 1, quantidadeInput: undefined } : i));
      }
    } else {
      setCarrinho([...carrinho, {
        produtoId: prod._id, codigo: prod.codigo, nome: prod.nome,
        tipo: prod.tipo || 'unidade',
        precoUnitario: prod.tipo === 'peso' ? prod.precoVendaPorKg : prod.preco,
        ...(prod.tipo === 'peso' ? { pesoKg: 0.1, pesoInput: '0,100' } : { quantidade: 1 })
      }]);
    }
  };


  const alterarQtd = (idx, qtd) => {
    if (qtd < 1) return removerItem(idx);
    if (!Number.isSafeInteger(qtd)) return;
    setCarrinho(carrinho.map((item, i) => i === idx
      ? { ...item, quantidade: qtd, quantidadeInput: undefined }
      : item));
  };

  const digitarQtd = (idx, valor) => {
    if (!/^\d*$/.test(valor)) return;
    const qtd = Number(valor);
    setCarrinho(carrinho.map((item, i) => i === idx
      ? {
        ...item,
        quantidadeInput: valor,
        quantidade: Number.isSafeInteger(qtd) && qtd >= 1 ? qtd : item.quantidade
      }
      : item));
  };

  const alterarPeso = (idx, valor) => {
    const pesoKg = converterPesoKg(valor);
    if (!Number.isFinite(pesoKg) || pesoKg <= 0) {
      setCarrinho(carrinho.map((item, itemIdx) => itemIdx === idx ? { ...item, pesoInput: valor } : item));
      return;
    }
    setCarrinho(carrinho.map((item, itemIdx) => itemIdx === idx ? { ...item, pesoKg, pesoInput: valor } : item));
  };


  const setPreco = (idx, valor) => {
    const novos = [...carrinho];
    novos[idx].precoUnitario = Math.max(0, parseFloat(valor) || 0);
    setCarrinho(novos);
  };


  const removerItem = (idx) => setCarrinho(carrinho.filter((_, i) => i !== idx));


  const subtotal = carrinho.reduce((ac, i) => ac + i.precoUnitario * (i.tipo === 'peso' ? i.pesoKg : i.quantidade), 0);
  const total = Math.max(0, subtotal - (parseFloat(desconto) || 0));
  const totalItens = carrinho.reduce((ac, i) => ac + (i.tipo === 'peso' ? 1 : i.quantidade), 0);
  const clienteSelecionado = clientes.find(c => c._id === clienteId);


  // ==========================================
  // ✅ FINALIZAR VENDA — COM VALIDAÇÃO DE CLIENTE
  // ==========================================
  const finalizar = async () => {
    if (!carrinho.length) return showToast('Carrinho vazio!', 'warning');

    const descontoNumerico = Number(desconto) || 0;
    if (descontoNumerico < 0 || descontoNumerico > subtotal) {
      return showToast('O desconto não pode ser maior que o subtotal.', 'warning');
    }

    const dadosVenda = {
        itens: carrinho, subtotal, desconto: descontoNumerico, total,
        clienteId, clienteNome: clienteSelecionado?.nome || 'Cliente não identificado',
        clienteTelefone: clienteSelecionado?.telefone || ''
    };

    try {
      const res = await api.post('/orders', dadosVenda);
      
      showToast('✅ Venda finalizada com sucesso!', 'success');
      
      setModalSucesso({
        ...res.data,
        clienteNome: clienteSelecionado?.nome || 'Cliente não identificado',
        clienteTelefone: clienteSelecionado?.telefone || '',
        tipo: 'finalizado'
      });
      
      setCarrinho([]); setDesconto(0); setClienteId('');
      carregarDados();
    } catch (err) {
      if (!navigator.onLine) {
        enfileirarVenda(dadosVenda);
        showToast('Sem internet — venda salva, sincronizando...', 'warning');
        setCarrinho([]); setDesconto(0); setClienteId('');
        return;
      }
      showToast(err.response?.data?.msg || 'Erro ao finalizar', 'error');
    }
  };


  // ==========================================
  // 🖨️ IMPRIMIR CUPOM
  // ==========================================
  const imprimirCupom = (pedido) => {
    if (!pedido) return;
    
    const data = new Date(pedido.createdAt).toLocaleString('pt-BR');
    const itensHtml = pedido.itens.map(item => `
      <div style="display:flex; justify-content:space-between; border-bottom: 1px dashed #000; padding: 4px 0;">
        <div style="flex:1; margin-right:8px;">
          <div style="font-weight:bold;">${item.nome}</div>
          <div style="font-size:10px;">${item.tipo === 'peso' ? `${formatarPeso(item.pesoKg)} kg × R$ ${formatarMoeda(item.precoUnitario)}/kg` : `Cod: ${item.codigo} | Qtd: ${item.quantidade} x R$ ${formatarMoeda(item.precoUnitario)}`}</div>
        </div>
        <div style="font-weight:bold; white-space:nowrap;">R$ ${formatarMoeda((item.tipo === 'peso' ? item.pesoKg : item.quantidade) * item.precoUnitario)}</div>
      </div>
    `).join('');
    const cupom = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cupom #${pedido.numero}</title>
        <style>
          * { font-family: 'Courier New', monospace; font-size: 12px; }
          body { width: 76mm; margin: 0; padding: 4mm; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .total { font-size: 14px; font-weight: bold; border-top: 2px solid #000; padding-top: 8px; margin-top: 8px; }
          .linha-dupla { border-top: 2px dashed #000; margin: 8px 0; }
          @media print {
            @page { margin: 0; size: 80mm auto; }
            body { margin: 4mm; }
          }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size:14px;">Mercado Nascimento</div>
        <div class="center" style="font-size:10px;">Cupom Não Fiscal</div>
        <div class="linha-dupla"></div>
        
        <div><span class="bold">Pedido:</span> #${pedido.numero}</div>
        <div><span class="bold">Data:</span> ${data}</div>
        <div><span class="bold">Atendente:</span> ${pedido.atendente}</div>
        <div><span class="bold">Cliente:</span> ${pedido.clienteNome}</div>
        
        <div class="linha-dupla"></div>
        <div class="bold" style="text-align:center;">=== ITENS DO PEDIDO ===</div>
        
        ${itensHtml}
        
        <div class="linha-dupla"></div>
        <div style="display:flex; justify-content:space-between;">
          <span>Subtotal:</span>
          <span>R$ ${pedido.subtotal.toFixed(2).replace('.',',')}</span>
        </div>
        ${pedido.desconto > 0 ? `
        <div style="display:flex; justify-content:space-between; color:#16a34a;">
          <span>Desconto:</span>
          <span>-R$ ${pedido.desconto.toFixed(2).replace('.',',')}</span>
        </div>
        ` : ''}
        <div class="total" style="display:flex; justify-content:space-between;">
          <span>TOTAL:</span>
          <span>R$ ${pedido.total.toFixed(2).replace('.',',')}</span>
        </div>
        
        <div class="linha-dupla"></div>
        <div class="center" style="font-size:10px;">
          Obrigado pela preferência!<br>
          Volte sempre!
        </div>
        
        <script>window.onload = function() { window.print(); setTimeout(() => window.close(), 500); }</script>
      </body>
      </html>
    `;
    const janela = window.open('', '_blank', 'width=350,height=600');
    janela.document.write(cupom);
    janela.document.close();
  };


  // ==========================================
  // 💬 ENVIAR VIA WHATSAPP
  // ==========================================
  const enviarWhatsApp = (pedido) => {
    if (!pedido) return;
    
    const data = new Date(pedido.createdAt).toLocaleString('pt-BR');
    
    const itensTexto = pedido.itens.map(item => 
      `• ${item.nome}\n  ${item.tipo === 'peso' ? `${formatarPeso(item.pesoKg)} kg x R$ ${formatarMoeda(item.precoUnitario)}/kg` : `${item.quantidade} x R$ ${formatarMoeda(item.precoUnitario)}`} = R$ ${formatarMoeda((item.tipo === 'peso' ? item.pesoKg : item.quantidade) * item.precoUnitario)}`
    ).join('\n');
    const texto =
  `🛒 *Mercado Nascimento*
  *PEDIDO* #${pedido.numero}
📅 ${data}
👤 Cliente: ${pedido.clienteNome}
💼 Atendente: ${pedido.atendente}
━━━━━━━━━━━━━━━━
📦 *ITENS:*
${itensTexto}
━━━━━━━━━━━━━━━━
💰 Subtotal: R$ ${pedido.subtotal.toFixed(2).replace('.',',')}
${pedido.desconto > 0 ? `🎁 Desconto: -R$ ${pedido.desconto.toFixed(2).replace('.',',')}\n` : ''}
💵 *TOTAL: R$ ${pedido.total.toFixed(2).replace('.',',')}*
Obrigado pela preferência! 🙏`
    ;
    const telefone = pedido.clienteTelefone ? pedido.clienteTelefone.replace(/\D/g, '') : '';
    enviarMensagemWhatsApp(texto, telefone);
  };


  // ==========================================
  // NOVA VENDA
  // ==========================================
  const novaVenda = () => {
    setModalSucesso(null);
  };


  const filtrados = produtos.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    String(p.codigo).toLowerCase().includes(busca.toLowerCase()) ||
    p.categoria.toLowerCase().includes(busca.toLowerCase())
  );


  return (
    <div>
      {/* Cabeçalho PDV */}
      <div className="pdv-header-desktop" style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>🛒 Ponto de Venda</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>Selecione os produtos para iniciar a venda</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }} className="pdv-grid">
        {/* COLUNA PRODUTOS */}
        <div>
          <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
            borderRadius: 16, padding: 16, marginBottom: 16
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }} className="busca-grid">
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Buscar produto</label>
                <input
                  placeholder="Código, nome ou categoria..." value={busca}
                  onChange={e => setBusca(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 14px', border: '1.5px solid var(--border-color)',
                    borderRadius: 10, fontSize: 16, boxSizing: 'border-box',
                    outline: 'none', background: 'var(--input-bg)', color: 'var(--input-text)', minHeight: 48
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Cliente</label>
                <select
                  ref={selectClienteRef} // ✅ Liga a referência
                  value={clienteId}
                  onChange={e => setClienteId(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 14px', border: '1.5px solid var(--border-color)',
                    borderRadius: 10, fontSize: 16, boxSizing: 'border-box',
                    outline: 'none', background: 'var(--input-bg)', color: 'var(--input-text)', minHeight: 48
                  }}>
                  <option value="">Cliente não identificado</option>
                  {clientes.map(c => <option key={c._id} value={c._id}>{c.nome}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
            borderRadius: 16, padding: 16
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Produtos</h3>
              <span style={{
                background: 'var(--accent-light)', color: 'var(--accent-primary)',
                padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600
              }}>{filtrados.length}</span>
            </div>
            {filtrados.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px 20px', fontSize: 14 }}>Nenhum produto encontrado</p>
            ) : (
              <div style={{
                display: 'grid', gap: 10,
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                maxHeight: 420, overflowY: 'auto', padding: 2
              }}>
                {filtrados.map(p => {
                  const cat = corCategoria[p.categoria] || corCategoria.Outros;
                  return (
                    <div key={p._id} onClick={() => adicionarItem(p)} style={{
                      background: 'var(--bg-secondary)', border: `1.5px solid ${cat.border}`,
                      borderRadius: 14, padding: 12, cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                      minHeight: 120, transition: 'all .15s',
                      position: 'relative', overflow: 'hidden'
                    }} className="product-card">
                      <div>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: 12,
                          fontSize: 10, fontWeight: 700, marginBottom: 6,
                          background: cat.bg, color: cat.txt
                        }}>{p.categoria}</span>
                        <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.25, color: 'var(--text-primary)' }}>{p.nome}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 3, fontFamily: 'monospace' }}>Cod: {p.codigo}</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 6 }}>
                        <div style={{
                          fontWeight: 700, fontSize: 16, color: 'var(--accent-primary)',
                          fontVariantNumeric: 'tabular-nums'
                        }}>R$ {formatarMoeda(p.tipo === 'peso' ? p.precoVendaPorKg : p.preco)}{p.tipo === 'peso' ? '/kg' : ''}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        {/* COLUNA CARRINHO */}
        <div>
          <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
            borderRadius: 16, padding: 16, position: 'sticky', top: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                📝 Carrinho
                {totalItens > 0 && (
                  <span style={{
                    background: 'var(--accent-primary)', color: '#fff',
                    padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700
                  }}>{totalItens}</span>
                )}
              </h3>
            </div>
            {carrinho.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-secondary)', fontSize: 14 }}
>                <div style={{ fontSize: 40, marginBottom: 8 }}>🛒</div>
                Carrinho vazio<br />
                <span style={{ fontSize: 12 }}>Toque nos produtos ao lado</span>
              </div>
            ) : (
              <>
                <div style={{ maxHeight: 320, overflowY: 'auto', marginBottom: 14, paddingRight: 4 }}>
                  {carrinho.map((item, i) => {
                    return (
                      <div key={i} style={{
                        padding: '10px 0', borderBottom: '1px solid var(--border-light)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div style={{ flex: 1, paddingRight: 8 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3, color: 'var(--text-primary)' }}>{item.nome}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                              Cod: {item.codigo}
                            </div>
                          </div>
                          <button onClick={() => removerItem(i)} style={{
                            background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error-bg)',
                            border: 'none', borderRadius: 8, padding: '6px 10px',
                            cursor: 'pointer', fontWeight: 700, fontSize: 12, minHeight: 32
                          }}>✕</button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {item.tipo === 'peso' ? (
                            <div style={{ flex: 1 }}>
                              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Peso (kg ou g)</label>
                              <input type="text" inputMode="decimal" value={item.pesoInput ?? formatarPeso(item.pesoKg)}
                                onChange={e => alterarPeso(i, e.target.value)}
                                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 14, fontWeight: 700, background: 'var(--input-bg)', color: 'var(--input-text)', minHeight: 38 }} />
                              <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
                                {[0.1, 0.2, 0.5].map(peso => <button key={peso} type="button" onClick={() => alterarPeso(i, formatarPeso(peso))} style={{ padding: '4px 7px', fontSize: 10, borderRadius: 6 }}>{peso * 1000}g</button>)}
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: 10, overflow: 'hidden' }}>
                              <button onClick={() => alterarQtd(i, item.quantidade - 1)} style={{ width: 40, height: 40, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, fontWeight: 700, color: 'var(--text-secondary)' }}>−</button>
                              <input type="text" inputMode="numeric" aria-label={`Quantidade de ${item.nome}`} value={item.quantidadeInput ?? item.quantidade} onChange={e => digitarQtd(i, e.target.value)} onFocus={e => e.target.select()} onBlur={() => alterarQtd(i, item.quantidade)} style={{ width: 64, textAlign: 'center', border: 'none', borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', padding: '8px 4px', fontSize: 15, fontWeight: 700, background: 'var(--input-bg)', color: 'var(--input-text)' }} />
                              <button onClick={() => alterarQtd(i, item.quantidade + 1)} style={{ width: 40, height: 40, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, fontWeight: 700, color: 'var(--text-secondary)' }}>+</button>
                            </div>
                          )}
                          <div style={{ flex: 1, textAlign: 'right' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{item.tipo === 'peso' ? 'R$/kg' : 'Unitário'}</div>
                            <input type="number" step="0.01" min={0} value={item.precoUnitario.toFixed(2)}
                              onChange={e => setPreco(i, e.target.value)}
                              readOnly={item.tipo === 'peso'}
                              style={{
                                width: 90, textAlign: 'right', padding: '8px 10px',
                                border: '1px solid var(--border-color)', borderRadius: 8,
                                fontSize: 14, fontWeight: 700, color: 'var(--accent-primary)',
                                background: 'var(--input-bg)', minHeight: 38
                              }} />
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', marginTop: 8, fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                          Subtotal: R$ {(item.precoUnitario * (item.tipo === 'peso' ? item.pesoKg : item.quantidade)).toFixed(2).replace('.', ',')}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
                    <span>Subtotal</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8 }}>
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Desconto R$</span>
                    <input type="number" step="0.01" min={0} value={desconto}
                      onChange={e => setDesconto(e.target.value)}
                      style={{
                        width: 100, textAlign: 'right', padding: '8px 10px',
                        border: '1px solid var(--border-color)', borderRadius: 8,
                        fontSize: 14, background: 'var(--input-bg)', color: 'var(--input-text)', minHeight: 38
                      }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontWeight: 700, fontSize: 24, color: 'var(--accent-primary)' }}>
                    <span>Total</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>R$ {total.toFixed(2).replace('.', ',')}</span>
                  </div>
                  
                  {/* ✅ APENAS O BOTÃO FINALIZAR PEDIDO */}
                  <button onClick={finalizar} style={{
                    width: '100%', padding: '14px', background: 'var(--accent-primary)', color: '#fff',
                    border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700,
                    cursor: 'pointer', minHeight: 52
                  }}>✅ Finalizar Pedido</button>
                  
                </div>
              </>
            )}
          </div>
        </div>
      </div>


      {/* ==========================================
          ✅ MODAL DE SUCESSO
          ========================================== */}
      {modalSucesso && (
        <div onClick={() => setModalSucesso(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 99999, padding: 20
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg-secondary)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 400,
            textAlign: 'center', boxShadow: 'var(--shadow-lg)',
            color: 'var(--text-primary)'
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', margin: '0 auto 16px',
              background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36
            }}>✅</div>
            <h3 style={{ margin: '0 0 4px', fontSize: 20, color: 'var(--text-primary)' }}>Venda Finalizada!</h3>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-secondary)' }}>
              Pedido <strong style={{ color: 'var(--text-primary)' }}>#{modalSucesso.numero}</strong>
              <br />
              Total: <strong style={{ color: 'var(--accent-primary)', fontSize: 16 }}>
                R$ {modalSucesso.total.toFixed(2).replace('.', ',')}
              </strong>
            </p>
            <div style={{ borderTop: '1px solid rgba(15,23,42,.08)', marginBottom: 20 }}></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => imprimirCupom(modalSucesso)} style={{
                width: '100%', padding: '14px', background: '#0f172a', color: '#fff',
                border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700,
                cursor: 'pointer', minHeight: 52, display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: 10
              }}>🖨️ Imprimir Cupom</button>
              <button onClick={() => enviarWhatsApp(modalSucesso)} style={{
                width: '100%', padding: '14px', background: '#16a34a', color: '#fff',
                border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700,
                cursor: 'pointer', minHeight: 52, display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: 10
              }}>💬 Enviar pelo WhatsApp</button>
              <button onClick={novaVenda} style={{
                width: '100%', padding: '13px', background: 'rgba(234,88,12,.1)', color: '#ea580c',
                border: '1.5px solid rgba(234,88,12,.25)', borderRadius: 12,
                fontSize: 14, fontWeight: 700, cursor: 'pointer', minHeight: 48
              }}>🛒 Iniciar Nova Venda</button>
              <button onClick={() => setModalSucesso(null)} style={{
                width: '100%', padding: '10px', background: 'transparent', color: 'var(--text-secondary)',
                border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500,
                cursor: 'pointer', minHeight: 36
              }}>Fechar</button>
            </div>
          </div>
        </div>
      )}


      <style>{`
        @media (min-width: 1024px) {
          .pdv-grid { grid-template-columns: 2fr 1fr !important; }
        }
        @media (min-width: 768px) {
          .busca-grid { grid-template-columns: 2fr 1fr !important; }
          .pdv-header-desktop { display: block !important; }
        }
        @media (max-width: 767px) {
          .pdv-header-desktop { display: none !important; }
        }
        .product-card:active { transform: scale(0.97); }
      `}</style>
    </div>
  );
}
