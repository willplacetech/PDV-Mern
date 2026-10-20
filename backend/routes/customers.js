const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Customer = require('../models/Customer');
const { buildPage, getEffectivePage, parsePagination } = require('../services/pagination');

const limparDocumento = (valor) => String(valor || '').replace(/\D/g, '');
const documentoNormalizado = (campo) => ({
  $regexReplace: {
    input: { $ifNull: [`$${campo}`, ''] },
    regex: '\\D',
    replacement: '',
  },
});
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
    const pagination = parsePagination(req.query);
    if (pagination?.error) return res.status(400).json({ msg: pagination.error });
    let query = {};

    if (search) {
      const documentoBusca = limparDocumento(search);
      const termo = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query = {
        $or: [
          { nome: { $regex: termo, $options: 'i' } },
          { telefone: { $regex: termo, $options: 'i' } },
          ...(documentoBusca ? [
            { documento: { $regex: documentoBusca } },
            { cpf: { $regex: documentoBusca } },
          ] : []),
        ],
      };
    }

    let customersQuery = Customer.find(query).sort({ nome: 1, _id: 1 });
    if (pagination) {
      const total = await Customer.countDocuments(query);
      const page = getEffectivePage(pagination.page, pagination.pageSize, total);
      customersQuery = customersQuery
        .skip((page - 1) * pagination.pageSize)
        .limit(pagination.pageSize);
      const customers = await customersQuery;
      return res.json(buildPage(customers, page, pagination.pageSize, total));
    }

    const customers = await customersQuery;
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
      const documentoDuplicado = await Customer.exists({
        $expr: {
          $or: [
            { $eq: [documentoNormalizado('documento'), documentoLimpo] },
            { $eq: [documentoNormalizado('cpf'), documentoLimpo] },
          ],
        },
      });
      if (documentoDuplicado) {
        return res.status(400).json({ msg: 'Este documento já está cadastrado.' });
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
      const documentoDuplicado = await Customer.exists({
        _id: { $ne: req.params.id },
        $expr: {
          $or: [
            { $eq: [documentoNormalizado('documento'), documentoLimpo] },
            { $eq: [documentoNormalizado('cpf'), documentoLimpo] },
          ],
        },
      });
      if (documentoDuplicado) {
        return res.status(400).json({ msg: 'Este documento já está cadastrado.' });
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