const express = require('express');
const router = express.Router();
const db = require('../database');
const Product = require('../models/Product');
const { authenticate } = require('../middleware/auth');

// GET /api/codes - Listar códigos do usuário logado
router.get('/', authenticate, (req, res) => {
  try {
    // Buscar pedidos do usuário
    const orders = db.get('orders')
      .filter({ user_id: req.user.id })
      .value();

    const orderIds = orders.map(o => o.id);

    // Buscar códigos desses pedidos
    let codes = db.get('codes')
      .filter(c => orderIds.includes(c.order_id))
      .sortBy('created_at')
      .reverse()
      .value();

    // Enriquecer com dados do produto
    codes = codes.map(code => {
      const product = Product.findById(code.product_id);
      return {
        ...code,
        product_name: product ? product.name : 'Produto removido',
        product_period: product ? product.period : '',
        product_badge: product ? product.badge : '',
        product_logo: product ? product.logo : '',
        product_logo_text: product ? product.logo_text : '',
        product_logo_bg: product ? product.logo_bg : ''
      };
    });

    res.json({ codes });
  } catch (error) {
    console.error('Erro ao buscar códigos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;