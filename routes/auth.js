const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const cookieOptions = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 24 * 60 * 60 * 1000,
  path: '/',
};

// @route   POST api/auth/login
// @desc    Login e retornar token
// @access  Público
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const normalizedUsername = typeof username === 'string' ? username.toLowerCase().trim() : '';
  if (normalizedUsername !== 'admin' || password !== '1234') {
    return res.status(401).json({ msg: 'Usuário ou senha inválidos' });
  }

  const user = { id: 'mock-admin', username: 'admin', role: 'admin' };
  const token = jwt.sign({ user }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '24h',
  });
  res.cookie('pdv_token', token, cookieOptions);
  res.json({ user });
});

// @route   GET api/auth/me
// @desc    Informar o operador da sessão pública
// @access  Público durante a fase sem login
router.get('/me', (req, res) => {
  res.json({ username: 'admin', role: 'admin' });
});

router.post('/logout', (req, res) => {
  const clearCookieOptions = { ...cookieOptions };
  delete clearCookieOptions.maxAge;
  res.clearCookie('pdv_token', clearCookieOptions);
  res.status(204).end();
});

module.exports = router;