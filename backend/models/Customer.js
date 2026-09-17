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
    type: String,
    trim: true,
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

CustomerSchema.index({ nome: 'text', telefone: 'text' });

module.exports = mongoose.model('Customer', CustomerSchema);