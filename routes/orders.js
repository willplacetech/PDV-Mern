const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product'); // ✅ ADICIONADO: Importa o modelo de Produto
const auth = require('../middleware/auth');


const router = express.Router();


// ==========================================
// ✅ CRIAR PEDIDO - AGORA DIMINUI ESTOQUE!
// ==========================================
router.post('/', auth, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    if (!Array.isArray(req.body.itens) || req.body.itens.length === 0) {
      return res.status(400).json({ msg: 'O pedido precisa ter pelo menos um item' });
    }

    const quantidades = new Map();
    for (const item of req.body.itens) {
      if (!mongoose.isValidObjectId(item.produtoId) || !Number.isInteger(item.quantidade) || item.quantidade < 1) {
        return res.status(400).json({ msg: 'Item de pedido inválido' });
      }
      quantidades.set(item.produtoId, (quantidades.get(item.produtoId) || 0) + item.quantidade);
    }

    session.startTransaction();
    const produtos = await Product.find({ _id: { $in: [...quantidades.keys()] } }).session(session);
    const produtosPorId = new Map(produtos.map(produto => [produto.id, produto]));
    const itens = req.body.itens.map(item => {
      const produto = produtosPorId.get(item.produtoId);
      if (!produto) throw new Error(`Produto não encontrado: ${item.produtoId}`);
      return {
        produtoId: produto.id,
        codigo: produto.codigo,
        nome: produto.nome,
        precoUnitario: produto.preco,
        quantidade: item.quantidade,
      };
    });

    const subtotal = itens.reduce((soma, item) => soma + item.precoUnitario * item.quantidade, 0);
    const desconto = Number(req.body.desconto || 0);
    if (!Number.isFinite(desconto) || desconto < 0 || desconto > subtotal) {
      throw new Error('Desconto inválido');
    }

    for (const [produtoId, quantidade] of quantidades) {
      const atualizado = await Product.findOneAndUpdate(
        { _id: produtoId, estoque: { $gte: quantidade } },
        { $inc: { estoque: -quantidade } },
        { new: true, session }
      );
      if (!atualizado) throw new Error(`Estoque insuficiente para "${produtosPorId.get(produtoId)?.nome || produtoId}"`);
    }

    const pedido = new Order({
      itens,
      subtotal,
      desconto,
      total: subtotal - desconto,
      clienteId: req.body.clienteId || undefined,
      clienteNome: req.body.clienteNome || 'Cliente não identificado',
      clienteTelefone: req.body.clienteTelefone || '',
      atendente: req.user.username
    });
    await pedido.save({ session });
    await session.commitTransaction();

    res.status(201).json(pedido);
  } catch (err) {
    if (session.inTransaction()) await session.abortTransaction();
    res.status(400).json({ msg: err.message });
  } finally {
    await session.endSession();
  }
});


// Listar todos (com filtros)
router.get('/', auth, async (req, res) => {
  try {
    const { clienteId, status, inicio, fim } = req.query;
    const filtro = {};
    
    if (clienteId) filtro.clienteId = clienteId;
    if (status) filtro.status = status;
    if (inicio && fim) {
      filtro.createdAt = {
        $gte: new Date(inicio),
        $lte: new Date(new Date(fim).setHours(23,59,59))
      };
    }

    const pedidos = await Order.find(filtro).sort({ createdAt: -1 });
    res.json(pedidos);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});


// Buscar um por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const pedido = await Order.findById(req.params.id);
    if (!pedido) return res.status(404).json({ msg: 'Pedido não encontrado' });
    res.json(pedido);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});


// ✅ Registrar pagamento / Quitar
router.patch('/:id/pagar', auth, async (req, res) => {
  try {
    const { tipo, valorRecebido, observacao } = req.body;
    const pedido = await Order.findById(req.params.id);
    if (!pedido) return res.status(404).json({ msg: 'Pedido não encontrado' });
    if (!['pendente', 'parcial'].includes(pedido.status)) {
      return res.status(400).json({ msg: 'Este pedido não aceita novos pagamentos' });
    }

    const totalPago = pedido.pagamentos.reduce((ac, p) => ac + (p.valorRecebido || 0), 0);
    const valor = Number(valorRecebido);
    if (!Number.isFinite(valor) || valor <= 0 || valor > pedido.total - totalPago) {
      return res.status(400).json({ msg: 'Valor de pagamento inválido' });
    }
    const novoTotal = totalPago + valor;
    const quitado = novoTotal >= pedido.total;

    pedido.pagamentos.push({
      tipo,
      valorRecebido: valor,
      dataPagamento: new Date(),
      quitado,
      observacao
    });

    pedido.status = quitado ? 'pago' : 'parcial';
    await pedido.save();
    res.json(pedido);
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});


// ✅ Marcar como quitado de uma vez
router.patch('/:id/quitar', auth, async (req, res) => {
  try {
    const pedido = await Order.findById(req.params.id);
    if (!pedido) return res.status(404).json({ msg: 'Pedido não encontrado' });
    if (!['pendente', 'parcial'].includes(pedido.status)) {
      return res.status(400).json({ msg: 'Este pedido não pode ser quitado' });
    }

    const totalPago = pedido.pagamentos.reduce((ac, p) => ac + (p.valorRecebido || 0), 0);
    const falta = Math.max(0, pedido.total - totalPago);

    if (falta > 0) {
      pedido.pagamentos.push({
        tipo: 'credito_loja',
        valorRecebido: falta,
        dataPagamento: new Date(),
        quitado: true,
        observacao: 'Quitado'
      });
    }

    pedido.status = 'pago';
    await pedido.save();
    res.json(pedido);
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});


// ==========================================
// ✅ CANCELAR - AGORA DEVOLVE ESTOQUE!
// ==========================================
router.patch('/:id/cancelar', auth, async (req, res) => {
  try {
    const pedido = await Order.findById(req.params.id);
    if (!pedido) return res.status(404).json({ msg: 'Pedido não encontrado' });

    if (!['pendente', 'parcial'].includes(pedido.status)) {
      return res.status(400).json({ msg: 'Somente pedidos pendentes ou parciais podem ser cancelados' });
    }

    // ✅ Devolver o estoque de cada item
    for (const item of pedido.itens) {
      await Product.findByIdAndUpdate(
        item.produtoId,
        { $inc: { estoque: item.quantidade } },
        { new: true }
      );
    }

    pedido.status = 'cancelado';
    await pedido.save();
    res.json(pedido);
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});


module.exports = router;