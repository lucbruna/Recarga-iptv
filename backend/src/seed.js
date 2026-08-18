const db = require('./database');

function seedDatabase() {
  console.log('🌱 Populando banco de dados...');

  // Estoque é sempre reconciliado com os códigos REAIS disponíveis.
  // Códigos entram apenas via importação (planilha), nunca são gerados aqui.
  db.reconcileStock();

  // Verificar se já existem produtos
  const existingProducts = db.get('products').value();
  if (existingProducts.length > 0) {
    console.log('✅ Banco já populado, pulando seed.');
    return;
  }

  // Produtos iniciais — preços de referência (valores reais do painel)
  // stock inicia em 0: o estoque passa a existir quando códigos são importados por planilha
  const products = [
    {
      name: 'TV Express Mensal',
      period: '30 Dias',
      badge: 'MENSAL',
      sub: 'Cartão de Recarga • 16 dígitos',
      features: ['Ao vivo', 'Full HD', 'OTT', 'Limite de sessão: 1-1-1'],
      stock: 0,
      logo: '/logos/tvexpress.png',
      logo_text: 'TV Express',
      logo_bg: '#1a2233',
      tiers: [
        { label: '1 qtd', min_qty: 1, price: 25.00 },
        { label: '≥5 qtd', min_qty: 5, price: 23.00 },
        { label: '≥10 qtd', min_qty: 10, price: 22.00 },
        { label: '≥50 qtd', min_qty: 50, price: 20.00 }
      ]
    },
    {
      name: 'TV Express Anual',
      period: '365 Dias',
      badge: 'ANUAL',
      sub: 'Cartão de Recarga • 16 dígitos',
      features: ['Ao vivo', 'Full HD', 'OTT', 'Limite de sessão: 1-1-1'],
      stock: 0,
      logo: '/logos/tvexpress.png',
      logo_text: 'TV Express',
      logo_bg: '#1a2233',
      tiers: [
        { label: '1 qtd', min_qty: 1, price: 240.00 },
        { label: '≥5 qtd', min_qty: 5, price: 230.00 },
        { label: '≥10 qtd', min_qty: 10, price: 210.00 },
        { label: '≥50 qtd', min_qty: 50, price: 195.00 }
      ]
    },
    {
      name: 'FlixxCine Mensal',
      period: '30 Dias',
      badge: 'MENSAL',
      sub: 'Cartão de Recarga • 16 dígitos',
      features: ['Ao vivo', 'Full HD', 'OTT', 'Limite de sessão: 1-1-1'],
      stock: 0,
      logo: '/logos/flixxcine.png',
      logo_text: 'FlixxCine',
      logo_bg: '#3d2a00',
      tiers: [
        { label: '1 qtd', min_qty: 1, price: 22.00 },
        { label: '≥5 qtd', min_qty: 5, price: 21.01 },
        { label: '≥10 qtd', min_qty: 10, price: 19.00 },
        { label: '≥50 qtd', min_qty: 50, price: 18.00 }
      ]
    },
    {
      name: 'FlixxCine Anual',
      period: '365 Dias',
      badge: 'ANUAL',
      sub: 'Cartão de Recarga • 16 dígitos',
      features: ['Ao vivo', 'Full HD', 'OTT', 'Limite de sessão: 1-1-1'],
      stock: 0,
      logo: '/logos/flixxcine.png',
      logo_text: 'FlixxCine',
      logo_bg: '#3d2a00',
      tiers: [
        { label: '1 qtd', min_qty: 1, price: 125.00 },
        { label: '≥5 qtd', min_qty: 5, price: 122.00 },
        { label: '≥10 qtd', min_qty: 10, price: 115.00 }
      ]
    },
    {
      name: 'Nexa TV Mensal',
      period: '30 Dias',
      badge: 'MENSAL',
      sub: 'Cartão de Recarga • 16 dígitos',
      features: ['Ao vivo', 'Full HD', 'OTT', 'Limite de sessão: 1-1-1'],
      stock: 0,
      logo: '/logos/nexatv.webp',
      logo_text: 'Nexa TV',
      logo_bg: '#1f2937',
      tiers: [
        { label: '1 qtd', min_qty: 1, price: 25.00 },
        { label: '≥5 qtd', min_qty: 5, price: 24.00 },
        { label: '≥10 qtd', min_qty: 10, price: 23.50 },
        { label: '≥50 qtd', min_qty: 50, price: 19.00 }
      ]
    },
    {
      name: 'Nexa TV Anual',
      period: '365 Dias',
      badge: 'ANUAL',
      sub: 'Cartão de Recarga • 16 dígitos',
      features: ['Ao vivo', 'Full HD', 'OTT', 'Limite de sessão: 1-1-1'],
      stock: 0,
      logo: '/logos/nexatv.webp',
      logo_text: 'Nexa TV',
      logo_bg: '#1f2937',
      tiers: [
        { label: '1 qtd', min_qty: 1, price: 144.00 },
        { label: '≥5 qtd', min_qty: 5, price: 134.00 },
        { label: '≥10 qtd', min_qty: 10, price: 126.00 }
      ]
    },
    {
      name: 'Redplay Mensal',
      period: '30 Dias',
      badge: 'MENSAL',
      sub: 'Cartão de Recarga • 16 dígitos',
      features: ['Ao vivo', 'Full HD', 'OTT', 'Limite de sessão: 1-1-1'],
      stock: 0,
      logo: '/logos/redplay.jpg',
      logo_text: 'Redplay',
      logo_bg: '#3a0a0a',
      tiers: [
        { label: '1 qtd', min_qty: 1, price: 28.00 },
        { label: '≥5 qtd', min_qty: 5, price: 26.00 },
        { label: '≥10 qtd', min_qty: 10, price: 24.00 },
        { label: '≥50 qtd', min_qty: 50, price: 22.00 }
      ]
    },
    {
      name: 'Redplay Anual',
      period: '365 Dias',
      badge: 'ANUAL',
      sub: 'Cartão de Recarga • 16 dígitos',
      features: ['Ao vivo', 'Full HD', 'OTT', 'Limite de sessão: 1-1-1'],
      stock: 0,
      logo: '/logos/redplay.jpg',
      logo_text: 'Redplay',
      logo_bg: '#3a0a0a',
      tiers: [
        { label: '1 qtd', min_qty: 1, price: 220.00 },
        { label: '≥5 qtd', min_qty: 5, price: 200.00 },
        { label: '≥10 qtd', min_qty: 10, price: 190.00 }
      ]
    },
    {
      name: 'UniTV Mensal',
      period: '30 Dias',
      badge: 'MENSAL',
      sub: 'Cartão de Recarga • 16 dígitos',
      features: ['Ao vivo', 'Full HD', 'OTT', 'Limite de sessão: 1-1-1'],
      stock: 0,
      logo: '/logos/unitv.png',
      logo_text: 'UniTV',
      logo_bg: '#1a3322',
      tiers: [
        { label: '1 qtd', min_qty: 1, price: 22.00 },
        { label: '≥5 qtd', min_qty: 5, price: 21.00 },
        { label: '≥10 qtd', min_qty: 10, price: 20.00 },
        { label: '≥50 qtd', min_qty: 50, price: 18.50 }
      ]
    },
    {
      name: 'UniTV Anual',
      period: '365 Dias',
      badge: 'ANUAL',
      sub: 'Cartão de Recarga • 16 dígitos',
      features: ['Ao vivo', 'Full HD', 'OTT', 'Limite de sessão: 1-1-1'],
      stock: 0,
      logo: '/logos/unitv.png',
      logo_text: 'UniTV',
      logo_bg: '#1a3322',
      tiers: [
        { label: '1 qtd', min_qty: 1, price: 135.00 },
        { label: '≥5 qtd', min_qty: 5, price: 121.00 },
        { label: '≥10 qtd', min_qty: 10, price: 110.00 }
      ]
    },
    {
      name: 'YouCine Mensal',
      period: '30 Dias',
      badge: 'MENSAL',
      sub: 'Cartão de Recarga • 16 dígitos',
      features: ['Ao vivo', '4K', 'OTT', 'Limite de sessão: 2-1-1'],
      stock: 0,
      logo: '/logos/youcine.jpg',
      logo_text: 'YouCine',
      logo_bg: '#332211',
      tiers: [
        { label: '1 qtd', min_qty: 1, price: 27.00 },
        { label: '≥5 qtd', min_qty: 5, price: 25.00 },
        { label: '≥10 qtd', min_qty: 10, price: 23.00 },
        { label: '≥50 qtd', min_qty: 50, price: 21.00 }
      ]
    },
    {
      name: 'YouCine Anual',
      period: '365 Dias',
      badge: 'ANUAL',
      sub: 'Cartão de Recarga • 16 dígitos',
      features: ['Ao vivo', '4K', 'OTT', 'Limite de sessão: 2-1-1'],
      stock: 0,
      logo: '/logos/youcine.jpg',
      logo_text: 'YouCine',
      logo_bg: '#332211',
      tiers: [
        { label: '1 qtd', min_qty: 1, price: 155.00 },
        { label: '≥5 qtd', min_qty: 5, price: 143.00 },
        { label: '≥10 qtd', min_qty: 10, price: 132.00 }
      ]
    },
    {
      name: 'NexoCine Mensal',
      period: '30 Dias',
      badge: 'MENSAL',
      sub: 'Cartão de Recarga • 16 dígitos',
      features: ['Ao vivo', 'Full HD', 'OTT', 'Limite de sessão: 1-1-1'],
      stock: 0,
      logo: '/logos/nexocine.webp',
      logo_text: 'NexoCine',
      logo_bg: '#1f2937',
      tiers: [
        { label: '1 qtd', min_qty: 1, price: 22.00 },
        { label: '≥5 qtd', min_qty: 5, price: 21.00 },
        { label: '≥10 qtd', min_qty: 10, price: 19.00 },
        { label: '≥50 qtd', min_qty: 50, price: 17.00 }
      ]
    },
    {
      name: 'NexoCine Anual',
      period: '365 Dias',
      badge: 'ANUAL',
      sub: 'Cartão de Recarga • 16 dígitos',
      features: ['Ao vivo', 'Full HD', 'OTT', 'Limite de sessão: 1-1-1'],
      stock: 0,
      logo: '/logos/nexocine.webp',
      logo_text: 'NexoCine',
      logo_bg: '#1f2937',
      tiers: [
        { label: '1 qtd', min_qty: 1, price: 119.00 },
        { label: '≥5 qtd', min_qty: 5, price: 106.00 },
        { label: '≥10 qtd', min_qty: 10, price: 99.00 }
      ]
    },
    {
      name: 'Alpha Play Mensal',
      period: '30 Dias',
      badge: 'MENSAL',
      sub: 'Cartão de Recarga • 16 dígitos',
      features: ['Ao vivo', 'Full HD', 'OTT', 'Limite de sessão: 1-1-1'],
      stock: 0,
      logo: '/logos/alphaplay.jpg',
      logo_text: 'Alpha Play',
      logo_bg: '#312e81',
      tiers: [
        { label: '1 qtd', min_qty: 1, price: 23.00 },
        { label: '≥5 qtd', min_qty: 5, price: 21.00 },
        { label: '≥10 qtd', min_qty: 10, price: 19.00 },
        { label: '≥50 qtd', min_qty: 50, price: 17.00 }
      ]
    },
    {
      name: 'Alpha Play Anual',
      period: '365 Dias',
      badge: 'ANUAL',
      sub: 'Cartão de Recarga • 16 dígitos',
      features: ['Ao vivo', 'Full HD', 'OTT', 'Limite de sessão: 1-1-1'],
      stock: 0,
      logo: '/logos/alphaplay.jpg',
      logo_text: 'Alpha Play',
      logo_bg: '#312e81',
      tiers: [
        { label: '1 qtd', min_qty: 1, price: 125.00 },
        { label: '≥5 qtd', min_qty: 5, price: 117.00 },
        { label: '≥10 qtd', min_qty: 10, price: 110.00 }
      ]
    },
    {
      name: 'UniCine Mensal',
      period: '30 Dias',
      badge: 'MENSAL',
      sub: 'Cartão de Recarga • 16 dígitos',
      features: ['Ao vivo', 'Full HD', 'OTT', 'Limite de sessão: 1-1-1'],
      stock: 0,
      logo: '/logos/unicine.webp',
      logo_text: 'UniCine',
      logo_bg: '#1a3322',
      tiers: [
        { label: '1 qtd', min_qty: 1, price: 22.00 },
        { label: '≥5 qtd', min_qty: 5, price: 20.50 },
        { label: '≥10 qtd', min_qty: 10, price: 19.00 },
        { label: '≥50 qtd', min_qty: 50, price: 17.00 }
      ]
    },
    {
      name: 'UniCine Anual',
      period: '365 Dias',
      badge: 'ANUAL',
      sub: 'Cartão de Recarga • 16 dígitos',
      features: ['Ao vivo', 'Full HD', 'OTT', 'Limite de sessão: 1-1-1'],
      stock: 0,
      logo: '/logos/unicine.webp',
      logo_text: 'UniCine',
      logo_bg: '#1a3322',
      tiers: [
        { label: '1 qtd', min_qty: 1, price: 143.00 },
        { label: '≥5 qtd', min_qty: 5, price: 132.00 },
        { label: '≥10 qtd', min_qty: 10, price: 127.00 }
      ]
    }
  ];

  let nextProductId = 1;
  let nextTierId = 1;

  for (const product of products) {
    // Criar produto
    db.get('products').push({
      id: nextProductId,
      name: product.name,
      period: product.period,
      badge: product.badge,
      sub: product.sub,
      features: product.features,
      stock: product.stock,
      logo: product.logo,
      logo_text: product.logo_text,
      logo_bg: product.logo_bg,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).write();

    // Criar tiers
    for (const tier of product.tiers) {
      db.get('product_tiers').push({
        id: nextTierId++,
        product_id: nextProductId,
        label: tier.label,
        min_qty: tier.min_qty,
        price: tier.price
      }).write();
    }

    nextProductId++;
  }

  console.log(`✅ ${products.length} produtos inseridos com sucesso!`);
}

module.exports = seedDatabase;
