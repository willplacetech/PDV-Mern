const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Customer = require('../models/Customer');

// @route   GET api/customers
// @desc    Listar clientes com busca
// @access  Privado
router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      query = {
        $or: [
          { nome: { $regex: search, $options: 'i' } },
          { telefone: { $regex: search, $options: 'i' } },
        ],
      };
    }

    const customers = await Customer.find(query).sort({ nome: 1 });
    res.json(customers);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erro no servidor');
  }
});

// @route   POST api/customers
// @desc    Criar cliente
// @access  Privado
router.post(
  '/',
  [auth, body('nome', 'Nome é obrigatório').not().isEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { nome, telefone, endereco, cpf } = req.body;

      const customer = new Customer({
        nome: nome.trim(),
        telefone: telefone ? telefone.trim() : '',
        endereco: endereco ? endereco.trim() : '',
        cpf: cpf ? cpf.trim() : '',
        createdBy: req.user.id,
      });

      await customer.save();
      res.status(201).json(customer);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Erro no servidor');
    }
  }
);

// @route   PUT api/customers/:id
// @desc    Atualizar cliente
// @access  Privado
router.put('/:id', auth, async (req, res) => {
  try {
    const { nome, telefone, endereco, cpf } = req.body;

    const updateFields = {};
    if (nome) updateFields.nome = nome.trim();
    if (telefone !== undefined) updateFields.telefone = telefone.trim();
    if (endereco !== undefined) updateFields.endereco = endereco.trim();
    if (cpf !== undefined) updateFields.cpf = cpf.trim();

    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({ msg: 'Cliente não encontrado' });
    }

    res.json(customer);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Cliente não encontrado' });
    }
    res.status(500).send('Erro no servidor');
  }
});

// @route   DELETE api/customers/:id
// @desc    Deletar cliente
// @access  Privado
router.delete('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ msg: 'Cliente não encontrado' });
    }

    await Customer.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Cliente removido com sucesso' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Cliente não encontrado' });
    }
    res.status(500).send('Erro no servidor');
  }
});

module.exports = router;