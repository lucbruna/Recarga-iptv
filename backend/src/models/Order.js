const db = require('../database');
const { v4: uuidv4 } = require('uuid');
const Product = require('./Product');
const User = require('./User');
const { generatePixCode, criarPixMp } = require('../pix');

class Order {
  // Buscar todos os pedidos (admin)
  static findAll(limit = 100) {
    const orders = db.get('orders').sortBy('created_at').reverse().take(limit).value();

    return orders.map(order => {
      const user = User.findById(order.user_id);
      const product = Product.findById(order.product_id);

      return {
        ...order,
        user_name: user ? user.name : 'Desconhecido',
        user_email: user ? user.email : '',
        product_name: product ? product.name : 'Produto removido',
        product_period: product ? product.period : '',
        pix_code: order.pix_code,
        pix_qr: order.pix_qr,
        mp_payment_id: order.mp_payment_id,
        mp_enabled: order.mp_enabled,
        codes: this.getOrderCodes(order.id)
      };
    });
  }

  // Buscar pedidos de um usuário
  static findByUserId(userId) {
    const orders = db.get('orders')
      .filter({ user_id: userId })
      .sortBy('created_at')
      .reverse()
      .value();

    return orders.map(order => {
      const product = Product.findById(order.product_id);

      return {
        ...order,
        product_name: product ? product.name : 'Produto removido',
        product_period: product ? product.period : '',
        product_badge: product ? product.badge : '',
        product_logo: product ? product.logo : '',
        product_logo_text: product ? product.logo_text : '',
        product_logo_bg: product ? product.logo_bg : '',
        pix_code: order.pix_code,
        pix_qr: order.pix_qr,
        mp_payment_id: order.mp_payment_id,
        mp_enabled: order.mp_enabled,
        codes: this.getOrderCodes(order.id)
      };
    });
  }

  // Buscar pedido por ID
  static findById(id) {
    const order = db.get('orders').find({ id }).value();
    if (!order) return null;

    const user = User.findById(order.user_id);
    const product = Product.findById(order.product_id);

    return {
      ...order,
      user_name: user ? user.name : 'Desconhecido',
      user_email: user ? user.email : '',
      product_name: product ? product.name : 'Produto removido',
      product_period: product ? product.period : '',
      pix_code: order.pix_code,
      pix_txid: order.pix_txid,
      pix_qr: order.pix_qr,
      mp_payment_id: order.mp_payment_id,
      mp_enabled: order.mp_enabled,
      codes: this.getOrderCodes(order.id)
    };
  }

  // Criar novo pedido
  static create(userId, productId, quantity) {
    const user = User.findById(userId);
    if (!user) throw new Error('Usuário não encontrado');

    const product = Product.findById(productId);
    if (!product) throw new Error('Produto não encontrado');

    // Verificar estoque
    if (product.stock < quantity) {
      throw new Error('Estoque insuficiente');
    }

    // Obter preço
    const unitPrice = Product.getPrice(productId, quantity);
    if (!unitPrice) throw new Error('Preço não encontrado');

    const totalPrice = unitPrice * quantity;

    // Verificar saldo
    if (user.balance < totalPrice) {
      throw new Error('Saldo insuficiente');
    }

    const orderId = uuidv4();

    // Atribuir códigos reais disponíveis do estoque
    const available = db.get('codes')
      .filter({ product_id: Number(productId), status: 'available' })
      .take(quantity)
      .value();

    if (available.length < quantity) {
      throw new Error('Estoque insuficiente');
    }

    const codes = [];
    available.forEach((c) => {
      db.get('codes').find({ id: c.id }).assign({
        status: 'sold',
        order_id: orderId,
        used_at: new Date().toISOString()
      }).write();
      codes.push(c.code);
    });

    // Criar pedido
    const order = {
      id: orderId,
      user_id: userId,
      product_id: Number(productId),
      quantity: quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.get('orders').push(order).write();

    // Debitar saldo do usuário
    User.updateBalance(userId, -totalPrice);

    // Decrementar estoque
    Product.decrementStock(productId, quantity);

    return this.findById(orderId);
  }

  // Criar pedido pendente de pagamento (varejo) — gera Pix (Mercado Pago se configurado),
  // não debita saldo nem entrega código. O código só é entregue após confirmação do MP.
  static async createCheckout(userId, productId, quantity) {
    const user = User.findById(userId);
    if (!user) throw new Error('Usuário não encontrado');

    const product = Product.findById(productId);
    if (!product) throw new Error('Produto não encontrado');

    if (product.stock < quantity) {
      throw new Error('Estoque insuficiente');
    }

    const unitPrice = Product.getPrice(productId, quantity);
    if (!unitPrice) throw new Error('Preço não encontrado');

    const totalPrice = unitPrice * quantity;

    if (!process.env.MP_ACCESS_TOKEN) {
      const error = new Error('Mercado Pago não configurado. Informe o Access Token nas Configurações do administrador.');
      error.code = 'MP_NOT_CONFIGURED';
      throw error;
    }

    const orderId = uuidv4();
    const txid = uuidv4().replace(/-/g, '').substring(0, 25);

    let pixCode = '';
    let pixQr = '';
    let mpPaymentId = null;
    let mpEnabled = false;

    try {
      const mp = await criarPixMp(totalPrice, `Pedido ${orderId} - ${product.name}`, user.email);
      mpPaymentId = mp.id;
      pixQr = mp.qrCode;
      pixCode = mp.codigo;
      mpEnabled = true;
    } catch (e) {
      // Nunca gere um Pix estático: sem pagamento rastreável não há venda.
      throw e;
      if (e.code === 'MP_NOT_CONFIGURED') {
        // Fallback dev: Pix estático (não verificável pelo Mercado Pago).
        pixCode = generatePixCode({
          amount: totalPrice,
          txid: txid,
          key: process.env.PIX_KEY || '',
          merchantName: process.env.PIX_MERCHANT_NAME || 'PAINEL VENDAS ONLINE',
          merchantCity: process.env.PIX_MERCHANT_CITY || 'BRASILIA'
        });
        // Em dev, usa o txid como mp_payment_id placeholder para permitir confirmação via webhook.
        mpPaymentId = txid;
        mpEnabled = false;
        console.warn('[PIX] Mercado Pago não configurado — usando Pix estático (dev). Defina MP_ACCESS_TOKEN no .env para verificação real.');
      } else {
        throw e; // erro real do Mercado Pago (ex.: credencial inválida)
      }
    }

    const order = {
      id: orderId,
      user_id: userId,
      product_id: Number(productId),
      quantity: quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      status: 'pending_payment',
      payment_status: 'pending',
      pix_txid: txid,
      pix_code: pixCode,
      pix_qr: pixQr,
      pix_expires_at: mp.expiresAt,
      mp_payment_id: mpPaymentId,
      mp_enabled: mpEnabled,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.get('orders').push(order).write();

    return this.findById(orderId);
  }

  // Confirmar pagamento de um pedido pendente — atribui códigos reais e conclui a venda
  static confirmPayment(orderId) {
    const order = db.get('orders').find({ id: orderId }).value();
    if (!order) throw new Error('Pedido não encontrado');
    if (order.status === 'completed') return this.findById(orderId);
    if (order.status !== 'pending_payment') throw new Error('Pedido não pode ser confirmado');

    const available = db.get('codes')
      .filter({ product_id: Number(order.product_id), status: 'available' })
      .take(order.quantity)
      .value();

    if (available.length < order.quantity) {
      throw new Error('Estoque insuficiente para concluir a venda');
    }

    available.forEach((c) => {
      db.get('codes').find({ id: c.id }).assign({
        status: 'sold',
        order_id: orderId,
        used_at: new Date().toISOString()
      }).write();
    });

    db.get('orders').find({ id: orderId }).assign({
      status: 'completed',
      payment_status: 'paid',
      updated_at: new Date().toISOString()
    }).write();

    Product.decrementStock(order.product_id, order.quantity);

    return this.findById(orderId);
  }

  // Buscar pedido pendente pelo id de pagamento do Mercado Pago (usado pelo webhook/polling)
  static findByMpPaymentId(mpId) {
    const order = db.get('orders').find({ mp_payment_id: mpId, status: 'pending_payment' }).value();
    return order ? this.findById(order.id) : null;
  }

  // Listar pedidos pendentes que possuem id de pagamento MP (para o polling consultar)
  static findPendingMp() {
    const orders = db.get('orders')
      .filter({ status: 'pending_payment' })
      .filter(o => !!o.mp_payment_id)
      .value();
    return orders.map(o => this.findById(o.id));
  }

  // Obter códigos de um pedido
  static getOrderCodes(orderId) {
    return db.get('codes')
      .filter({ order_id: orderId })
      .sortBy('id')
      .value();
  }

  // Estatísticas (admin)
  static getStats() {
    const orders = db.get('orders')
      .filter({ status: 'completed' })
      .value();

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.total_price, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Pedidos das últimas 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentOrders = orders.filter(o => o.created_at >= oneDayAgo);

    return {
      total_orders: totalOrders,
      total_revenue: totalRevenue,
      avg_order_value: avgOrderValue,
      orders_last_24h: recentOrders.length
    };
  }

  // Cancelar pedido
  static cancel(id) {
    const currentOrder = db.get('orders').find({ id }).value();
    if (!currentOrder) throw new Error('Pedido não encontrado');
    if (currentOrder.status === 'cancelled') throw new Error('Pedido já foi cancelado');
    if (currentOrder.status !== 'pending_payment') {
      throw new Error('Pedidos pagos não podem ser cancelados automaticamente. Faça o reembolso antes de alterar a venda.');
    }
    db.get('orders').find({ id }).assign({
      status: 'cancelled',
      updated_at: new Date().toISOString()
    }).write();
    return this.findById(id);

    const order = db.get('orders').find({ id }).value();
    if (!order) throw new Error('Pedido não encontrado');

    if (order.status === 'cancelled') {
      throw new Error('Pedido já foi cancelado');
    }

    // Restaurar saldo
    User.updateBalance(order.user_id, order.total_price);

    // Restaurar estoque
    const product = Product.findById(order.product_id);
    if (product) {
      db.get('products')
        .find({ id: order.product_id })
        .assign({ stock: product.stock + order.quantity })
        .write();
    }

    // Atualizar status
    db.get('orders')
      .find({ id })
      .assign({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .write();

    // Liberar códigos
    db.get('codes')
      .filter({ order_id: id })
      .each(code => {
        code.status = 'available';
        code.order_id = null;
        code.used_at = null;
      })
      .write();

    return this.findById(id);
  }
}

module.exports = Order;
