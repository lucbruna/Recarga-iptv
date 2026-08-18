const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '..', '.env');

function getMercadoPagoConfig() {
  const token = process.env.MP_ACCESS_TOKEN || '';
  return { access_token_configured: Boolean(token), access_token_hint: token ? `••••${token.slice(-4)}` : '', webhook_secret_configured: Boolean(process.env.MP_WEBHOOK_SECRET) };
}

function updateMercadoPagoConfig({ accessToken, webhookSecret }) {
  const values = {};
  if (accessToken !== undefined) {
    const token = String(accessToken).trim();
    if (!token) throw new Error('O Access Token do Mercado Pago é obrigatório.');
    values.MP_ACCESS_TOKEN = token;
    process.env.MP_ACCESS_TOKEN = token;
  }
  if (webhookSecret !== undefined) {
    values.MP_WEBHOOK_SECRET = String(webhookSecret).trim();
    process.env.MP_WEBHOOK_SECRET = values.MP_WEBHOOK_SECRET;
  }
  if (!Object.keys(values).length) throw new Error('Nenhuma configuração foi informada.');
  const current = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
  const lines = current.split(/\r?\n/).filter(line => !Object.prototype.hasOwnProperty.call(values, line.split('=')[0].trim()) && line);
  for (const [key, value] of Object.entries(values)) lines.push(`${key}=${value}`);
  fs.writeFileSync(ENV_PATH, `${lines.join('\n')}\n`, { encoding: 'utf8', mode: 0o600 });
  return getMercadoPagoConfig();
}

module.exports = { getMercadoPagoConfig, updateMercadoPagoConfig };
