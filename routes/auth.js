const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   POST api/auth/register-first
// @desc    Registrar o PRIMEIRO usuário (admin)
// @access  Público - só funciona se não houver usuários
router.post(
  '/register-first',
  [
    body('username', 'Usuário é obrigatório').not().isEmpty(),
    body('password', 'Senha deve ter pelo menos 4 caracteres').isLength({ min: 4 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
      // Verificar se já existe usuário
      const userCount = await User.countDocuments();
      if (userCount > 0) {
        return res.status(400).json({ msg: 'Já existem usuários cadastrados. Contate o administrador.' });
      }

      // Criar usuário admin
      const user = new User({
        username: username.toLowerCase().trim(),
        password,
        role: 'admin',
      });

      await user.save();

      // Gerar JWT
      const payload = { user: { id: user.id, username: user.username, role: user.role } };
      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE },
        (err, token) => {
          if (err) throw err;
          res.json({ 
            token, 
            user: { id: user.id, username: user.username, role: user.role } 
          });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Erro no servidor');
    }
  }
);

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
      
      if (!user) {
        return res.status(400).json({ msg: 'Usuário ou senha inválidos' });
      }

      // Verificar senha
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(400).json({ msg: 'Usuário ou senha inválidos' });
      }

      // Gerar JWT
      const payload = { user: { id: user.id, username: user.username, role: user.role } };
      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE },
        (err, token) => {
          if (err) throw err;
          res.json({ 
            token, 
            user: { id: user.id, username: user.username, role: user.role } 
          });
        }
      );
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
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erro no servidor');
  }
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
      res.json({ msg: 'Usuário criado com sucesso', userId: user.id });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Erro no servidor');
    }
  }
);

module.exports = router;