const express = require('express');
const router = express.Router();
const db = require('../database');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Ticket = require('../models/Ticket');
const Activity = require('../models/Activity');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getMercadoPagoConfig, updateMercadoPagoConfig } = require('../payment-config');

// Todas as rotas de admin exigem autenticação + permissão de admin
router.use(authenticate, requireAdmin);

// O token nunca é devolvido ao navegador; apenas o estado e os últimos quatro caracteres.
router.get('/payment-config', (req, res) => {
  res.json({ mercado_pago: getMercadoPagoConfig() });
});

router.put('/payment-config', (req, res) => {
  try {
    const mercadoPago = updateMercadoPagoConfig({
      accessToken: req.body.access_token,
      webhookSecret: req.body.webhook_secret
    });
    Activity.add(req.user.id, 'admin', 'Atualizou a configuração do Mercado Pago');
    res.json({ message: 'Configuração do Mercado Pago salva.', mercado_pago: mercadoPago });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/admin/stats - Estatísticas do painel
router.get('/stats', (req, res) => {
  try {
    const stats = Activity.getStats();
    const orderStats = Order.getStats();
    const ticketStats = Ticket.getStats();

    res.json({
      stats: {
        ...stats,
        ...orderStats,
        open_tickets: ticketStats.open,
        total_tickets: ticketStats.total
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/admin/users - Listar todos os usuários
router.get('/users', (req, res) => {
  try {
    const { search, status } = req.query;

    let users = User.findAll().map(user => {
      const orders = Order.findByUserId(user.id);
      const { password, ...userWithoutPassword } = user;
      return {
        ...userWithoutPassword,
        orders_count: orders.length,
        total_spent: orders
          .filter(o => o.status === 'completed')
          .reduce((sum, o) => sum + o.total_price, 0)
      };
    });

    if (search) {
      const q = search.toLowerCase();
      users = users.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.contact || '').toLowerCase().includes(q)
      );
    }

    if (status === 'active') users = users.filter(u => u.is_activated);
    if (status === 'inactive') users = users.filter(u => !u.is_activated);

    res.json({ users });
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/admin/users/:id/activate - Ativar/desativar usuário
router.post('/users/:id/activate', (req, res) => {
  try {
    const { is_activated } = req.body;

    const user = User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const activated = is_activated !== false;
    const updatedUser = User.setActivated(req.params.id, activated);

    Activity.add(
      req.user.id,
      'admin',
      `${activated ? 'Ativou a conta de' : 'Desativou a conta de'} ${user.name}`
    );

    const { password, ...userWithoutPassword } = updatedUser;
    res.json({
      message: activated ? 'Usuário ativado com sucesso' : 'Usuário desativado',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Erro ao ativar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/admin/users/:id/balance - Ajustar saldo do usuário
router.post('/users/:id/balance', (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: 'Valor inválido' });
    }

    const user = User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const updatedUser = User.updateBalance(req.params.id, Number(amount));

    Activity.add(
      req.user.id,
      'admin',
      `Ajustou saldo de ${user.name}: ${amount > 0 ? '+' : ''}R$ ${Number(amount).toFixed(2)}`
    );

    const { password, ...userWithoutPassword } = updatedUser;
    res.json({
      message: 'Saldo ajustado com sucesso',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Erro ao ajustar saldo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/admin/activity - Atividades recentes
router.get('/activity', (req, res) => {
  try {
    const activities = Activity.getRecent(parseInt(req.query.limit) || 50);
    res.json({ activities });
  } catch (error) {
    console.error('Erro ao buscar atividades:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/admin/orders - Todos os pedidos (via Order.findAll)
router.get('/orders', (req, res) => {
  try {
    const { limit } = req.query;
    const orders = Order.findAll(parseInt(limit) || 100);
    res.json({ orders });
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/admin/deposits - Listar todos os depósitos (pendentes primeiro)
router.get('/deposits', (req, res) => {
  try {
    const deposits = db.get('deposits')
      .sortBy('created_at')
      .reverse()
      .value()
      .map(d => {
        const user = User.findById(d.user_id);
        return { ...d, user_name: user ? user.name : 'Desconhecido' };
      })
      .sort((a, b) => {
        const order = { pending: 0, confirmed: 1, rejected: 2 };
        return (order[a.status] || 3) - (order[b.status] || 3);
      });

    res.json({ deposits });
  } catch (error) {
    console.error('Erro ao buscar depósitos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/admin/deposits/:id/confirm - Confirmar depósito e creditar saldo
router.post('/deposits/:id/confirm', (req, res) => {
  try {
    const deposit = db.get('deposits').find({ id: req.params.id }).value();

    if (!deposit) {
      return res.status(404).json({ error: 'Depósito não encontrado' });
    }

    if (deposit.status !== 'pending') {
      return res.status(400).json({ error: 'Depósito já processado' });
    }

    db.get('deposits')
      .find({ id: deposit.id })
      .assign({
        status: 'confirmed',
        confirmed_at: new Date().toISOString()
      })
      .write();

    const updatedUser = User.updateBalance(deposit.user_id, deposit.amount);
    const user = User.findById(deposit.user_id);

    Activity.add(
      req.user.id,
      'admin',
      `Confirmou depósito de R$ ${Number(deposit.amount).toFixed(2)} de ${user ? user.name : 'usuário'}`
    );

    res.json({
      message: 'Depósito confirmado e saldo creditado',
      deposit: db.get('deposits').find({ id: deposit.id }).value(),
      balance: updatedUser.balance
    });
  } catch (error) {
    console.error('Erro ao confirmar depósito:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/admin/deposits/:id/reject - Rejeitar depósito
router.post('/deposits/:id/reject', (req, res) => {
  try {
    const deposit = db.get('deposits').find({ id: req.params.id }).value();

    if (!deposit) {
      return res.status(404).json({ error: 'Depósito não encontrado' });
    }

    if (deposit.status !== 'pending') {
      return res.status(400).json({ error: 'Depósito já processado' });
    }

    db.get('deposits')
      .find({ id: deposit.id })
      .assign({
        status: 'rejected',
        confirmed_at: new Date().toISOString()
      })
      .write();

    res.json({
      message: 'Depósito rejeitado',
      deposit: db.get('deposits').find({ id: deposit.id }).value()
    });
  } catch (error) {
    console.error('Erro ao rejeitar depósito:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/admin/codes - Listar códigos (filtros: product_id, status)
router.get('/codes', (req, res) => {
  try {
    const { product_id, status } = req.query;

    let codes = db.get('codes').value();

    if (product_id) {
      codes = codes.filter(c => c.product_id === Number(product_id));
    }
    if (status) {
      codes = codes.filter(c => c.status === status);
    }

    codes = codes
      .sort((a, b) => b.id - a.id)
      .map(c => {
        const product = Product.findById(c.product_id);
        return {
          ...c,
          product_name: product ? product.name : 'Produto removido'
        };
      });

    res.json({ codes });
  } catch (error) {
    console.error('Erro ao buscar códigos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/admin/codes/import - Importar códigos em lote (planilha)
router.post('/codes/import', (req, res) => {
  try {
    const { product_id, codes } = req.body;

    if (!product_id) {
      return res.status(400).json({ error: 'product_id é obrigatório' });
    }

    const product = Product.findById(product_id);
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    if (!Array.isArray(codes) || codes.length === 0) {
      return res.status(400).json({ error: 'Nenhum código informado' });
    }

    // Normalizar e deduplicar
    const existing = new Set(
      db.get('codes').value().map(c => c.code.toUpperCase())
    );

    const seen = new Set();
    let imported = 0;
    let duplicates = 0;
    let invalid = 0;

    for (const raw of codes) {
      const code = String(raw || '').trim().toUpperCase();
      if (!code) { invalid++; continue; }
      if (seen.has(code) || existing.has(code)) { duplicates++; continue; }
      seen.add(code);
      existing.add(code);

      db.get('codes').push({
        id: (db.get('codes').maxBy('id').value()?.id || 0) + 1,
        product_id: Number(product_id),
        code,
        status: 'available',
        order_id: null,
        created_at: new Date().toISOString(),
        used_at: null
      }).write();
      imported++;
    }

    if (imported > 0) {
      Product.incrementStock(Number(product_id), imported);
    }

    Activity.add(
      req.user.id,
      'admin',
      `Importou ${imported} código(s) para ${product.name}`
    );

    res.json({
      imported,
      duplicates,
      invalid,
      product: Product.findById(product_id)
    });
  } catch (error) {
    console.error('Erro ao importar códigos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/admin/codes/:id - Remover código
router.delete('/codes/:id', (req, res) => {
  try {
    const code = db.get('codes').find({ id: Number(req.params.id) }).value();

    if (!code) {
      return res.status(404).json({ error: 'Código não encontrado' });
    }

    db.get('codes').remove({ id: code.id }).write();

    if (code.status === 'available') {
      Product.decrementStock(code.product_id, 1);
    }

    res.json({ message: 'Código removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover código:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
