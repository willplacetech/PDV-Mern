const express = require('express');
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const Customer = require('../models/Customer');

const router = express.Router();

const formatPeriodRange = (periodo) => {
  const agora = new Date();
  const inicio = new Date(agora);

  if (periodo === 'dia') {
    inicio.setHours(0, 0, 0, 0);
    return { inicio, fim: agora };
  }

  if (periodo === 'semana') {
    const dia = agora.getDay();
    const diferenca = (dia === 0 ? -6 : 1 - dia);
    inicio.setDate(agora.getDate() + diferenca);
    inicio.setHours(0, 0, 0, 0);
    return { inicio, fim: agora };
  }

  inicio.setDate(1);
  inicio.setHours(0, 0, 0, 0);
  return { inicio, fim: agora };
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

router.get('/', auth, async (req, res) => {
  try {
    const periodo = ['dia', 'semana', 'mes'].includes(req.query.periodo) ? req.query.periodo : 'semana';
    const clienteId = req.query.cliente || '';
    const statusFiltro = req.query.status || '';

    const { inicio, fim } = formatPeriodRange(periodo);
    const query = {
      createdAt: { $gte: inicio, $lte: fim },
    };

    if (clienteId) {
      query.clienteId = clienteId;
    }

    if (statusFiltro && statusFiltro !== 'todos') {
      query.status = statusFiltro === 'pendente' ? { $in: ['pendente', 'parcial'] } : statusFiltro;
    }

    const pedidos = await Order.find(query).sort({ createdAt: -1 }).lean();

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
