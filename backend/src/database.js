const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

const adapter = new FileSync(DB_PATH);
const db = low(adapter);

// Estrutura padrão do banco
db.defaults({
  users: [],
  products: [],
  product_tiers: [],
  orders: [],
  codes: [],
  deposits: [],
  tickets: [],
  activities: []
}).write();

// Reconcilia o estoque dos produtos com os códigos REAIS disponíveis.
// Códigos só entram via importação (planilha) — o estoque exibido nunca pode
// ser maior que a quantidade de códigos disponíveis de verdade.
function reconcileStock() {
  const products = db.get('products').value();
  for (const p of products) {
    const available = db.get('codes')
      .filter({ product_id: p.id, status: 'available' })
      .size()
      .value();
    if (p.stock !== available) {
      db.get('products')
        .find({ id: p.id })
        .assign({ stock: available })
        .write();
    }
  }
}

module.exports = db;
module.exports.reconcileStock = reconcileStock;
