/**
 * Database Seed Script
 * Popola il database con dati di test per sviluppo e testing
 */

import { sequelize, User, Category, Product, Order, OrderItem, UserRole, ProductStatus, OrderStatus, PaymentStatus } from '../models';
import { Op } from 'sequelize';
import bcrypt from 'bcryptjs';

/**
 * Genera dati utenti di test
 */
async function seedUsers() {
  console.log(' Seeding users...');
  
  const users = [
    {
      username: 'admin',
      email: 'admin@quickstock.com',
      password: await bcrypt.hash('admin123', 12),
      firstName: 'Francesco',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      emailVerified: true,
    },
    {
      username: 'manager',
      email: 'manager@quickstock.com',
      password: await bcrypt.hash('manager123', 12),
      firstName: 'Marco',
      lastName: 'Manager',
      role: UserRole.MANAGER,
      emailVerified: true,
    },
    {
      username: 'user1',
      email: 'user1@example.com',
      password: await bcrypt.hash('user123', 12),
      firstName: 'Giulia',
      lastName: 'Rossi',
      role: UserRole.USER,
      emailVerified: true,
    },
    {
      username: 'user2',
      email: 'user2@example.com',
      password: await bcrypt.hash('user123', 12),
      firstName: 'Luca',
      lastName: 'Bianchi',
      role: UserRole.USER,
      emailVerified: false,
    },
    {
      username: 'customer1',
      email: 'customer1@gmail.com',
      password: await bcrypt.hash('customer123', 12),
      firstName: 'Anna',
      lastName: 'Verdi',
      role: UserRole.USER,
      emailVerified: true,
    }
  ];

  for (const userData of users) {
    await User.findOrCreate({
      where: { email: userData.email },
      defaults: userData,
    });
  }
  
  console.log(`✅ Created ${users.length} users`);
}

/**
 * Genera categorie di prodotti con gerarchia
 */
async function seedCategories() {
  console.log('📂 Seeding categories...');
  
  // Categorie principali
  const mainCategories = [
    {
      name: 'Elettronica',
      description: 'Prodotti elettronici e tecnologici',
      slug: 'elettronica',
    },
    {
      name: 'Abbigliamento',
      description: 'Vestiti e accessori moda',
      slug: 'abbigliamento',
    },
    {
      name: 'Casa e Giardino',
      description: 'Articoli per la casa e il giardino',
      slug: 'casa-giardino',
    },
    {
      name: 'Sport e Tempo Libero',
      description: 'Attrezzature sportive e per il tempo libero',
      slug: 'sport-tempo-libero',
    },
  ];

  const createdMainCategories = [];
  for (const categoryData of mainCategories) {
    const [category] = await Category.findOrCreate({
      where: { slug: categoryData.slug },
      defaults: categoryData,
    });
    createdMainCategories.push(category);
  }

  // Sottocategorie
  const subCategories = [
    // Elettronica
    {
      name: 'Smartphone',
      description: 'Telefoni cellulari e accessori',
      slug: 'smartphone',
      parentId: createdMainCategories[0].id,
    },
    {
      name: 'Computer',
      description: 'PC, laptop e componenti',
      slug: 'computer',
      parentId: createdMainCategories[0].id,
    },
    {
      name: 'Audio',
      description: 'Cuffie, altoparlanti e sistemi audio',
      slug: 'audio',
      parentId: createdMainCategories[0].id,
    },
    // Abbigliamento
    {
      name: 'Uomo',
      description: 'Abbigliamento maschile',
      slug: 'uomo',
      parentId: createdMainCategories[1].id,
    },
    {
      name: 'Donna',
      description: 'Abbigliamento femminile',
      slug: 'donna',
      parentId: createdMainCategories[1].id,
    },
    {
      name: 'Bambini',
      description: 'Abbigliamento per bambini',
      slug: 'bambini',
      parentId: createdMainCategories[1].id,
    },
    // Casa e Giardino
    {
      name: 'Cucina',
      description: 'Elettrodomestici e utensili da cucina',
      slug: 'cucina',
      parentId: createdMainCategories[2].id,
    },
    {
      name: 'Arredamento',
      description: 'Mobili e complementi d\'arredo',
      slug: 'arredamento',
      parentId: createdMainCategories[2].id,
    },
  ];

  for (const categoryData of subCategories) {
    await Category.findOrCreate({
      where: { slug: categoryData.slug },
      defaults: categoryData,
    });
  }
  
  console.log(`✅ Created ${mainCategories.length + subCategories.length} categories`);
}

/**
 * Genera prodotti di inventario
 */
async function seedProducts() {
  console.log('📦 Seeding products...');
  
  // Ottieni le categorie per assegnare i prodotti
  const categories = await Category.findAll();
  const smartphoneCategory = categories.find(c => c.slug === 'smartphone');
  const computerCategory = categories.find(c => c.slug === 'computer');
  const audioCategory = categories.find(c => c.slug === 'audio');
  const uomoCategory = categories.find(c => c.slug === 'uomo');
  const donnaCategory = categories.find(c => c.slug === 'donna');
  const cucinaCategory = categories.find(c => c.slug === 'cucina');

  const products = [
    // Smartphone
    {
      name: 'iPhone 15 Pro',
      description: 'Smartphone Apple con chip A17 Pro e fotocamera avanzata',
      sku: 'IPHONE15PRO128',
      barcode: '1234567890123',
      categoryId: smartphoneCategory?.id || categories[0].id,
      price: 1199.99,
      costPrice: 899.99,
      stock: 25,
      minStock: 5,
      maxStock: 100,
      weight: 187,
      status: ProductStatus.ACTIVE,
    },
    {
      name: 'Samsung Galaxy S24',
      description: 'Smartphone Android con display Dynamic AMOLED 2X',
      sku: 'GALAXY-S24-256',
      barcode: '1234567890124',
      categoryId: smartphoneCategory?.id || categories[0].id,
      price: 899.99,
      costPrice: 699.99,
      stock: 15,
      minStock: 3,
      maxStock: 50,
      weight: 168,
      status: ProductStatus.ACTIVE,
    },
    {
      name: 'Google Pixel 8',
      description: 'Smartphone Google con intelligenza artificiale avanzata',
      sku: 'PIXEL8-128GB',
      barcode: '1234567890125',
      categoryId: smartphoneCategory?.id || categories[0].id,
      price: 699.99,
      costPrice: 499.99,
      stock: 0,
      minStock: 2,
      maxStock: 30,
      weight: 187,
      status: ProductStatus.OUT_OF_STOCK,
    },
    // Computer
    {
      name: 'MacBook Air M3',
      description: 'Laptop Apple con chip M3 e display Liquid Retina',
      sku: 'MBA-M3-13-256',
      barcode: '1234567890126',
      categoryId: computerCategory?.id || categories[0].id,
      price: 1299.99,
      costPrice: 999.99,
      stock: 12,
      minStock: 2,
      maxStock: 25,
      weight: 1240,
      status: ProductStatus.ACTIVE,
    },
    {
      name: 'Dell XPS 13',
      description: 'Ultrabook Windows con processore Intel Core i7',
      sku: 'DELL-XPS13-512',
      barcode: '1234567890127',
      categoryId: computerCategory?.id || categories[0].id,
      price: 1499.99,
      costPrice: 1199.99,
      stock: 8,
      minStock: 1,
      maxStock: 15,
      weight: 1200,
      status: ProductStatus.ACTIVE,
    },
    // Audio
    {
      name: 'AirPods Pro 2',
      description: 'Auricolari wireless con cancellazione attiva del rumore',
      sku: 'AIRPODS-PRO2',
      barcode: '1234567890128',
      categoryId: audioCategory?.id || categories[0].id,
      price: 279.99,
      costPrice: 199.99,
      stock: 45,
      minStock: 10,
      maxStock: 100,
      weight: 50,
      status: ProductStatus.ACTIVE,
    },
    {
      name: 'Sony WH-1000XM5',
      description: 'Cuffie wireless over-ear con cancellazione del rumore',
      sku: 'SONY-WH1000XM5',
      barcode: '1234567890129',
      categoryId: audioCategory?.id || categories[0].id,
      price: 399.99,
      costPrice: 299.99,
      stock: 2,
      minStock: 5,
      maxStock: 50,
      weight: 250,
      status: ProductStatus.ACTIVE,
    },
    // Abbigliamento
    {
      name: 'T-shirt Basic Uomo',
      description: 'Maglietta in cotone 100% per uomo, vari colori',
      sku: 'TSHIRT-UOMO-M',
      categoryId: uomoCategory?.id || categories[1].id,
      price: 19.99,
      costPrice: 8.99,
      stock: 150,
      minStock: 20,
      maxStock: 500,
      weight: 180,
      status: ProductStatus.ACTIVE,
    },
    {
      name: 'Jeans Donna Skinny',
      description: 'Jeans elasticizzati a vita alta per donna',
      sku: 'JEANS-DONNA-28',
      categoryId: donnaCategory?.id || categories[1].id,
      price: 79.99,
      costPrice: 39.99,
      stock: 35,
      minStock: 5,
      maxStock: 200,
      weight: 450,
      status: ProductStatus.ACTIVE,
    },
    // Cucina
    {
      name: 'Macchina del Caffè Espresso',
      description: 'Macchina per caffè espresso automatica con macinacaffè integrato',
      sku: 'COFFEE-MAKER-PRO',
      barcode: '1234567890130',
      categoryId: cucinaCategory?.id || categories[2].id,
      price: 599.99,
      costPrice: 399.99,
      stock: 18,
      minStock: 3,
      maxStock: 40,
      weight: 8500,
      status: ProductStatus.ACTIVE,
    },
  ];

  for (const productData of products) {
    await Product.findOrCreate({
      where: { sku: productData.sku },
      defaults: productData,
    });
  }
  
  console.log(`✅ Created ${products.length} products`);
}

/**
 * Genera ordini di esempio
 */
async function seedOrders() {
  console.log('🛒 Seeding orders...');
  
  // Ottieni utenti e prodotti
  const users = await User.findAll({ where: { role: UserRole.USER } });
  const products = await Product.findAll({ where: { stock: { [Op.gt]: 0 } } });
  
  if (users.length === 0 || products.length === 0) {
    console.log('⚠️ No users or products found for creating orders');
    return;
  }

  const orders = [
    // Ordine 1 - Completato
    {
      userId: users[0].id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      shippingAddress: JSON.stringify({
        firstName: 'Giulia',
        lastName: 'Rossi',
        address1: 'Via Roma 123',
        city: 'Milano',
        state: 'MI',
        postalCode: '20121',
        country: 'Italy',
        phone: '+39 331 1234567'
      }),
      currency: 'EUR',
      shippingCost: 9.99,
      taxAmount: 48.00,
      discountAmount: 0,
      items: [
        {
          productId: products[0].id,
          name: products[0].name,
          sku: products[0].sku,
          quantity: 1,
          price: products[0].price,
          totalPrice: products[0].price,
        },
        {
          productId: products[5].id,
          name: products[5].name,
          sku: products[5].sku,
          quantity: 2,
          price: products[5].price,
          totalPrice: products[5].price * 2,
        }
      ]
    },
    // Ordine 2 - In elaborazione
    {
      userId: users[1].id,
      status: OrderStatus.PROCESSING,
      paymentStatus: PaymentStatus.PAID,
      shippingAddress: JSON.stringify({
        firstName: 'Luca',
        lastName: 'Bianchi',
        address1: 'Corso Buenos Aires 45',
        city: 'Milano',
        state: 'MI',
        postalCode: '20124',
        country: 'Italy',
        phone: '+39 335 9876543'
      }),
      currency: 'EUR',
      shippingCost: 0, // Spedizione gratuita
      taxAmount: 32.18,
      discountAmount: 50.00, // Sconto applicato
      items: [
        {
          productId: products[3].id,
          name: products[3].name,
          sku: products[3].sku,
          quantity: 1,
          price: products[3].price,
          totalPrice: products[3].price,
        }
      ]
    },
    // Ordine 3 - Pendente
    {
      userId: users[2].id,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      shippingAddress: JSON.stringify({
        firstName: 'Anna',
        lastName: 'Verdi',
        address1: 'Via Torino 78',
        city: 'Roma',
        state: 'RM',
        postalCode: '00184',
        country: 'Italy',
        phone: '+39 347 5555555'
      }),
      currency: 'EUR',
      shippingCost: 12.99,
      taxAmount: 17.60,
      discountAmount: 0,
      items: [
        {
          productId: products[7].id,
          name: products[7].name,
          sku: products[7].sku,
          quantity: 3,
          price: products[7].price,
          totalPrice: products[7].price * 3,
        },
        {
          productId: products[8].id,
          name: products[8].name,
          sku: products[8].sku,
          quantity: 1,
          price: products[8].price,
          totalPrice: products[8].price,
        }
      ]
    }
  ];

  for (let i = 0; i < orders.length; i++) {
    const orderData = orders[i];
    // Calcola subtotal
    const subtotal = orderData.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalAmount = subtotal + orderData.shippingCost + orderData.taxAmount - orderData.discountAmount;
    
    // Genera orderNumber manualmente per i dati di seed
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const sequence = (i + 1).toString().padStart(4, '0');
    const orderNumber = `ORD${year}${month}${day}${sequence}`;
    
    const order = await Order.create({
      orderNumber: orderNumber,
      userId: orderData.userId,
      status: orderData.status,
      paymentStatus: orderData.paymentStatus,
      subtotal: subtotal,
      shippingCost: orderData.shippingCost,
      taxAmount: orderData.taxAmount,
      discountAmount: orderData.discountAmount,
      totalAmount: totalAmount,
      currency: orderData.currency,
      shippingAddress: orderData.shippingAddress
    });
    
    // Create order items
    for (const itemData of orderData.items) {
      await OrderItem.create({
        ...itemData,
        orderId: order.id
      });
    }
    
    // Aggiorna stock dei prodotti
    for (const item of orderData.items) {
      const product = await Product.findByPk(item.productId);
      if (product) {
        await product.update({
          stock: product.stock - item.quantity
        });
      }
    }
  }
  
  console.log(`✅ Created ${orders.length} orders`);
}

/**
 * Funzione principale di seed
 */
async function main() {
  console.log('🌱 Starting database seed...');
  
  try {
    // Connessione al database
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Sincronizzazione dei modelli (crea tabelle se non esistono)
    await sequelize.sync({ force: true }); // Use force: true to recreate tables
    console.log('✅ Database synced and tables created');
    
    await seedUsers();
    await seedCategories();
    await seedProducts();
    await seedOrders();
    
    console.log('🎉 Database seeded successfully!');
    
    // Statistiche finali
    const stats = await Promise.all([
      User.count(),
      Category.count(),
      Product.count(),
      Order.count(),
    ]);
    
    console.log('\n📊 Database Statistics:');
    console.log(`👥 Users: ${stats[0]}`);
    console.log(`📂 Categories: ${stats[1]}`);
    console.log(`📦 Products: ${stats[2]}`);
    console.log(`🛒 Orders: ${stats[3]}`);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Esegui seed e gestisci cleanup
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await sequelize.close();
  });
