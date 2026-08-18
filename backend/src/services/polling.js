// ============================================================
// POLLING DE PAGAMENTOS (funciona sem URL pública)
// Backoff progressivo: falhas consecutivas aumentam o intervalo
// (20s → 40s → 80s → 120s, cap 120s).
// ============================================================
const Order = require('../models/Order');
const { consultarPixMp } = require('../pix');
const { processarPagamentoConfirmado } = require('./pagamentos');

const INTERVALO_POLLING_BASE_MS = 20000;
const INTERVALO_POLLING_MAXIMO_MS = 120000;
let timerChecagem = null;
let falhasChecagemConsecutivas = 0;

function iniciarChecagemPendentes() {
  if (timerChecagem) clearTimeout(timerChecagem);
  const agendar = (atrasoMs) => {
    timerChecagem = setTimeout(async () => {
      let ok = true;
      try {
        const pendentes = Order.findPendingMp();
        for (const pag of pendentes) {
          try {
            const r = await consultarPixMp(pag.mp_payment_id);
            if (r.status === 'approved') await processarPagamentoConfirmado(pag.mp_payment_id);
          } catch {
            /* erro transitório — tenta de novo no próximo ciclo */
          }
        }
      } catch {
        /* banco indisponível momentaneamente */
        ok = false;
      }
      if (ok) {
        falhasChecagemConsecutivas = 0;
        agendar(INTERVALO_POLLING_BASE_MS);
      } else {
        falhasChecagemConsecutivas++;
        const atraso = Math.min(
          INTERVALO_POLLING_BASE_MS * Math.pow(2, falhasChecagemConsecutivas - 1),
          INTERVALO_POLLING_MAXIMO_MS
        );
        agendar(atraso);
      }
    }, atrasoMs);
  };
  agendar(INTERVALO_POLLING_BASE_MS);
}

function pararChecagem() {
  if (timerChecagem) clearTimeout(timerChecagem);
  timerChecagem = null;
  falhasChecagemConsecutivas = 0;
}

module.exports = { iniciarChecagemPendentes, pararChecagem };
