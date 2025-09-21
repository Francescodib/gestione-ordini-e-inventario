/**
 * Database Seeding Script - Clean Installation
 * File: src/scripts/seedDatabase.ts
 */

import { sequelize, User, Category, Product, Order, OrderItem, UserRole, ProductStatus, OrderStatus, PaymentStatus } from '../models';
import * as bcrypt from 'bcryptjs';

interface SeedStats {
  users: number;
  categories: number;
  products: number;
  orders: number;
  orderItems: number;
}

const seedDatabase = async (): Promise<SeedStats> => {
  try {
    console.log('🌱 Starting database seeding...');

    // Create additional users
    console.log('👥 Creating users...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    const users = await User.bulkCreate([
      {
        username: 'john_manager',
        email: 'john@example.com',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Smith',
        role: UserRole.MANAGER,
        isActive: true,
        emailVerified: true
      },
      {
        username: 'sarah_user',
        email: 'sarah@example.com',
        password: hashedPassword,
        firstName: 'Sarah',
        lastName: 'Wilson',
        role: UserRole.CLIENT,
        isActive: true,
        emailVerified: true
      },
      {
        username: 'mike_user',
        email: 'mike@example.com',
        password: hashedPassword,
        firstName: 'Mike',
        lastName: 'Johnson',
        role: UserRole.CLIENT,
        isActive: true,
        emailVerified: false
      },
      {
        username: 'anna_admin',
        email: 'anna@example.com',
        password: hashedPassword,
        firstName: 'Anna',
        lastName: 'Davis',
        role: UserRole.ADMIN,
        isActive: true,
        emailVerified: true
      }
    ]);

    // Create categories
    console.log('📂 Creating categories...');
    const categories = await Category.bulkCreate([
      {
        name: 'Elettronica',
        description: 'Dispositivi elettronici e accessori',
        slug: 'elettronica',
        isActive: true,
        sortOrder: 1
      },
      {
        name: 'Abbigliamento',
        description: 'Vestiti e accessori moda',
        slug: 'abbigliamento',
        isActive: true,
        sortOrder: 2
      },
      {
        name: 'Casa e Giardino',
        description: 'Articoli per la casa e il giardino',
        slug: 'casa-giardino',
        isActive: true,
        sortOrder: 3
      },
      {
        name: 'Sport e Tempo Libero',
        description: 'Attrezzature sportive e per il tempo libero',
        slug: 'sport-tempo-libero',
        isActive: true,
        sortOrder: 4
      },
      {
        name: 'Libri e Media',
        description: 'Libri, film e contenuti multimediali',
        slug: 'libri-media',
        isActive: true,
        sortOrder: 5
      }
    ]);

    // Create subcategories
    console.log('📁 Creating subcategories...');
    const subcategories = await Category.bulkCreate([
      {
        name: 'Smartphone',
        description: 'Telefoni cellulari e accessori',
        slug: 'smartphone',
        parentId: categories[0].id,
        isActive: true,
        sortOrder: 1
      },
      {
        name: 'Computer',
        description: 'Computer desktop e laptop',
        slug: 'computer',
        parentId: categories[0].id,
        isActive: true,
        sortOrder: 2
      },
      {
        name: 'Magliette',
        description: 'T-shirt e magliette',
        slug: 'magliette',
        parentId: categories[1].id,
        isActive: true,
        sortOrder: 1
      },
      {
        name: 'Pantaloni',
        description: 'Jeans e pantaloni',
        slug: 'pantaloni',
        parentId: categories[1].id,
        isActive: true,
        sortOrder: 2
      }
    ]);

    // Create products
    console.log('📦 Creating products...');
    const products = await Product.bulkCreate([
      // Electronics
      {
        name: 'iPhone 15 Pro',
        description: 'Ultimo modello di iPhone con tecnologia avanzata',
        sku: 'IPH15PRO-001',
        barcode: '1234567890123',
        categoryId: subcategories[0].id,
        price: 1199.99,
        costPrice: 800.00,
        stock: 25,
        minStock: 5,
        maxStock: 100,
        weight: 0.2,
        tags: 'apple,smartphone,premium',
        status: ProductStatus.ACTIVE,
        supplier: 'Apple Inc.',
        isActive: true
      },
      {
        name: 'Samsung Galaxy S24',
        description: 'Smartphone Android di ultima generazione',
        sku: 'SAM-S24-001',
        barcode: '1234567890124',
        categoryId: subcategories[0].id,
        price: 899.99,
        costPrice: 600.00,
        stock: 30,
        minStock: 5,
        maxStock: 80,
        weight: 0.18,
        tags: 'samsung,android,smartphone',
        status: ProductStatus.ACTIVE,
        supplier: 'Samsung Electronics',
        isActive: true
      },
      {
        name: 'MacBook Air M3',
        description: 'Laptop ultraleggero con chip M3',
        sku: 'MBA-M3-001',
        barcode: '1234567890125',
        categoryId: subcategories[1].id,
        price: 1399.99,
        costPrice: 1000.00,
        stock: 15,
        minStock: 3,
        maxStock: 50,
        weight: 1.24,
        tags: 'apple,laptop,m3',
        status: ProductStatus.ACTIVE,
        supplier: 'Apple Inc.',
        isActive: true
      },
      // Clothing
      {
        name: 'T-Shirt Unisex',
        description: 'Maglietta in cotone organico',
        sku: 'TSHIRT-UNI-001',
        barcode: '1234567890126',
        categoryId: subcategories[2].id,
        price: 19.99,
        costPrice: 8.00,
        stock: 100,
        minStock: 20,
        maxStock: 200,
        weight: 0.15,
        tags: 'cotton,unisex,basic',
        status: ProductStatus.ACTIVE,
        supplier: 'Textile Co.',
        isActive: true
      },
      {
        name: 'Jeans Slim Fit',
        description: 'Jeans elasticizzati slim fit',
        sku: 'JEANS-SF-001',
        barcode: '1234567890127',
        categoryId: subcategories[3].id,
        price: 79.99,
        costPrice: 35.00,
        stock: 50,
        minStock: 10,
        maxStock: 150,
        weight: 0.6,
        tags: 'denim,slim,elastic',
        status: ProductStatus.ACTIVE,
        supplier: 'Denim Factory',
        isActive: true
      },
      // Low stock item
      {
        name: 'Cuffie Wireless Premium',
        description: 'Cuffie wireless con cancellazione rumore',
        sku: 'HEADPH-WL-001',
        barcode: '1234567890128',
        categoryId: subcategories[0].id,
        price: 299.99,
        costPrice: 150.00,
        stock: 3,
        minStock: 5,
        maxStock: 30,
        weight: 0.25,
        tags: 'wireless,premium,noise-cancelling',
        status: ProductStatus.ACTIVE,
        supplier: 'Audio Tech',
        isActive: true
      },
      // Out of stock item
      {
        name: 'Tablet 10 pollici',
        description: 'Tablet Android con display HD',
        sku: 'TAB-10-001',
        barcode: '1234567890129',
        categoryId: subcategories[0].id,
        price: 399.99,
        costPrice: 250.00,
        stock: 0,
        minStock: 5,
        maxStock: 40,
        weight: 0.5,
        tags: 'android,tablet,hd',
        status: ProductStatus.OUT_OF_STOCK,
        supplier: 'Tablet Manufacturer',
        isActive: true
      }
    ]);

    // Create orders
    console.log('📋 Creating orders...');
    const demoUser = await User.findOne({ where: { email: 'demo@demo.com' } });
    if (!demoUser) throw new Error('Demo user not found');

    const orders = [];

    // Order 1 - Completed
    const order1 = await Order.create({
      orderNumber: 'ORD-2024-001',
      userId: demoUser.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      subtotal: 1199.99,
      shippingCost: 9.99,
      taxAmount: 240.00,
      totalAmount: 1449.98,
      currency: 'EUR',
      shippingAddress: JSON.stringify({
        name: 'Demo User',
        street: 'Via Roma 123',
        city: 'Milano',
        postalCode: '20100',
        country: 'Italia'
      }),
      billingAddress: JSON.stringify({
        name: 'Demo User',
        street: 'Via Roma 123',
        city: 'Milano',
        postalCode: '20100',
        country: 'Italia'
      }),
      notes: 'Consegna in orario lavorativo',
      trackingNumber: 'TRK123456789',
      shippedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      deliveredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
    });

    // Order 2 - Pending
    const order2 = await Order.create({
      orderNumber: 'ORD-2024-002',
      userId: users[1].id, // sarah_user
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      subtotal: 99.98,
      shippingCost: 5.99,
      taxAmount: 20.00,
      totalAmount: 125.97,
      currency: 'EUR',
      shippingAddress: JSON.stringify({
        name: 'Sarah Wilson',
        street: 'Corso Buenos Aires 45',
        city: 'Milano',
        postalCode: '20124',
        country: 'Italia'
      }),
      notes: 'Chiamare prima della consegna'
    });

    // Order 3 - Processing
    const order3 = await Order.create({
      orderNumber: 'ORD-2024-003',
      userId: users[2].id, // mike_user
      status: OrderStatus.PROCESSING,
      paymentStatus: PaymentStatus.PAID,
      subtotal: 899.99,
      shippingCost: 0.00,
      taxAmount: 180.00,
      totalAmount: 1079.99,
      currency: 'EUR',
      shippingAddress: JSON.stringify({
        name: 'Mike Johnson',
        street: 'Via Torino 67',
        city: 'Roma',
        postalCode: '00100',
        country: 'Italia'
      }),
      trackingNumber: 'TRK987654321'
    });

    orders.push(order1, order2, order3);

    // Create order items
    console.log('🛒 Creating order items...');
    const orderItems = await OrderItem.bulkCreate([
      // Order 1 items
      {
        orderId: order1.id,
        productId: products[0].id, // iPhone 15 Pro
        name: products[0].name,
        sku: products[0].sku,
        quantity: 1,
        price: products[0].price,
        totalPrice: products[0].price
      },
      // Order 2 items
      {
        orderId: order2.id,
        productId: products[3].id, // T-Shirt
        name: products[3].name,
        sku: products[3].sku,
        quantity: 2,
        price: products[3].price,
        totalPrice: products[3].price * 2
      },
      {
        orderId: order2.id,
        productId: products[4].id, // Jeans
        name: products[4].name,
        sku: products[4].sku,
        quantity: 1,
        price: 59.99, // Discounted price
        totalPrice: 59.99
      },
      // Order 3 items
      {
        orderId: order3.id,
        productId: products[1].id, // Samsung Galaxy
        name: products[1].name,
        sku: products[1].sku,
        quantity: 1,
        price: products[1].price,
        totalPrice: products[1].price
      }
    ]);

    // Update product stock based on orders
    console.log('📊 Updating product stock...');
    await Product.decrement('stock', { where: { id: products[0].id }, by: 1 }); // iPhone
    await Product.decrement('stock', { where: { id: products[3].id }, by: 2 }); // T-Shirt
    await Product.decrement('stock', { where: { id: products[4].id }, by: 1 }); // Jeans
    await Product.decrement('stock', { where: { id: products[1].id }, by: 1 }); // Samsung

    const stats: SeedStats = {
      users: users.length,
      categories: categories.length + subcategories.length,
      products: products.length,
      orders: orders.length,
      orderItems: orderItems.length
    };

    console.log('✅ Database seeding completed successfully!');
    console.log('📊 Seed Statistics:');
    console.log(`   👥 Users created: ${stats.users}`);
    console.log(`   📂 Categories created: ${stats.categories}`);
    console.log(`   📦 Products created: ${stats.products}`);
    console.log(`   📋 Orders created: ${stats.orders}`);
    console.log(`   🛒 Order items created: ${stats.orderItems}`);

    return stats;

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
};

// Run seeding if called directly
if (require.main === module) {
  sequelize.authenticate()
    .then(() => seedDatabase())
    .then(() => {
      console.log('🎉 Seeding process completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

export { seedDatabase };