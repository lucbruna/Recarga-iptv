const express = require('express');
const router = express.Router();
const db = require('../database');
const User = require('../models/User');
const Activity = require('../models/Activity');
const { validarAssinaturaMp } = require('../pix');
const { processarPagamentoConfirmado } = require('../services/pagamentos');

// Webhook do Mercado Pago (confirmação de Pix de pedidos)
// URL a configurar no MP: POST <PUBLIC_URL>/api/webhooks/mercadopago
router.post('/mercadopago', async (req, res) => {
  // Valida a assinatura (se MP_WEBHOOK_SECRET estiver configurado)
  if (!validarAssinaturaMp(req)) {
    return res.status(401).json({ erro: 'Assinatura inválida.' });
  }

  const body = req.body || {};
  // MP envia { id: notificationId, data: { id: paymentId } }
  const id = (body.data && body.data.id)
    ? body.data.id
    : (body.resource ? String(body.resource).split('/').pop() : null);
  if (!id) return res.status(400).json({ erro: 'Payload inválido.' });

  // Responde rápido para o MP não reenviar; processa em seguida
  res.status(200).json({ received: true });

  try {
    await processarPagamentoConfirmado(String(id));
  } catch (e) {
    console.error('[MP] Erro ao processar webhook:', e.message);
  }
});

// Webhook de depósitos (mantido para compatibilidade; "add credits" foi removido da UI)
router.post('/deposits', (req, res) => {
  // Este endpoint não possui identificação verificável do provedor de pagamento.
  // Nunca credite saldo com base em um payload público não autenticado.
  return res.status(410).json({ erro: 'Webhook de depósitos desativado. Use uma integração de pagamento com validação no provedor.' });
  try {
    const body = req.body || {};
    const ref = body.external_reference || (body.data && body.data.id);
    if (ref) {
      const deposit = db.get('deposits').find({ txid: ref }).value();
      if (deposit && deposit.status === 'pending') {
        db.get('deposits').find({ id: deposit.id }).assign({
          status: 'confirmed',
          confirmed_at: new Date().toISOString()
        }).write();
        User.updateBalance(deposit.user_id, deposit.amount);
        const user = User.findById(deposit.user_id);
        Activity.add(deposit.user_id, 'balance', `Depósito de R$ ${deposit.amount.toFixed(2)} confirmado via webhook`);
      }
    }
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Erro no webhook de depósito:', err);
    res.status(200).json({ received: true });
  }
});

module.exports = router;
