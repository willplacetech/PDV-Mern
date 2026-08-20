const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Product = require('../models/Product');

// @route   GET api/products
// @desc    Listar todos os produtos com busca
// @access  Privado
router.get('/', auth, async (req, res) => {
  try {
    const { search, categoria } = req.query;
    let query = {};

    // Busca por texto (nome ou código)
    if (search) {
      query = {
        $or: [
          { nome: { $regex: search, $options: 'i' } },
          { codigo: { $regex: search, $options: 'i' } },
        ],
      };
    }

    // Filtrar por categoria
    if (categoria) {
      query.categoria = categoria;
    }

    const products = await Product.find(query).sort({ nome: 1 });
    res.json(products);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erro no servidor');
  }
});

// @route   GET api/products/:id
// @desc    Pegar produto por ID
// @access  Privado
router.get('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ msg: 'Produto não encontrado' });
    }
    res.json(product);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Produto não encontrado' });
    }
    res.status(500).send('Erro no servidor');
  }
});

// @route   POST api/products
// @desc    Criar novo produto
// @access  Privado
router.post(
  '/',
  [
    auth,
    body('codigo', 'Código é obrigatório').not().isEmpty(),
    body('nome', 'Nome é obrigatório').not().isEmpty(),
    body('preco', 'Preço deve ser um número positivo').isFloat({ min: 0 }),
    body('estoque', 'Estoque deve ser um número').optional().isInt({ min: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { codigo, nome, categoria, preco, estoque } = req.body;

      // 🔒 SEGURANÇA: Verificar duplicidade de código
      const existingProduct = await Product.findOne({ 
        codigo: { $regex: new RegExp(`^${codigo.trim()}$`, 'i') } 
      });
      
      if (existingProduct) {
        return res.status(400).json({ msg: 'Já existe um produto com este código' });
      }

      const product = new Product({
        codigo: codigo.trim(),
        nome: nome.trim(),
        categoria: categoria || 'Outros',
        preco: parseFloat(preco),
        estoque: parseInt(estoque) || 0,
        createdBy: req.user.id,
      });

      await product.save();
      res.status(201).json(product);
    } catch (err) {
      console.error(err.message);
      if (err.code === 11000) {
        return res.status(400).json({ msg: 'Código duplicado' });
      }
      res.status(500).send('Erro no servidor');
    }
  }
);

// @route   PUT api/products/:id
// @desc    Atualizar produto
// @access  Privado
router.put(
  '/:id',
  [
    auth,
    body('codigo', 'Código é obrigatório').optional().not().isEmpty(),
    body('nome', 'Nome é obrigatório').optional().not().isEmpty(),
    body('preco', 'Preço deve ser positivo').optional().isFloat({ min: 0 }),
    body('estoque', 'Estoque não pode ser negativo').optional().isInt({ min: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { codigo, nome, categoria, preco, estoque } = req.body;

      // 🔒 SEGURANÇA: Verificar se o código não pertence a OUTRO produto
      if (codigo) {
        const duplicate = await Product.findOne({
          codigo: { $regex: new RegExp(`^${codigo.trim()}$`, 'i') },
          _id: { $ne: req.params.id },
        });
        if (duplicate) {
          return res.status(400).json({ msg: 'Já existe um produto com este código' });
        }
      }

      // Montar dados de atualização
      const updateFields = {};
      if (codigo) updateFields.codigo = codigo.trim();
      if (nome) updateFields.nome = nome.trim();
      if (categoria) updateFields.categoria = categoria;
      if (preco !== undefined) updateFields.preco = parseFloat(preco);
      if (estoque !== undefined) updateFields.estoque = parseInt(estoque);

      const product = await Product.findByIdAndUpdate(
        req.params.id,
        { $set: updateFields },
        { new: true, runValidators: true }
      );

      if (!product) {
        return res.status(404).json({ msg: 'Produto não encontrado' });
      }

      res.json(product);
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Produto não encontrado' });
      }
      res.status(500).send('Erro no servidor');
    }
  }
);

// @route   DELETE api/products/:id
// @desc    Deletar produto
// @access  Privado
router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ msg: 'Produto não encontrado' });
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Produto removido com sucesso' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Produto não encontrado' });
    }
    res.status(500).send('Erro no servidor');
  }
});

module.exports = router;