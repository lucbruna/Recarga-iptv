const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Activity = require('../models/Activity');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/orders - Listar pedidos do usuário
router.get('/', authenticate, (req, res) => {
  try {
    const orders = Order.findByUserId(req.user.id);
    res.json({ orders });
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/orders/admin - Listar todos os pedidos (admin)
router.get('/admin', authenticate, requireAdmin, (req, res) => {
  try {
    const { limit } = req.query;
    const orders = Order.findAll(parseInt(limit) || 100);
    res.json({ orders });
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/orders/stats - Estatísticas (admin)
router.get('/stats', authenticate, requireAdmin, (req, res) => {
  try {
    const stats = Order.getStats();
    res.json({ stats });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/orders/:id - Buscar pedido por ID
router.get('/:id', authenticate, (req, res) => {
  try {
    const order = Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    // Verificar se pertence ao usuário (ou é admin)
    if (order.user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    res.json({ order });
  } catch (error) {
    console.error('Erro ao buscar pedido:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/orders - Criar novo pedido
router.post('/', authenticate, (req, res) => {
  try {
    const { product_id, quantity } = req.body;

    // Validações
    if (!product_id || !quantity || quantity < 1) {
      return res.status(400).json({ error: 'produto_id e quantity são obrigatórios' });
    }

    if (quantity > 100) {
      return res.status(400).json({ error: 'Quantidade máxima por pedido: 100' });
    }

    // Criar pedido
    const order = Order.create(req.user.id, product_id, quantity);

    // Registrar atividade
    const product = Product.findById(product_id);
    Activity.add(
      req.user.id,
      'purchase',
      `${req.user.name} comprou ${quantity}x ${product ? product.name : 'produto'}`
    );

    res.status(201).json({
      message: 'Pedido realizado com sucesso',
      order,
      codes: order.codes
    });
  } catch (error) {
    if (error.message.includes('insuficiente') || error.message.includes('não encontrado')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Erro ao criar pedido:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/orders/checkout - Criar pedido pendente e gerar Pix (varejo)
router.post('/checkout', authenticate, async (req, res) => {
  try {
    const { product_id, quantity } = req.body;

    if (!product_id || !quantity || quantity < 1) {
      return res.status(400).json({ error: 'product_id e quantity são obrigatórios' });
    }
    if (quantity > 100) {
      return res.status(400).json({ error: 'Quantidade máxima por pedido: 100' });
    }

    const order = await Order.createCheckout(req.user.id, product_id, quantity);

    res.status(201).json({
      message: 'Pedido criado. Aguardando pagamento via Pix.',
      order
    });
  } catch (error) {
    if (error.message === 'fetch failed') {
      return res.status(503).json({ error: 'Não foi possível conectar ao Mercado Pago. Verifique a conexão HTTPS do servidor e tente novamente.' });
    }
    if (error.code === 'MP_NOT_CONFIGURED') {
      return res.status(503).json({ error: 'Mercado Pago não configurado. Informe o Access Token nas Configurações do administrador.' });
    }
    if (error.code === 'MP_ERROR') {
      return res.status(502).json({ error: error.message });
    }
    if (error.message.includes('insuficiente') || error.message.includes('não encontrado')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Erro ao criar checkout:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/orders/:id/confirm-payment - Confirmação manual (suporte/admin).
// Em produção a entrega dos códigos é feita pelo webhook/polling do Mercado Pago
// (que verifica o pagamento antes de entregar). O frontend do usuário NÃO chama isso.
router.post('/:id/confirm-payment', authenticate, requireAdmin, (req, res) => {
  return res.status(410).json({ error: 'A confirmação manual foi desativada. O código é liberado somente após aprovação confirmada pelo Mercado Pago.' });
  try {
    const order = Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }
    if (order.user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const updated = Order.confirmPayment(req.params.id);
    const product = Product.findById(order.product_id);
    Activity.add(
      req.user.id,
      'purchase',
      `${req.user.name} comprou ${order.quantity}x ${product ? product.name : 'produto'}`
    );

    res.json({
      message: 'Pagamento confirmado. Código enviado!',
      order: updated,
      codes: updated.codes
    });
  } catch (error) {
    if (error.message.includes('não encontrado') || error.message.includes('insuficiente') || error.message.includes('não pode ser confirmado')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Erro ao confirmar pagamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/orders/:id/cancel - Cancelar pedido
router.post('/:id/cancel', authenticate, (req, res) => {
  try {
    const order = Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    // Verificar se pertence ao usuário (ou é admin)
    if (order.user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const updatedOrder = Order.cancel(req.params.id);

    res.json({
      message: 'Pedido cancelado com sucesso',
      order: updatedOrder
    });
  } catch (error) {
    if (error.message.includes('não encontrado') || error.message.includes('já foi cancelado')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Erro ao cancelar pedido:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
