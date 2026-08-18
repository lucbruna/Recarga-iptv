// ============================================================
// PIX — gerador estático (fallback dev) + Mercado Pago (Pix dinâmico)
// Padrão copiado do app TS de referência (services/pix.ts).
// ============================================================

// ---------- Gerador de código Pix (BR Code / EMV) — fallback estático ----------
function emvField(id, value) {
  const str = String(value);
  const len = String(str.length).padStart(2, '0');
  return id + len + str;
}

function crc16(payload) {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function generatePixCode({ amount, txid, key, merchantName, merchantCity }) {
  const gui = emvField('00', 'br.gov.bc.pix');
  const keyField = emvField('01', key || '');
  const merchantAccount = emvField('26', gui + keyField);
  const additionalData = emvField('62', emvField('05', (txid || '***').slice(0, 25)));
  let payload =
    emvField('00', '01') +
    emvField('01', '12') +
    merchantAccount +
    emvField('52', '0000') +
    emvField('53', '986') +
    emvField('54', Number(amount).toFixed(2)) +
    emvField('58', 'BR') +
    emvField('59', (merchantName || 'PAINEL VENDAS ONLINE').slice(0, 25)) +
    emvField('60', (merchantCity || 'BRASILIA').slice(0, 15)) +
    additionalData;
  payload += '6304' + crc16(payload + '6304');
  return payload;
}

// ---------- Mercado Pago (Pix dinâmico) ----------
const crypto = require('crypto');
const PIX_EXPIRATION_MINUTES = 60;

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

// Cria um Pix dinâmico no Mercado Pago. Retorna { id, status, qrCode, codigo }.
async function criarPixMp(valor, descricao, payerEmail) {
  const accessToken = process.env['MP_ACCESS_TOKEN'];
  if (!accessToken) {
    const err = new Error('Mercado Pago não configurado. Defina MP_ACCESS_TOKEN no .env.');
    err.code = 'MP_NOT_CONFIGURED';
    throw err;
  }
  const expiresAt = new Date(Date.now() + PIX_EXPIRATION_MINUTES * 60 * 1000).toISOString();
  const url = (process.env['MP_API_URL'] || 'https://api.mercadopago.com') + '/v1/payments';
  const resp = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify({
      transaction_amount: Number(valor),
      description: descricao,
      payment_method_id: 'pix',
      date_of_expiration: expiresAt,
      payer: { email: payerEmail },
    }),
  });
  const dados = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const cause = dados && Array.isArray(dados.cause)
      ? dados.cause.map(item => item.description || item.code).filter(Boolean).join('; ')
      : '';
    const msg = cause || (dados && dados.message) || `Mercado Pago respondeu ${resp.status}`;
    const err = new Error('Erro do Mercado Pago: ' + msg);
    err.code = 'MP_ERROR';
    throw err;
  }
  const td = dados.point_of_interaction && dados.point_of_interaction.transaction_data;
  return {
    id: String(dados.id),
    status: String(dados.status),
    qrCode: td && td.qr_code_base64 ? String(td.qr_code_base64) : '',
    codigo: td && td.qr_code ? String(td.qr_code) : '',
    expiresAt: String(dados.date_of_expiration || expiresAt),
  };
}

// Consulta o status de um pagamento no Mercado Pago.
async function consultarPixMp(id) {
  const accessToken = process.env['MP_ACCESS_TOKEN'];
  if (!accessToken) throw new Error('Mercado Pago não configurado.');
  const url = (process.env['MP_API_URL'] || 'https://api.mercadopago.com') + '/v1/payments/' + encodeURIComponent(id);
  const resp = await fetchWithTimeout(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const dados = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error('Falha ao consultar pagamento no Mercado Pago');
  return { status: String(dados.status) };
}

// Valida a assinatura do webhook do Mercado Pago (x-signature: ts=...,v1=...).
// Sem MP_WEBHOOK_SECRET configurado, não valida (ambiente de dev).
function validarAssinaturaMp(req) {
  const MP_WEBHOOK_SECRET = process.env['MP_WEBHOOK_SECRET'] || '';
  if (!MP_WEBHOOK_SECRET) return true;
  const assinatura = req.headers['x-signature'] || '';
  const m = String(assinatura).match(/ts=(\d+),v1=([0-9a-f]+)/);
  if (!m) return false;
  const [, ts, v1] = m;
  const body = req.body || {};
  const manifest = `id:${body && body.data && body.data.id};request-id:${req.headers['x-request-id'] || ''};ts:${ts};`;
  const esperado = crypto.createHmac('sha256', MP_WEBHOOK_SECRET).update(manifest).digest('hex');
  return !!v1 && crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(esperado));
}

module.exports = { generatePixCode, criarPixMp, consultarPixMp, validarAssinaturaMp };
