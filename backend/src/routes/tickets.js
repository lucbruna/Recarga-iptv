const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/tickets - Listar tickets do usuário logado
router.get('/', authenticate, (req, res) => {
  try {
    const tickets = Ticket.findByUserId(req.user.id);
    res.json({ tickets });
  } catch (error) {
    console.error('Erro ao buscar tickets:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/tickets/admin - Listar todos os tickets (admin)
router.get('/admin', authenticate, requireAdmin, (req, res) => {
  try {
    const { status } = req.query;
    let tickets = Ticket.findAll();
    if (status) {
      tickets = tickets.filter(t => t.status === status);
    }
    res.json({ tickets });
  } catch (error) {
    console.error('Erro ao buscar tickets:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/tickets/stats - Estatísticas de tickets (admin)
router.get('/stats', authenticate, requireAdmin, (req, res) => {
  try {
    const stats = Ticket.getStats();
    res.json({ stats });
  } catch (error) {
    console.error('Erro ao buscar stats de tickets:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/tickets/:id - Buscar ticket por ID
router.get('/:id', authenticate, (req, res) => {
  try {
    const ticket = Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado' });
    }

    if (ticket.user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    res.json({ ticket });
  } catch (error) {
    console.error('Erro ao buscar ticket:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/tickets - Criar novo ticket
router.post('/', authenticate, (req, res) => {
  try {
    const { subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Assunto e mensagem são obrigatórios' });
    }

    const ticket = Ticket.create(req.user.id, subject, message);

    res.status(201).json({
      message: 'Ticket criado com sucesso',
      ticket
    });
  } catch (error) {
    console.error('Erro ao criar ticket:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/tickets/:id/reply - Responder ticket
router.post('/:id/reply', authenticate, (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    const ticket = Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado' });
    }

    if (ticket.user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const isAdmin = !!req.user.is_admin;
    const updatedTicket = Ticket.addReply(req.params.id, req.user.id, message, isAdmin);

    res.json({
      message: 'Resposta enviada',
      ticket: updatedTicket
    });
  } catch (error) {
    if (error.message.includes('não encontrado')) {
      return res.status(404).json({ error: error.message });
    }
    console.error('Erro ao responder ticket:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/tickets/:id/status - Alterar status (admin)
router.post('/:id/status', authenticate, requireAdmin, (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !['open', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const ticket = Ticket.updateStatus(req.params.id, status);

    res.json({
      message: 'Status atualizado',
      ticket
    });
  } catch (error) {
    if (error.message.includes('não encontrado')) {
      return res.status(404).json({ error: error.message });
    }
    console.error('Erro ao atualizar status do ticket:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;