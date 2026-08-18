const db = require('../database');
const { v4: uuidv4 } = require('uuid');
const User = require('./User');

class Ticket {
  // Buscar todos os tickets (admin)
  static findAll() {
    const tickets = db.get('tickets').sortBy('created_at').reverse().value();

    return tickets.map(ticket => {
      const user = User.findById(ticket.user_id);
      return {
        ...ticket,
        user_name: user ? user.name : 'Desconhecido',
        user_email: user ? user.email : ''
      };
    });
  }

  // Buscar tickets de um usuário
  static findByUserId(userId) {
    return db.get('tickets')
      .filter({ user_id: userId })
      .sortBy('created_at')
      .reverse()
      .value();
  }

  // Buscar ticket por ID
  static findById(id) {
    const ticket = db.get('tickets').find({ id }).value();
    if (!ticket) return null;

    const user = User.findById(ticket.user_id);
    return {
      ...ticket,
      user_name: user ? user.name : 'Desconhecido',
      user_email: user ? user.email : ''
    };
  }

  // Criar novo ticket
  static create(userId, subject, message) {
    const ticket = {
      id: uuidv4(),
      user_id: userId,
      subject: subject || 'Sem assunto',
      message: message || '',
      status: 'open',
      replies: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.get('tickets').push(ticket).write();
    return this.findById(ticket.id);
  }

  // Adicionar resposta ao ticket
  static addReply(ticketId, userId, message, isAdmin) {
    const ticket = db.get('tickets').find({ id: ticketId }).value();
    if (!ticket) throw new Error('Ticket não encontrado');

    const reply = {
      id: uuidv4(),
      message: message,
      from: isAdmin ? 'admin' : 'user',
      created_at: new Date().toISOString()
    };

    db.get('tickets')
      .find({ id: ticketId })
      .assign({
        replies: [...(ticket.replies || []), reply],
        updated_at: new Date().toISOString()
      })
      .write();

    return this.findById(ticketId);
  }

  // Atualizar status do ticket
  static updateStatus(id, status) {
    const ticket = db.get('tickets').find({ id }).value();
    if (!ticket) throw new Error('Ticket não encontrado');

    db.get('tickets')
      .find({ id })
      .assign({
        status: status,
        updated_at: new Date().toISOString()
      })
      .write();

    return this.findById(id);
  }

  // Estatísticas de tickets
  static getStats() {
    const tickets = db.get('tickets').value();
    return {
      total: tickets.length,
      open: tickets.filter(t => t.status === 'open').length,
      closed: tickets.filter(t => t.status === 'closed').length
    };
  }
}

module.exports = Ticket;