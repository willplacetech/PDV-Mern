const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product'); // ✅ ADICIONADO: Importa o modelo de Produto
const auth = require('../middleware/auth');


const router = express.Router();


// ==========================================
// ✅ CRIAR PEDIDO - AGORA DIMINUI ESTOQUE!
// ==========================================
router.post('/', auth, async (req, res) => {
  try {
    // ✅ PASSO 1: Verificar se todos os produtos têm estoque suficiente
    for (const item of req.body.itens) {
      const produto = await Product.findById(item.produtoId);
      
      if (!produto) {
        return res.status(400).json({ 
          msg: `Produto não encontrado: ${item.nome || item.produtoId}` 
        });
      }

      if (produto.estoque < item.quantidade) {
        return res.status(400).json({ 
          msg: `Estoque insuficiente para "${produto.nome}". Disponível: ${produto.estoque} | Solicitado: ${item.quantidade}` 
        });
      }
    }

    // ✅ PASSO 2: Criar o pedido (igual ao seu código original)
    const pedido = new Order({
      ...req.body,
      atendente: req.user.username
    });
    await pedido.save();

    // ✅ PASSO 3: Diminuir o estoque de cada produto
    for (const item of req.body.itens) {
      await Product.findByIdAndUpdate(
        item.produtoId,
        { $inc: { estoque: -item.quantidade } },
        { new: true }
      );
    }

    res.status(201).json(pedido);
  } catch (err) {
    res.status(400).json({ msg: err.message });
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

    const totalPago = pedido.pagamentos.reduce((ac, p) => ac + (p.valorRecebido || 0), 0);
    const novoTotal = totalPago + parseFloat(valorRecebido);
    const quitado = novoTotal >= pedido.total;

    pedido.pagamentos.push({
      tipo,
      valorRecebido: parseFloat(valorRecebido),
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

    // ✅ Se já estava cancelado, não devolve estoque de novo
    if (pedido.status === 'cancelado') {
      return res.status(400).json({ msg: 'Pedido já está cancelado' });
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