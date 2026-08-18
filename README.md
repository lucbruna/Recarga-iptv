# PainelVendasOnline 🚀

Painel de venda de códigos de recarga para IPTV e streaming.

## 📋 Funcionalidades

### Frontend
- ✅ Página de Login/Cadastro com validação
- ✅ Catálogo de produtos com filtros
- ✅ Sistema de compras com validação de saldo/estoque
- ✅ Toast notifications (sem alert() nativo)
- ✅ Design dark theme responsivo
- ✅ Navegação via sidebar

### Backend (Node.js)
- ✅ API REST completa com Express
- ✅ Autenticação JWT
- ✅ CRUD de usuários
- ✅ CRUD de produtos
- ✅ Sistema de pedidos
- ✅ Validação de estoque e saldo
- ✅ Banco de dados JSON (lowdb)

## 🛠️ Tecnologias

### Frontend
- HTML5 / CSS3 / JavaScript vanilla
- Design system customizado (dark theme)

### Backend
- Node.js + Express
- lowdb (banco de dados JSON)
- JWT (autenticação)
- bcryptjs (hash de senhas)

## 📦 Instalação

### 1. Instalar dependências do backend

```bash
cd backend
npm install
```

### 2. Iniciar o servidor

```bash
cd backend
npm start
```

O servidor iniciar em: `http://localhost:3000`

### 3. Acessar o sistema

- **Login:** http://localhost:3000/login.html
- **Compras:** http://localhost:3000/recarga online.html

## 📚 API Endpoints

### Autenticação
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /api/auth/register | Criar conta |
| POST | /api/auth/login | Fazer login |
| GET | /api/auth/me | Dados do usuário logado |

### Produtos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/products | Listar produtos |
| GET | /api/products/:id | Buscar produto |
| GET | /api/products/:id/price | Calcular preço |

### Pedidos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/orders | Meus pedidos |
| POST | /api/orders | Criar pedido |
| POST | /api/orders/:id/cancel | Cancelar pedido |

### Usuário
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/users/profile | Meu perfil |
| PUT | /api/users/profile | Atualizar perfil |
| GET | /api/users/balance | Obter saldo |
| POST | /api/users/deposits | Solicitar depósito via Pix |
| GET | /api/users/deposits | Listar meus depósitos |

## 🔐 Autenticação

Todas as rotas protegidas requerem header:
```
Authorization: Bearer <token>
```

## 📁 Estrutura do Projeto

```
├── login.html              # Página de login/cadastro
├── recarga online.html     # Página principal de compras
├── backend/
│   ├── package.json        # Dependências
│   ├── src/
│   │   ├── server.js       # Servidor Express
│   │   ├── database.js     # Configuração do banco
│   │   ├── seed.js         # Dados iniciais
│   │   ├── middleware/
│   │   │   └── auth.js     # Middleware JWT
│   │   ├── models/
│   │   │   ├── User.js     # Modelo de usuário
│   │   │   ├── Product.js  # Modelo de produto
│   │   │   └── Order.js    # Modelo de pedido
│   │   └── routes/
│   │       ├── auth.js     # Rotas de autenticação
│   │       ├── products.js # Rotas de produtos
│   │       ├── orders.js   # Rotas de pedidos
│   │       └── users.js    # Rotas de usuário
│   └── data/
│       └── db.json         # Banco de dados
```

## 🧪 Testar a API

### Registrar usuário
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste","email":"teste@teste.com","password":"123456"}'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@teste.com","password":"123456"}'
```

### Listar produtos
```bash
curl http://localhost:3000/api/products
```

## 📝 Próximos Passos

- [ ] Integrar gateway de pagamento (Stripe/PagSeguro)
- [ ] Adicionar página "Meus Códigos"
- [ ] Adicionar página "Produtos Comprados"
- [ ] Sistema de notificações por email
- [ ] Painel administrativo completo
- [ ] Deploy em produção

## 📄 Licença

MIT
