/**
 * API Client para PainelVendaOnline
 * Integra o frontend com o backend Node.js
 */

const API_BASE = window.location.origin + '/api';

// Estado global da aplicação
const AppState = {
  user: null,
  token: null,
  products: [],
  orders: []
};

// Helper para fazer requisições
async function apiRequest(endpoint, options = {}) {
  const url = API_BASE + endpoint;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  // Adicionar token se existir
  if (AppState.token) {
    headers['Authorization'] = 'Bearer ' + AppState.token;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro na requisição');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// ======== AUTH ========

const Auth = {
  // Registrar
  async register(userData) {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });

    AppState.token = data.token;
    AppState.user = data.user;
    localStorage.setItem('auth_token', data.token);

    return data;
  },

  // Login
  async login(email, password) {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    AppState.token = data.token;
    AppState.user = data.user;
    localStorage.setItem('auth_token', data.token);

    return data;
  },

  // Logout
  logout() {
    AppState.token = null;
    AppState.user = null;
    localStorage.removeItem('auth_token');
  },

  // Verificar se está logado
  async checkAuth() {
    const token = localStorage.getItem('auth_token');
    if (!token) return false;

    AppState.token = token;

    try {
      const data = await apiRequest('/auth/me');
      AppState.user = data.user;
      return true;
    } catch (error) {
      this.logout();
      return false;
    }
  },

  // Obter usuário atual
  getUser() {
    return AppState.user;
  }
};

// ======== PRODUCTS ========

const Products = {
  // Listar todos
  async list(search = '', category = '') {
    let endpoint = '/products?';
    if (search) endpoint += 'search=' + encodeURIComponent(search) + '&';
    if (category) endpoint += 'category=' + encodeURIComponent(category);

    const data = await apiRequest(endpoint);
    AppState.products = data.products;
    return data.products;
  },

  // Buscar por ID
  async get(id) {
    const data = await apiRequest('/products/' + id);
    return data.product;
  },

  // Calcular preço
  async getPrice(productId, quantity) {
    const data = await apiRequest('/products/' + productId + '/price?quantity=' + quantity);
    return data;
  }
};

// ======== ORDERS ========

const Orders = {
  // Listar pedidos do usuário
  async list() {
    const data = await apiRequest('/orders');
    AppState.orders = data.orders;
    return data.orders;
  },

  // Criar pedido
  async create(productId, quantity) {
    const data = await apiRequest('/orders', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, quantity })
    });

    // Atualizar saldo local
    if (AppState.user) {
      AppState.user.balance -= data.order.total_price;
    }

    return data;
  },

  // Buscar pedido por ID
  async get(id) {
    const data = await apiRequest('/orders/' + id);
    return data.order;
  },

  // Cancelar pedido
  async cancel(id) {
    const data = await apiRequest('/orders/' + id + '/cancel', {
      method: 'POST'
    });

    // Atualizar saldo local
    if (AppState.user) {
      AppState.user.balance += data.order.total_price;
    }

    return data;
  }
};

// ======== USERS ========

const Users = {
  // Obter perfil
  async getProfile() {
    const data = await apiRequest('/users/profile');
    AppState.user = data.user;
    return data.user;
  },

  // Atualizar perfil
  async updateProfile(userData) {
    const data = await apiRequest('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(userData)
    });

    AppState.user = data.user;
    return data;
  },

  // Obter saldo
  async getBalance() {
    const data = await apiRequest('/users/balance');
    return data.balance;
  },

  // Solicitar depósito via Pix (saldo só é creditado após confirmação)
  async addBalance(amount) {
    const data = await apiRequest('/users/deposits', {
      method: 'POST',
      body: JSON.stringify({ amount })
    });

    return data;
  }
};

// Exportar para uso global
window.API = {
  Auth,
  Products,
  Orders,
  Users,
  AppState
};
