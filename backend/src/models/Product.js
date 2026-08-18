const db = require('../database');

class Product {
  // Buscar todos os produtos com seus tiers
  static findAll() {
    const products = db.get('products').value();
    return products.map(p => ({
      ...p,
      tiers: this.getTiers(p.id)
    }));
  }

  // Buscar produto por ID com tiers
  static findById(id) {
    const product = db.get('products').find({ id: Number(id) }).value();
    if (!product) return null;

    return {
      ...product,
      tiers: this.getTiers(product.id)
    };
  }

  // Buscar tiers de um produto
  static getTiers(productId) {
    return db.get('product_tiers')
      .filter({ product_id: Number(productId) })
      .sortBy('min_qty')
      .value();
  }

  // Buscar preço baseado na quantidade
  static getPrice(productId, quantity) {
    const tiers = this.getTiers(productId);
    if (!tiers.length) return null;

    // Encontrar o tier adequado (maior min_qty <= quantity)
    let selectedTier = tiers[0];
    for (const tier of tiers) {
      if (quantity >= tier.min_qty) {
        selectedTier = tier;
      }
    }

    return selectedTier ? selectedTier.price : null;
  }

  // Verificar estoque
  static checkStock(productId, quantity) {
    const product = this.findById(productId);
    if (!product) return false;
    return product.stock >= quantity;
  }

  // Decrementar estoque (após compra)
  static decrementStock(productId, quantity) {
    const product = this.findById(productId);
    if (!product || product.stock < quantity) {
      throw new Error('Estoque insuficiente');
    }

    db.get('products')
      .find({ id: Number(productId) })
      .assign({
        stock: product.stock - quantity,
        updated_at: new Date().toISOString()
      })
      .write();

    return this.findById(productId);
  }

  // Incrementar estoque (após importação de códigos)
  static incrementStock(productId, quantity) {
    const product = this.findById(productId);
    if (!product) {
      throw new Error('Produto não encontrado');
    }

    db.get('products')
      .find({ id: Number(productId) })
      .assign({
        stock: product.stock + quantity,
        updated_at: new Date().toISOString()
      })
      .write();

    return this.findById(productId);
  }

  // Criar produto (admin)
  static create(productData) {
    const { name, period, badge, sub, stock, logo, logo_text, logo_bg, tiers } = productData;

    // Gerar próximo ID
    const lastProduct = db.get('products').maxBy('id').value();
    const nextId = lastProduct ? lastProduct.id + 1 : 1;

    const product = {
      id: nextId,
      name,
      period,
      badge: badge || '',
      sub: sub || '',
      stock: stock || 0,
      logo: logo || '',
      logo_text: logo_text || '',
      logo_bg: logo_bg || '#333',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.get('products').push(product).write();

    // Inserir tiers
    if (tiers && tiers.length > 0) {
      for (const tier of tiers) {
        db.get('product_tiers').push({
          id: db.get('product_tiers').maxBy('id').value()?.id + 1 || 1,
          product_id: product.id,
          label: tier.label,
          min_qty: tier.min_qty,
          price: tier.price
        }).write();
      }
    }

    return this.findById(product.id);
  }

  // Atualizar produto (admin)
  static update(id, productData) {
    const { name, period, badge, sub, stock, logo, logo_text, logo_bg, tiers } = productData;

    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (period !== undefined) updates.period = period;
    if (badge !== undefined) updates.badge = badge;
    if (sub !== undefined) updates.sub = sub;
    if (stock !== undefined) updates.stock = stock;
    if (logo !== undefined) updates.logo = logo;
    if (logo_text !== undefined) updates.logo_text = logo_text;
    if (logo_bg !== undefined) updates.logo_bg = logo_bg;

    db.get('products')
      .find({ id: Number(id) })
      .assign(updates)
      .write();

    // Substituir tiers se informados
    if (Array.isArray(tiers)) {
      db.get('product_tiers').remove({ product_id: Number(id) }).write();
      let nextTierId = db.get('product_tiers').maxBy('id').value()?.id || 0;
      for (const tier of tiers) {
        if (tier && tier.label !== undefined && tier.min_qty !== undefined && tier.price !== undefined) {
          db.get('product_tiers').push({
            id: ++nextTierId,
            product_id: Number(id),
            label: String(tier.label),
            min_qty: Number(tier.min_qty),
            price: Number(tier.price)
          }).write();
        }
      }
    }

    return this.findById(id);
  }

  // Deletar produto (admin)
  static delete(id) {
    db.get('products').remove({ id: Number(id) }).write();
    db.get('product_tiers').remove({ product_id: Number(id) }).write();
  }

  // Buscar por categoria/nome
  static search(query) {
    const q = query.toLowerCase();
    const products = db.get('products').value();

    return products
      .filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.badge && p.badge.toLowerCase().includes(q))
      )
      .map(p => ({
        ...p,
        tiers: this.getTiers(p.id)
      }));
  }
}

module.exports = Product;
