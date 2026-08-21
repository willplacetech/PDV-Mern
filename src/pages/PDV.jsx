import { useState, useEffect, useRef } from 'react';
import api from '../services/api.jsx';
import { useToast } from '../components/Toast.jsx';


const corCategoria = {
  Alimentos: { bg: 'rgba(234,88,12,.12)', txt: '#ea580c', border: 'rgba(234,88,12,.25)' },
  Bebidas: { bg: 'rgba(37,99,171,.12)', txt: '#2563ab', border: 'rgba(37,99,171,.25)' },
  Limpeza: { bg: 'rgba(13,148,136,.12)', txt: '#0d9488', border: 'rgba(13,148,136,.25)' },
  Higiene: { bg: 'rgba(189,49,147,.12)', txt: '#bd3193', border: 'rgba(189,49,147,.25)' },
  Hortifruti: { bg: 'rgba(22,163,74,.12)', txt: '#16a34a', border: 'rgba(22,163,74,.25)' },
  Padaria: { bg: 'rgba(180,83,9,.12)', txt: '#b45309', border: 'rgba(180,83,9,.25)' },
  Outros: { bg: 'rgba(100,116,139,.12)', txt: '#64748b', border: 'rgba(100,116,139,.25)' }
};


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


  useEffect(() => { carregarDados(); }, []);


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
    if (prod.estoque <= 0) return showToast('Produto sem estoque!', 'error');
    const existe = carrinho.find(i => i.produtoId === prod._id);
    if (existe) {
      if (existe.quantidade >= prod.estoque) return showToast('Estoque máximo atingido!', 'warning');
      setCarrinho(carrinho.map(i => i.produtoId === prod._id ? { ...i, quantidade: i.quantidade + 1 } : i));
    } else {
      setCarrinho([...carrinho, {
        produtoId: prod._id, codigo: prod.codigo, nome: prod.nome,
        precoUnitario: prod.preco, quantidade: 1
      }]);
    }
  };


  const alterarQtd = (idx, qtd) => {
    const novos = [...carrinho];
    const prod = produtos.find(p => p._id === novos[idx].produtoId);
    if (qtd < 1) return removerItem(idx);
    if (qtd > prod.estoque) return showToast(`Máximo: ${prod.estoque}`, 'warning');
    novos[idx].quantidade = qtd;
    setCarrinho(novos);
  };


  const setPreco = (idx, valor) => {
    const novos = [...carrinho];
    novos[idx].precoUnitario = Math.max(0, parseFloat(valor) || 0);
    setCarrinho(novos);
  };


  const removerItem = (idx) => setCarrinho(carrinho.filter((_, i) => i !== idx));


  const subtotal = carrinho.reduce((ac, i) => ac + i.precoUnitario * i.quantidade, 0);
  const total = Math.max(0, subtotal - (parseFloat(desconto) || 0));
  const totalItens = carrinho.reduce((ac, i) => ac + i.quantidade, 0);
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

    try {
      const res = await api.post('/orders', {
        itens: carrinho, subtotal, desconto: descontoNumerico, total,
        clienteId, clienteNome: clienteSelecionado?.nome || 'Cliente não identificado',
        clienteTelefone: clienteSelecionado?.telefone || ''
      });
      
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
          <div style="font-size:10px;">Cod: ${item.codigo} | Qtd: ${item.quantidade} x R$ ${item.precoUnitario.toFixed(2).replace('.',',')}</div>
        </div>
        <div style="font-weight:bold; white-space:nowrap;">R$ ${(item.quantidade * item.precoUnitario).toFixed(2).replace('.',',')}</div>
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
        <div class="center bold" style="font-size:14px;">PDV MERCADO LOCAL</div>
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
      `• ${item.nome}\n  ${item.quantidade} x R$ ${item.precoUnitario.toFixed(2).replace('.',',')} = R$ ${(item.quantidade * item.precoUnitario).toFixed(2).replace('.',',')}`
    ).join('\n');
    const texto = encodeURIComponent(
`🛒 *PEDIDO* #${pedido.numero}
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
    );
    const telefone = pedido.clienteTelefone ? pedido.clienteTelefone.replace(/\D/g, '') : '';
    const url = telefone 
      ? `https://wa.me/55${telefone}?text=${texto}`
      : `https://wa.me/?text=${texto}`;
    
    window.open(url, '_blank');
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
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px', color: '#0f172a' }}>🛒 Ponto de Venda</h1>
        <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Selecione os produtos para iniciar a venda</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }} className="pdv-grid">
        {/* COLUNA PRODUTOS */}
        <div>
          <div style={{
            background: '#fff', border: '1px solid rgba(15,23,42,.08)',
            borderRadius: 16, padding: 16, marginBottom: 16
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }} className="busca-grid">
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6, display: 'block' }}>Buscar produto</label>
                <input
                  placeholder="Código, nome ou categoria..." value={busca}
                  onChange={e => setBusca(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 14px', border: '1.5px solid rgba(15,23,42,.1)',
                    borderRadius: 10, fontSize: 16, boxSizing: 'border-box',
                    outline: 'none', background: '#fff', color: '#0f172a', minHeight: 48
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6, display: 'block' }}>Cliente</label>
                <select
                  ref={selectClienteRef} // ✅ Liga a referência
                  value={clienteId}
                  onChange={e => setClienteId(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 14px', border: '1.5px solid rgba(15,23,42,.1)',
                    borderRadius: 10, fontSize: 16, boxSizing: 'border-box',
                    outline: 'none', background: '#fff', color: '#0f172a', minHeight: 48
                  }}>
                  <option value="">Cliente não identificado</option>
                  {clientes.map(c => <option key={c._id} value={c._id}>{c.nome}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div style={{
            background: '#fff', border: '1px solid rgba(15,23,42,.08)',
            borderRadius: 16, padding: 16
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#0f172a' }}>Produtos</h3>
              <span style={{
                background: 'rgba(234,88,12,.14)', color: '#ea580c',
                padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600
              }}>{filtrados.length}</span>
            </div>
            {filtrados.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#64748b', padding: '40px 20px', fontSize: 14 }}>Nenhum produto encontrado</p>
            ) : (
              <div style={{
                display: 'grid', gap: 10,
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                maxHeight: 420, overflowY: 'auto', padding: 2
              }}>
                {filtrados.map(p => {
                  const cat = corCategoria[p.categoria] || corCategoria.Outros;
                  const semEstoque = p.estoque <= 0;
                  const estoqueBaixo = p.estoque > 0 && p.estoque <= 5;
                  return (
                    <div key={p._id} onClick={() => adicionarItem(p)} style={{
                      background: '#fff', border: `1.5px solid ${semEstoque ? 'rgba(0,0,0,.1)' : cat.border}`,
                      borderRadius: 14, padding: 12, cursor: semEstoque ? 'not-allowed' : 'pointer',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                      minHeight: 120, opacity: semEstoque ? 0.5 : 1, transition: 'all .15s',
                      position: 'relative', overflow: 'hidden'
                    }} className="product-card">
                      <div>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: 12,
                          fontSize: 10, fontWeight: 700, marginBottom: 6,
                          background: cat.bg, color: cat.txt
                        }}>{p.categoria}</span>
                        <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.25, color: '#0f172a' }}>{p.nome}</div>
                        <div style={{ fontSize: 10, color: '#64748b', marginTop: 3, fontFamily: 'monospace' }}>Cod: {p.codigo}</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 6 }}>
                        <div style={{
                          fontSize: 10, fontWeight: estoqueBaixo ? 700 : 500,
                          color: estoqueBaixo ? '#dc2626' : '#64748b'
                        }}>Est: {p.estoque}</div>
                        <div style={{
                          fontWeight: 700, fontSize: 16, color: semEstoque ? '#999' : '#ea580c',
                          fontVariantNumeric: 'tabular-nums'
                        }}>R$ {p.preco.toFixed(2).replace('.', ',')}</div>
                      </div>
                      {semEstoque && (
                        <div style={{
                          position: 'absolute', top: 6, right: 6, background: 'rgba(220,38,38,.12)',
                          color: '#dc2626', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 8
                        }}>SEM ESTOQUE</div>
                      )}
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
            background: '#fff', border: '1px solid rgba(15,23,42,.08)',
            borderRadius: 16, padding: 16, position: 'sticky', top: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                📝 Carrinho
                {totalItens > 0 && (
                  <span style={{
                    background: '#ea580c', color: '#fff',
                    padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700
                  }}>{totalItens}</span>
                )}
              </h3>
            </div>
            {carrinho.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b', fontSize: 14 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🛒</div>
                Carrinho vazio<br />
                <span style={{ fontSize: 12 }}>Toque nos produtos ao lado</span>
              </div>
            ) : (
              <>
                <div style={{ maxHeight: 320, overflowY: 'auto', marginBottom: 14, paddingRight: 4 }}>
                  {carrinho.map((item, i) => {
                    const prod = produtos.find(p => p._id === item.produtoId);
                    return (
                      <div key={i} style={{
                        padding: '10px 0', borderBottom: '1px solid rgba(15,23,42,.06)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div style={{ flex: 1, paddingRight: 8 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3, color: '#0f172a' }}>{item.nome}</div>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                              Cod: {item.codigo} | Disp: {prod?.estoque ?? '-'}
                            </div>
                          </div>
                          <button onClick={() => removerItem(i)} style={{
                            background: 'rgba(220,38,38,.1)', color: '#dc2626',
                            border: 'none', borderRadius: 8, padding: '6px 10px',
                            cursor: 'pointer', fontWeight: 700, fontSize: 12, minHeight: 32
                          }}>✕</button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid rgba(15,23,42,.1)', borderRadius: 10, overflow: 'hidden' }}>
                            <button onClick={() => alterarQtd(i, item.quantidade - 1)} style={{
                              width: 40, height: 40, background: 'transparent', border: 'none',
                              cursor: 'pointer', fontSize: 18, fontWeight: 700, color: '#64748b'
                            }}>−</button>
                            <input type="number" min={1} value={item.quantidade}
                              onChange={e => alterarQtd(i, parseInt(e.target.value))}
                              style={{
                                width: 48, textAlign: 'center', border: 'none',
                                borderLeft: '1px solid rgba(15,23,42,.1)',
                                borderRight: '1px solid rgba(15,23,42,.1)',
                                padding: '8px 4px', fontSize: 15, fontWeight: 700,
                                background: '#fff', color: '#0f172a'
                              }} />
                            <button onClick={() => alterarQtd(i, item.quantidade + 1)} style={{
                              width: 40, height: 40, background: 'transparent', border: 'none',
                              cursor: 'pointer', fontSize: 18, fontWeight: 700, color: '#64748b'
                            }}>+</button>
                          </div>
                          <div style={{ flex: 1, textAlign: 'right' }}>
                            <div style={{ fontSize: 11, color: '#64748b' }}>Unitário</div>
                            <input type="number" step="0.01" min={0} value={item.precoUnitario.toFixed(2)}
                              onChange={e => setPreco(i, e.target.value)}
                              style={{
                                width: 90, textAlign: 'right', padding: '8px 10px',
                                border: '1px solid rgba(15,23,42,.1)', borderRadius: 8,
                                fontSize: 14, fontWeight: 700, color: '#ea580c',
                                background: '#fff', minHeight: 38
                              }} />
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', marginTop: 8, fontWeight: 700, fontSize: 15, color: '#0f172a' }}>
                          Subtotal: R$ {(item.precoUnitario * item.quantidade).toFixed(2).replace('.', ',')}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ borderTop: '1px solid rgba(15,23,42,.08)', paddingTop: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14, color: '#64748b' }}>
                    <span>Subtotal</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8 }}>
                    <span style={{ fontSize: 14, color: '#64748b' }}>Desconto R$</span>
                    <input type="number" step="0.01" min={0} value={desconto}
                      onChange={e => setDesconto(e.target.value)}
                      style={{
                        width: 100, textAlign: 'right', padding: '8px 10px',
                        border: '1px solid rgba(15,23,42,.1)', borderRadius: 8,
                        fontSize: 14, background: '#fff', color: '#0f172a', minHeight: 38
                      }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontWeight: 700, fontSize: 24, color: '#ea580c' }}>
                    <span>Total</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>R$ {total.toFixed(2).replace('.', ',')}</span>
                  </div>
                  
                  {/* ✅ APENAS O BOTÃO FINALIZAR PEDIDO */}
                  <button onClick={finalizar} style={{
                    width: '100%', padding: '14px', background: '#ea580c', color: '#fff',
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
            background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 400,
            textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,.2)'
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', margin: '0 auto 16px',
              background: 'rgba(22,163,74,.12)', color: '#16a34a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36
            }}>✅</div>
            <h3 style={{ margin: '0 0 4px', fontSize: 20, color: '#0f172a' }}>Venda Finalizada!</h3>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#64748b' }}>
              Pedido <strong style={{ color: '#0f172a' }}>#{modalSucesso.numero}</strong>
              <br />
              Total: <strong style={{ color: '#ea580c', fontSize: 16 }}>
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
                width: '100%', padding: '10px', background: 'transparent', color: '#64748b',
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