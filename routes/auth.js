const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');

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
router.post(
  '/login',
  [
    body('username', 'Usuário é obrigatório').not().isEmpty(),
    body('password', 'Senha é obrigatória').exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
      // Buscar usuário com a senha (select: '+password')
      const user = await User.findOne({ username: username.toLowerCase().trim() }).select('+password');
      
      const isMatch = user ? await user.matchPassword(password) : false;
      if (!user || !isMatch) {
        return res.status(401).json({ msg: 'Usuário ou senha inválidos' });
      }
      if (!isMatch) {
        return res.status(400).json({ msg: 'Usuário ou senha inválidos' });
      }

      const payload = { user: { id: user.id, username: user.username, role: user.role } };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
      res.cookie('pdv_token', token, cookieOptions);
      res.json({ user: { id: user.id, username: user.username, role: user.role } });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Erro no servidor');
    }
  }
);

// @route   POST api/auth/verify-password
// @desc    Verificar senha do usuário logado (para confirmações sensíveis)
// @access  Privado
router.post(
  '/verify-password',
  [auth, body('password', 'Senha é obrigatória').exists()],
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select('+password');
      const isMatch = await user.matchPassword(req.body.password);
      
      res.json({ valid: isMatch });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Erro no servidor');
    }
  }
);

// @route   GET api/auth/me
// @desc    Pegar dados do usuário logado
// @access  Privado
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ msg: 'Usuário não encontrado' });
    }
    res.json({ id: user.id, username: user.username, role: user.role });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erro no servidor');
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('pdv_token', cookieOptions);
  res.status(204).end();
});

// @route   POST api/auth/register
// @desc    Registrar novo usuário (apenas admin)
// @access  Privado - Admin
router.post(
  '/register',
  [
    auth,
    body('username', 'Usuário é obrigatório').not().isEmpty(),
    body('password', 'Senha deve ter pelo menos 4 caracteres').isLength({ min: 4 }),
  ],
  async (req, res) => {
    try {
      // Verificar se é admin
      const currentUser = await User.findById(req.user.id);
      if (currentUser.role !== 'admin') {
        return res.status(403).json({ msg: 'Apenas administradores podem criar usuários' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, password, role } = req.body;

      // Verificar duplicidade
      let user = await User.findOne({ username: username.toLowerCase().trim() });
      if (user) {
        return res.status(400).json({ msg: 'Usuário já existe' });
      }

      user = new User({
        username: username.toLowerCase().trim(),
        password,
        role: role || 'operador',
      });

      await user.save();
      res.status(201).json({ msg: 'Usuário criado com sucesso', userId: user.id });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Erro no servidor');
    }
  }
);

module.exports = router;