const db = require('../database');
const { v4: uuidv4 } = require('uuid');
const User = require('./User');

class Activity {
  // Registrar nova atividade
  static add(userId, type, description) {
    const user = User.findById(userId);

    const activity = {
      id: uuidv4(),
      user_id: userId,
      user_name: user ? user.name : 'Desconhecido',
      type: type, // 'balance' | 'purchase' | 'register' | 'activate' | 'admin'
      description: description || '',
      created_at: new Date().toISOString()
    };

    db.get('activities').push(activity).write();

    // Manter apenas as últimas 200 atividades
    const all = db.get('activities').value();
    if (all.length > 200) {
      db.set('activities', all.slice(all.length - 200)).write();
    }

    return activity;
  }

  // Buscar atividades recentes
  static getRecent(limit = 50) {
    return db.get('activities')
      .sortBy('created_at')
      .reverse()
      .take(limit)
      .value();
  }

  // Estatísticas do painel (dashboard)
  static getStats() {
    const users = db.get('users').value();
    const codes = db.get('codes').value();
    const orders = db.get('orders').filter({ status: 'completed' }).value();

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString();

    const codesToday = codes.filter(c => c.created_at >= startOfDay).length;
    const codesWeek = codes.filter(c => c.created_at >= startOfWeek).length;

    const totalRevenue = orders.reduce((sum, o) => sum + o.total_price, 0);

    return {
      vendedores_ativos: users.filter(u => u.is_activated).length,
      total_users: users.length,
      codigos_gerados_hoje: codesToday,
      codigos_gerados_semana: codesWeek,
      total_orders: orders.length,
      total_revenue: totalRevenue
    };
  }
}

module.exports = Activity;