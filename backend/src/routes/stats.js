const express = require('express');
const router = express.Router();
const Activity = require('../models/Activity');

// GET /api/stats - Estatísticas públicas (dashboard do revendedor)
router.get('/stats', (req, res) => {
  try {
    const stats = Activity.getStats();

    res.json({
      stats: {
        vendedores_ativos: stats.vendedores_ativos,
        total_users: stats.total_users,
        codigos_gerados_hoje: stats.codigos_gerados_hoje,
        codigos_gerados_semana: stats.codigos_gerados_semana
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/activity - Atividades recentes (público)
router.get('/activity', (req, res) => {
  try {
    const activities = Activity.getRecent(20).map(a => ({
      user_name: a.user_name,
      type: a.type,
      description: a.description,
      created_at: a.created_at
    }));

    res.json({ activities });
  } catch (error) {
    console.error('Erro ao buscar atividades:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;