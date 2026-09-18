const express = require('express');
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const Customer = require('../models/Customer');

const router = express.Router();

const formatPeriodRange = (periodo, referencia = new Date()) => {
  const agora = new Date(referencia);
  const inicio = new Date(referencia);

  if (periodo === 'dia') {
    inicio.setHours(0, 0, 0, 0);
    return { inicio, fim: new Date(agora) };
  }

  if (periodo === 'semana') {
    const dia = agora.getDay();
    const diferenca = (dia === 0 ? -6 : 1 - dia);
    inicio.setDate(agora.getDate() + diferenca);
    inicio.setHours(0, 0, 0, 0);
    return { inicio, fim: new Date(agora) };
  }

  inicio.setDate(1);
  inicio.setHours(0, 0, 0, 0);
  return { inicio, fim: new Date(agora) };
};

const getPreviousPeriodRange = (periodo, referencia = new Date()) => {
  const atual = formatPeriodRange(periodo, referencia);

  if (periodo === 'dia') {
    const anteriorInicio = new Date(atual.inicio);
    const anteriorFim = new Date(atual.inicio);
    anteriorInicio.setDate(anteriorInicio.getDate() - 1);
    anteriorInicio.setHours(0, 0, 0, 0);
    anteriorFim.setDate(anteriorFim.getDate() - 1);
    anteriorFim.setHours(23, 59, 59, 999);
    return { inicio: anteriorInicio, fim: anteriorFim };
  }

  if (periodo === 'semana') {
    const anteriorInicio = new Date(atual.inicio);
    const anteriorFim = new Date(atual.inicio);
    anteriorInicio.setDate(anteriorInicio.getDate() - 7);
    anteriorInicio.setHours(0, 0, 0, 0);
    anteriorFim.setDate(anteriorFim.getDate() - 1);
    anteriorFim.setHours(23, 59, 59, 999);
    return { inicio: anteriorInicio, fim: anteriorFim };
  }

  const anteriorInicio = new Date(atual.inicio);
  const anteriorFim = new Date(atual.inicio);
  anteriorInicio.setMonth(anteriorInicio.getMonth() - 1, 1);
  anteriorInicio.setHours(0, 0, 0, 0);
  anteriorFim.setMonth(anteriorFim.getMonth(), 0);
  anteriorFim.setHours(23, 59, 59, 999);
  return { inicio: anteriorInicio, fim: anteriorFim };
};

const getGrafico = (pedidos, periodo) => {
  const labels = periodo === 'dia'
    ? ['00h', '04h', '08h', '12h', '16h', '20h']
    : periodo === 'semana'
      ? ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
      : ['1-5', '6-10', '11-15', '16-20', '21-25', '26+'];

  const valores = new Array(labels.length).fill(0);

  pedidos.forEach((pedido) => {
    const data = new Date(pedido.createdAt);
    let indice = 0;

    if (periodo === 'dia') {
      indice = Math.min(5, Math.floor(data.getHours() / 4));
    } else if (periodo === 'semana') {
      indice = (data.getDay() + 6) % 7;
    } else {
      const diaDoMes = data.getDate();
      indice = Math.min(labels.length - 1, Math.floor((diaDoMes - 1) / 5));
    }

    valores[indice] += Number(pedido.total || 0);
  });

  return { labels, valores };
};

const getItensVendidos = (pedidos) => pedidos.reduce((total, pedido) => {
  const quantidadeItens = (pedido.itens || []).reduce((soma, item) => {
    const valor = item.tipo === 'peso' ? Number(item.pesoKg || 0) : Number(item.quantidade || 0);
    return soma + (Number.isFinite(valor) ? valor : 0);
  }, 0);

  return total + quantidadeItens;
}, 0);

const getResumoFechamento = (pedidos) => {
  const statusResumo = {
    pago: { valor: 0, count: 0 },
    pendente: { valor: 0, count: 0 },
    parcial: { valor: 0, count: 0 },
    cancelado: { valor: 0, count: 0 },
  };

  const formasPagamento = {};
  let recebimentos = 0;
  let aReceber = 0;

  pedidos.forEach((pedido) => {
    const status = pedido.status || 'pendente';
    const valorPedido = Number(pedido.total || 0);
    const recebimentoPedido = (pedido.pagamentos || []).reduce((soma, pagamento) => soma + Number(pagamento.valorRecebido || 0), 0);

    if (statusResumo[status]) {
      statusResumo[status].valor += valorPedido;
      statusResumo[status].count += 1;
    }

    recebimentos += recebimentoPedido;

    if (['pendente', 'parcial'].includes(status)) {
      aReceber += valorPedido;
    }

    (pedido.pagamentos || []).forEach((pagamento) => {
      const tipo = pagamento.tipo || 'credito_loja';
      formasPagamento[tipo] = (formasPagamento[tipo] || 0) + Number(pagamento.valorRecebido || 0);
    });
  });

  const totalVendas = pedidos.reduce((soma, pedido) => soma + Number(pedido.total || 0), 0);
  const porForma = Object.entries(formasPagamento)
    .map(([tipo, valor]) => ({
      tipo,
      valor: Number(valor.toFixed(2)),
      label: {
        dinheiro: 'Dinheiro',
        pix: 'Pix',
        credito_loja: 'Crédito Loja',
        cartao_credito: 'Cartão Crédito',
        cartao_debito: 'Cartão Débito',
        cheque: 'Cheque',
      }[tipo] || tipo},
    ))
    .sort((a, b) => b.valor - a.valor);

  return {
    totalVendas: Number(totalVendas.toFixed(2)),
    recebimentos: Number(recebimentos.toFixed(2)),
    aReceber: Number(aReceber.toFixed(2)),
    cancelado: Number((statusResumo.cancelado?.valor || 0).toFixed(2)),
    statusResumo,
    porForma,
  };
};

const getRelatorioPorCliente = (pedidos) => {
  const agrupado = new Map();

  pedidos.forEach((pedido) => {
    const chave = pedido.clienteId ? String(pedido.clienteId) : String(pedido.clienteNome || 'Cliente não identificado');
    const nome = pedido.clienteNome || 'Cliente não identificado';

    if (!agrupado.has(chave)) {
      agrupado.set(chave, {
        nome,
        total: 0,
        pedidos: 0,
      });
    }

    const cliente = agrupado.get(chave);
    cliente.total += Number(pedido.total || 0);
    cliente.pedidos += 1;
  });

  return Array.from(agrupado.values())
    .map((cliente) => ({
      ...cliente,
      total: Number(cliente.total.toFixed(2)),
      ticketMedio: Number((cliente.total / (cliente.pedidos || 1)).toFixed(2)),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
};

const getComparativoPeriodo = (pedidosAtuais, pedidosAnteriores) => {
  const atual = pedidosAtuais.reduce((soma, pedido) => soma + Number(pedido.total || 0), 0);
  const anterior = pedidosAnteriores.reduce((soma, pedido) => soma + Number(pedido.total || 0), 0);
  const variacao = atual - anterior;
  const percentual = anterior > 0 ? (variacao / anterior) * 100 : 0;

  return {
    atual: Number(atual.toFixed(2)),
    anterior: Number(anterior.toFixed(2)),
    variacao: Number(variacao.toFixed(2)),
    percentual: Number(percentual.toFixed(1)),
  };
};

const buildQuery = ({ inicio, fim, clienteId, statusFiltro }) => {
  const query = {
    createdAt: { $gte: inicio, $lte: fim },
  };

  if (clienteId) {
    query.clienteId = clienteId;
  }

  if (statusFiltro && statusFiltro !== 'todos') {
    query.status = statusFiltro === 'pendente' ? { $in: ['pendente', 'parcial'] } : statusFiltro;
  }

  return query;
};

router.get('/', auth, async (req, res) => {
  try {
    const periodo = ['dia', 'semana', 'mes'].includes(req.query.periodo) ? req.query.periodo : 'semana';
    const clienteId = req.query.cliente || '';
    const statusFiltro = req.query.status || '';
    const { inicio, fim } = formatPeriodRange(periodo);
    const { inicio: inicioAnterior, fim: fimAnterior } = getPreviousPeriodRange(periodo);

    const query = buildQuery({ inicio, fim, clienteId, statusFiltro });
    const queryAnterior = buildQuery({ inicio: inicioAnterior, fim: fimAnterior, clienteId, statusFiltro });

    const pedidos = await Order.find(query).sort({ createdAt: -1 }).lean();
    const pedidosAnterior = await Order.find(queryAnterior).sort({ createdAt: -1 }).lean();

    const totalVendas = pedidos.reduce((soma, pedido) => soma + (Number(pedido.total) || 0), 0);
    const pedidosCount = pedidos.length;
    const ticketMedio = pedidosCount > 0 ? totalVendas / pedidosCount : 0;
    const itensVendidos = getItensVendidos(pedidos);

    const clientes = await Customer.find({}).sort({ nome: 1 }).lean();

    const response = {
      kpis: {
        total: Number(totalVendas.toFixed(2)),
        pedidos: pedidosCount,
        ticketMedio: Number(ticketMedio.toFixed(2)),
        itens: itensVendidos,
      },
      grafico: getGrafico(pedidos, periodo),
      fechamento: getResumoFechamento(pedidos),
      comparativo: getComparativoPeriodo(pedidos, pedidosAnterior),
      relatorioClientes: getRelatorioPorCliente(pedidos),
      pedidos: pedidos.slice(0, 8).map((pedido) => ({
        _id: pedido._id,
        numero: pedido.numero,
        clienteNome: pedido.clienteNome || 'Cliente não identificado',
        createdAt: pedido.createdAt,
        itens: pedido.itens || [],
        total: Number(pedido.total || 0),
        status: pedido.status,
      })),
      clientes: clientes.map((cliente) => ({
        _id: cliente._id,
        nome: cliente.nome,
      })),
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
    res.status(500).json({ msg: 'Erro ao carregar dashboard' });
  }
});

module.exports = router;
