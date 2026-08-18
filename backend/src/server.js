const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Carregar variáveis do .env manualmente (zero dependências)
try {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(line => {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (m && m[1] && !(m[1] in process.env)) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    });
    console.log('🌱 Variáveis de ambiente carregadas do .env');
  }
} catch (e) {
  console.warn('Não foi possível carregar .env:', e.message);
}

// Importar rotas
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');
const ticketRoutes = require('./routes/tickets');
const adminRoutes = require('./routes/admin');
const codeRoutes = require('./routes/codes');
const statsRoutes = require('./routes/stats');
const webhookRoutes = require('./routes/webhooks');

// Importar seed
const seedDatabase = require('./seed');
const { iniciarChecagemPendentes } = require('./services/polling');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'file://'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de log
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Servir arquivos estáticos (frontend)
app.use(express.static(path.join(__dirname, '..', '..')));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/codes', codeRoutes);
app.use('/api', statsRoutes);
app.use('/api/webhooks', webhookRoutes);

// Rota de health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Rota para servir o frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'login.html'));
});

// Middleware de erro 404
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Middleware de erro global
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Iniciar servidor
function startServer() {
  // Popular banco de dados
  seedDatabase();

  // Iniciar verificação de pagamentos pendentes (webhook + polling)
  iniciarChecagemPendentes();

  app.listen(PORT, () => {
    console.log('');
    console.log('🚀 ============================================');
    console.log('   PainelVendaOnline - Backend rodando!');
    console.log('🚀 ============================================');
    console.log('');
    console.log(`📡 API:        http://localhost:${PORT}/api`);
    console.log(`🌐 Frontend:   http://localhost:${PORT}`);
    console.log(`💾 Health:     http://localhost:${PORT}/api/health`);
    console.log('');
    console.log('📚 Endpoints disponíveis:');
    console.log('   POST   /api/auth/register    - Criar conta');
    console.log('   POST   /api/auth/login       - Fazer login');
    console.log('   GET    /api/auth/me           - Dados do usuário');
    console.log('   GET    /api/products          - Listar produtos');
    console.log('   GET    /api/products/:id      - Produto específico');
    console.log('   POST   /api/orders            - Criar pedido');
    console.log('   GET    /api/orders            - Meus pedidos');
    console.log('   GET    /api/codes             - Meus códigos');
    console.log('   GET    /api/users/profile     - Meu perfil');
    console.log('   PUT    /api/users/profile     - Atualizar perfil');
    console.log('   POST   /api/users/deposits    - Solicitar depósito Pix');
    console.log('   POST   /api/users/activate    - Ativar conta');
    console.log('   GET    /api/tickets           - Meus tickets');
    console.log('   POST   /api/tickets           - Criar ticket');
    console.log('   GET    /api/admin/stats       - Stats (admin)');
    console.log('   GET    /api/admin/users       - Usuários (admin)');
    console.log('   GET    /api/admin/activity    - Atividades (admin)');
    console.log('   GET    /api/stats             - Stats públicos');
    console.log('   GET    /api/activity          - Atividades públicas');
    console.log('');
  });
}

startServer();

module.exports = app;
