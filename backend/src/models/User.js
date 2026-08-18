const db = require('../database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class User {
  // Buscar todos os usuários
  static findAll() {
    return db.get('users').sortBy('created_at').reverse().value();
  }

  // Buscar usuário por ID
  static findById(id) {
    return db.get('users').find({ id }).value();
  }

  // Buscar usuário por email
  static findByEmail(email) {
    return db.get('users').find({ email: email.toLowerCase() }).value();
  }

  // Criar novo usuário
  static async create(userData) {
    const { name, email, password, contact, contact_type = 'whatsapp' } = userData;

    // Verificar se email já existe
    const existing = this.findByEmail(email);
    if (existing) {
      throw new Error('Email já está cadastrado');
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = {
      id: uuidv4(),
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      contact: contact || '',
      contact_type,
      balance: 0,
      is_activated: false,
      is_admin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.get('users').push(user).write();

    return this.findById(user.id);
  }

  // Login
  static async authenticate(email, password) {
    const user = this.findByEmail(email);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      throw new Error('Senha incorreta');
    }

    // Retornar sem a senha
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Atualizar saldo
  static updateBalance(id, amount) {
    const user = this.findById(id);
    if (!user) return null;

    const newBalance = Math.max(0, user.balance + amount);

    db.get('users')
      .find({ id })
      .assign({
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .write();

    return this.findById(id);
  }

  // Obter saldo
  static getBalance(id) {
    const user = this.findById(id);
    return user ? user.balance : 0;
  }

  // Ativar/desativar usuário
  static setActivated(id, isActivated) {
    const user = this.findById(id);
    if (!user) return null;

    db.get('users')
      .find({ id })
      .assign({
        is_activated: !!isActivated,
        updated_at: new Date().toISOString()
      })
      .write();

    return this.findById(id);
  }

  // Atualizar dados do usuário
  static update(id, userData) {
    const { name, contact, contact_type } = userData;

    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (contact !== undefined) updates.contact = contact;
    if (contact_type !== undefined) updates.contact_type = contact_type;

    db.get('users')
      .find({ id })
      .assign(updates)
      .write();

    return this.findById(id);
  }
}

module.exports = User;
