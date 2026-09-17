const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: [true, 'Nome é obrigatório'],
    trim: true,
  },
  telefone: {
    type: String,
    trim: true,
  },
  endereco: {
    type: mongoose.Schema.Types.Mixed,
    default: '',
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  documento: {
    type: String,
    trim: true,
  },
  tipoDocumento: {
    type: String,
    enum: ['CPF', 'CNPJ'],
  },
  cpf: {
    type: String,
    trim: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

CustomerSchema.index({ nome: 'text', telefone: 'text', documento: 'text' });

module.exports = mongoose.model('Customer', CustomerSchema);