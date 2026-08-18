// ============================================================
// PAGAMENTOS — confirmação de pedidos APÓS verificação do Mercado Pago.
// Esta é a ÚNICA porta de entrada para entregar códigos. É chamada
// apenas pelo webhook (com validação de assinatura) ou pelo polling.
// O frontend do usuário NUNCA chama isso diretamente.
// ============================================================
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Activity = require('../models/Activity');
const { consultarPixMp } = require('../pix');

// Confirma o pagamento de um pedido após verificar no Mercado Pago.
// Retorna o pedido atualizado ou null se não confirmado.
async function processarPagamentoConfirmado(mpPaymentId) {
  const order = Order.findByMpPaymentId(mpPaymentId);
  if (!order) {
    console.log('[MP] Pedido pendente não encontrado para pagamento', mpPaymentId);
    return null;
  }
  if (order.status === 'completed') return order; // idempotente

  // Sem credencial não existe confirmação local/de desenvolvimento.
  if (!process.env.MP_ACCESS_TOKEN) {
    console.error('[MP] Confirmação recusada: MP_ACCESS_TOKEN não configurado.');
    return null;
  }

  const accessToken = process.env['MP_ACCESS_TOKEN'];
  if (accessToken) {
    // Produção: confirma SÓ se o Mercado Pago aprovar.
    try {
      const r = await consultarPixMp(mpPaymentId);
      if (r.status !== 'approved') {
        console.log('[MP] Pagamento', mpPaymentId, 'ainda não aprovado:', r.status);
        return null;
      }
    } catch (e) {
      console.error('[MP] Erro ao consultar pagamento', mpPaymentId, '-', e.message);
      return null;
    }
  } else {
    // Dev: sem token, confirma direto (sem verificação real do MP).
    console.warn('[MP] Sem MP_ACCESS_TOKEN — confirmando pedido', order.id, 'direto (modo dev).');
  }

  const updated = Order.confirmPayment(order.id);
  const product = Product.findById(order.product_id);
  const user = User.findById(order.user_id);
  Activity.add(
    order.user_id,
    'purchase',
    `${user ? user.name : 'usuário'} comprou ${order.quantity}x ${product ? product.name : 'produto'} (Pix confirmado)`
  );
  console.log('[MP] Pedido', order.id, 'confirmado e códigos entregues.');
  return updated;
}

module.exports = { processarPagamentoConfirmado };
