const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const User = require('../models/User');
const Activity = require('../models/Activity');
const { generatePixCode } = require('../pix');
const { authenticate } = require('../middleware/auth');

// GET /api/users/profile - Obter perfil do usuário
router.get('/profile', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// PUT /api/users/profile - Atualizar perfil
router.put('/profile', authenticate, (req, res) => {
  try {
    const { name, contact, contact_type } = req.body;

    const updatedUser = User.update(req.user.id, {
      name,
      contact,
      contact_type
    });

    res.json({
      message: 'Perfil atualizado com sucesso',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        contact: updatedUser.contact,
        contact_type: updatedUser.contact_type,
        balance: updatedUser.balance,
        created_at: updatedUser.created_at
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/users/balance - Obter saldo
router.get('/balance', authenticate, (req, res) => {
  const balance = User.getBalance(req.user.id);
  res.json({ balance });
});

// POST /api/users/activate - Ativar conta (requer saldo mínimo de R$ 200)
router.post('/activate', authenticate, (req, res) => {
  try {
    if (req.user.is_activated) {
      return res.json({ message: 'Conta já está ativada', user: req.user });
    }

    if (req.user.balance < 200) {
      return res.status(400).json({
        error: 'Saldo insuficiente. Depósito mínimo de R$ 200,00 para ativar a conta.'
      });
    }

    const updatedUser = User.setActivated(req.user.id, true);
    Activity.add(req.user.id, 'activate', `${req.user.name} ativou a conta`);

    const { password, ...userWithoutPassword } = updatedUser;
    res.json({
      message: 'Conta ativada com sucesso!',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Erro ao ativar conta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/users/deposits - Solicitar depósito via Pix (saldo só é creditado após confirmação)
router.post('/deposits', authenticate, (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valor deve ser maior que zero' });
    }

    if (amount > 10000) {
      return res.status(400).json({ error: 'Valor máximo por transação: R$ 10.000' });
    }

    const txid = 'DEP' + Date.now() + Math.floor(Math.random() * 1000);

    const deposit = {
      id: uuidv4(),
      user_id: req.user.id,
      amount: Number(amount),
      status: 'pending', // pending | confirmed | rejected
      txid: txid,
      pix_code: generatePixCode({
        amount,
        txid,
        key: process.env.PIX_KEY || 'pix@painelvendasonline.com.br',
        merchantName: process.env.PIX_MERCHANT_NAME,
        merchantCity: process.env.PIX_MERCHANT_CITY
      }),
      created_at: new Date().toISOString(),
      confirmed_at: null
    };

    db.get('deposits').push(deposit).write();

    // Registrar atividade
    Activity.add(
      req.user.id,
      'balance',
      `${req.user.name} solicitou depósito de R$ ${Number(amount).toFixed(2)} via Pix`
    );

    res.status(201).json({ deposit });
  } catch (error) {
    console.error('Erro ao solicitar depósito:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/users/deposits - Listar depósitos do usuário logado
router.get('/deposits', authenticate, (req, res) => {
  try {
    const deposits = db.get('deposits')
      .filter({ user_id: req.user.id })
      .sortBy('created_at')
      .reverse()
      .value();

    res.json({ deposits });
  } catch (error) {
    console.error('Erro ao buscar depósitos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
