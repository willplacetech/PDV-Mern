const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Customer = require('../models/Customer');

const limparDocumento = (valor) => String(valor || '').replace(/\D/g, '');
const normalizarEndereco = valor => valor && typeof valor === 'object' ? valor : String(valor || '').trim();
const validarDocumento = (valor) => {
  const digitos = limparDocumento(valor);
  if (![11, 14].includes(digitos.length) || /^(\d)\1+$/.test(digitos)) return false;
  const calcularDigito = (base, pesos) => {
    let soma = 0;
    for (let i = 0; i < base.length; i += 1) soma += Number(base[i]) * pesos[i];
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const cpf = digitos.length === 11;
  const pesosPrimeiro = cpf ? [10, 9, 8, 7, 6, 5, 4, 3, 2] : [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesosSegundo = cpf ? [11, 10, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const base = digitos.slice(0, -2);
  const primeiro = calcularDigito(base, pesosPrimeiro);
  const segundo = calcularDigito(base + primeiro, pesosSegundo);
  return digitos.endsWith(`${primeiro}${segundo}`);
};

// @route   GET api/customers
// @desc    Listar clientes com busca
// @access  Privado
router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      const documentoBusca = limparDocumento(search);
      query = {
        $or: [
          { nome: { $regex: search, $options: 'i' } },
          { telefone: { $regex: search, $options: 'i' } },
          ...(documentoBusca ? [
            { documento: { $regex: documentoBusca } },
            { cpf: { $regex: documentoBusca } },
          ] : []),
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
      const { nome, telefone, endereco, email, documento, tipoDocumento } = req.body;
      const documentoLimpo = limparDocumento(documento);
      if (!validarDocumento(documentoLimpo)) {
        return res.status(400).json({ msg: 'CPF/CNPJ inválido. Verifique os dígitos.' });
      }

      const customer = new Customer({
        nome: nome.trim(),
        telefone: telefone ? telefone.trim() : '',
        endereco: normalizarEndereco(endereco),
        email: email ? email.trim() : '',
        documento: documentoLimpo,
        tipoDocumento: tipoDocumento || (documentoLimpo.length === 14 ? 'CNPJ' : 'CPF'),
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
    const { nome, telefone, endereco, email, documento, tipoDocumento } = req.body;

    const updateFields = {};
    if (nome) updateFields.nome = nome.trim();
    if (telefone !== undefined) updateFields.telefone = telefone.trim();
    if (endereco !== undefined) updateFields.endereco = normalizarEndereco(endereco);
    if (email !== undefined) updateFields.email = email.trim();
    if (documento !== undefined) {
      const documentoLimpo = limparDocumento(documento);
      if (!validarDocumento(documentoLimpo)) {
        return res.status(400).json({ msg: 'CPF/CNPJ inválido. Verifique os dígitos.' });
      }
      updateFields.documento = documentoLimpo;
      updateFields.tipoDocumento = tipoDocumento || (documentoLimpo.length === 14 ? 'CNPJ' : 'CPF');
    }

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