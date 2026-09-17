const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  codigo: {
    type: String,
    required: [true, 'Código é obrigatório'],
    unique: true,
    trim: true,
    index: true,
  },
  nome: {
    type: String,
    required: [true, 'Nome é obrigatório'],
    trim: true,
    index: true,
  },
  categoria: {
    type: String,
    required: true,
    enum: ['Alimentos', 'Bebidas', 'Limpeza', 'Higiene', 'Hortifruti', 'Padaria', 'Outros'],
    default: 'Outros',
  },
  preco: {
    type: Number,
    required: [true, 'Preço é obrigatório'],
    min: [0, 'Preço não pode ser negativo'],
  },
  estoque: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Estoque não pode ser negativo'],
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

// Índice composto para busca
ProductSchema.index({ nome: 'text', codigo: 'text' });

module.exports = mongoose.model('Product', ProductSchema);