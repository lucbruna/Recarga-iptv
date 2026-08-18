const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken, authenticate } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, contact, contact_type } = req.body;

    // Validações
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    // Criar usuário
    const user = await User.create({
      name,
      email,
      password,
      contact,
      contact_type
    });

    // Gerar token
    const token = generateToken(user.id);

    res.status(201).json({
      message: 'Conta criada com sucesso',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        contact: user.contact,
        contact_type: user.contact_type,
        balance: user.balance,
        created_at: user.created_at
      },
      token
    });
  } catch (error) {
    if (error.message === 'Email já está cadastrado') {
      return res.status(409).json({ error: error.message });
    }
    console.error('Erro ao registrar:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Autenticar
    const user = await User.authenticate(email, password);

    // Gerar token
    const token = generateToken(user.id);

    res.json({
      message: 'Login realizado com sucesso',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        contact: user.contact,
        contact_type: user.contact_type,
        balance: user.balance,
        created_at: user.created_at
      },
      token
    });
  } catch (error) {
    if (error.message === 'Usuário não encontrado' || error.message === 'Senha incorreta') {
      return res.status(401).json({ error: error.message });
    }
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/auth/me - Obter dados do usuário logado
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
