const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  produtoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  codigo: String,
  nome: String,
  precoUnitario: { type: Number, required: true },
  quantidade: { type: Number, required: true, min: 1 }
});

const pagamentoSchema = new mongoose.Schema({
  tipo: { 
    type: String, 
    enum: ['dinheiro', 'pix', 'credito_loja', 'cartao_credito', 'cartao_debito', 'cheque'],
    default: 'credito_loja'
  },
  valorRecebido: { type: Number, default: 0 },
  dataPagamento: Date,
  quitado: { type: Boolean, default: false },
  observacao: String
});

const orderSchema = new mongoose.Schema({
  numero: { type: String, unique: true },
  itens: [itemSchema],
  subtotal: { type: Number, required: true },
  desconto: { type: Number, default: 0 },
  total: { type: Number, required: true },
  
  clienteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  clienteNome: String,
  clienteTelefone: String,
  
  status: {
    type: String,
    enum: ['pendente', 'pago', 'parcial', 'cancelado'],
    default: 'pendente'
  },
  
  pagamentos: [pagamentoSchema],
  
  atendente: { type: String, required: true },
  observacao: String
}, { timestamps: true });

// Gerar número do pedido automaticamente
orderSchema.pre('save', async function(next) {
  if (!this.numero) {
    const ultimo = await this.constructor.findOne({}, {}, { sort: { numero: -1 } });
    const proximo = ultimo ? parseInt(ultimo.numero) + 1 : 1;
    this.numero = String(proximo).padStart(6, '0');
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);