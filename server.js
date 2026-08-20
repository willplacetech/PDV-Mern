require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const colors = require('colors');
const connectDB = require('./db');

// Conectar ao banco
connectDB();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Rotas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/orders', require('./routes/orders'));

// Rota base
app.get('/api', (req, res) => {
  res.json({ 
    msg: 'API PDV MERN funcionando!',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      customers: '/api/customers',
      orders: '/api/orders'
    }
  });
});

// Tratamento de erro global
app.use((err, req, res, next) => {
  console.error(err.stack.red);
  res.status(500).json({ msg: 'Erro interno do servidor' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`.yellow.bold);
});