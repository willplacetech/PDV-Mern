require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const colors = require('colors');
const connectDB = require('./db');

// Conectar ao banco para os dados do PDV; o login mockado não consulta usuários.
connectDB();

const app = express();
const allowedOrigins = (process.env.FRONTEND_URL || 'https://pdv-mern-1.onrender.com')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

// Middlewares
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin: (requestOrigin, callback) => {
    if (!requestOrigin || allowedOrigins.includes(requestOrigin.replace(/\/$/, ''))) {
      return callback(null, true);
    }
    return callback(new Error('Origem não autorizada pelo CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  const cookieHeader = req.headers.cookie || '';
  req.cookies = Object.fromEntries(cookieHeader.split(';').filter(Boolean).map((cookie) => {
    const separator = cookie.indexOf('=');
    return [cookie.slice(0, separator).trim(), decodeURIComponent(cookie.slice(separator + 1).trim())];
  }));
  next();
});
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { msg: 'Muitas tentativas de login. Tente novamente mais tarde.' },
}));

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