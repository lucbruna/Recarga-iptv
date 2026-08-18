const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/products - Listar todos os produtos
router.get('/', (req, res) => {
  try {
    const { search, category } = req.query;

    let products;

    if (search) {
      products = Product.search(search);
    } else {
      products = Product.findAll();
    }

    // Filtrar por categoria se especificado
    if (category) {
      products = products.filter(p =>
        p.name.toLowerCase().includes(category.toLowerCase())
      );
    }

    res.json({ products });
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/products/:id - Buscar produto por ID
router.get('/:id', (req, res) => {
  try {
    const product = Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    res.json({ product });
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/products/:id/price - Calcular preço para quantidade
router.get('/:id/price', (req, res) => {
  try {
    const { quantity } = req.query;
    const qty = parseInt(quantity) || 1;

    const product = Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    const unitPrice = Product.getPrice(product.id, qty);
    const total = unitPrice * qty;

    res.json({
      product_id: product.id,
      quantity: qty,
      unit_price: unitPrice,
      total_price: total,
      in_stock: product.stock >= qty,
      available_stock: product.stock
    });
  } catch (error) {
    console.error('Erro ao calcular preço:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/products - Criar produto (admin)
router.post('/', authenticate, requireAdmin, (req, res) => {
  try {
    const product = Product.create(req.body);
    res.status(201).json({ product });
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/products/:id - Atualizar produto (admin)
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const product = Product.update(req.params.id, req.body);

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    res.json({ product });
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/products/:id - Deletar produto (admin)
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const product = Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    Product.delete(req.params.id);
    res.json({ message: 'Produto removido com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
