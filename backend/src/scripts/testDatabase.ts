/**
 * Script di test per verificare la connessione al database e i modelli Sequelize
 * src/scripts/testDatabase.ts
 */

import { sequelize } from '../config/sequelize';
import { User, UserRole, Category, Product, ProductStatus, Order, OrderStatus, PaymentStatus, OrderItem } from '../models';

/**
 * Funzione per testare la connessione e i modelli
 */
async function testDatabase() {
  try {
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Sync models (create tables if they don't exist)
    await sequelize.sync({ force: true });
    console.log('✅ Database models synchronized');

    console.log('🧪 Starting database tests...');

    // Test 1: Creazione utente di test
    console.log('\n1️⃣ Testing User model...');
    const savedUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.CLIENT
    });
    console.log('✅ User created:', savedUser.username, 'ID:', savedUser.id);

    // Test 2: Creazione categoria di test
    console.log('\n2️⃣ Testing Category model...');
    const savedCategory = await Category.create({
      name: 'Office Supplies',
      description: 'General office supplies and equipment',
      slug: 'office-supplies'
    });
    console.log('✅ Category created:', savedCategory.name, 'ID:', savedCategory.id);

    // Test 3: Creazione prodotto di test
    console.log('\n3️⃣ Testing Product model...');
    const savedProduct = await Product.create({
      name: 'Wireless Mouse',
      description: 'High-quality wireless optical mouse',
      sku: 'WM001',
      barcode: '1234567890123',
      categoryId: savedCategory.id,
      price: 29.99,
      costPrice: 15.00,
      stock: 100,
      minStock: 10,
      status: ProductStatus.ACTIVE,
      images: JSON.stringify(['mouse1.jpg', 'mouse2.jpg']),
      tags: JSON.stringify(['electronics', 'computer', 'wireless'])
    });
    console.log('✅ Product created:', savedProduct.name, 'SKU:', savedProduct.sku);

    // Test 4: Creazione ordine di test
    console.log('\n4️⃣ Testing Order model...');
    const savedOrder = await Order.create({
      userId: savedUser.id,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      total: 59.98,
      subtotal: 59.98,
      tax: 0,
      shipping: 0,
      shippingAddress: JSON.stringify({
        firstName: 'Test',
        lastName: 'User',
        address1: '123 Test St',
        city: 'Test City',
        state: 'TS',
        postalCode: '12345',
        country: 'US'
      })
    });
    console.log('✅ Order created:', savedOrder.id, 'Total:', savedOrder.total);

    // Test 5: Creazione item ordine
    console.log('\n5️⃣ Testing OrderItem model...');
    const savedOrderItem = await OrderItem.create({
      orderId: savedOrder.id,
      productId: savedProduct.id,
      quantity: 2,
      unitPrice: savedProduct.price,
      total: savedProduct.price * 2
    });
    console.log('✅ OrderItem created:', savedOrderItem.quantity, 'x', savedProduct.name);

    // Test 6: Query di test
    console.log('\n6️⃣ Testing queries...');
    const userCount = await User.count();
    const productCount = await Product.count();
    const categoryCount = await Category.count();
    const orderCount = await Order.count();

    console.log('📊 Database statistics:');
    console.log('  - Users:', userCount);
    console.log('  - Products:', productCount);
    console.log('  - Categories:', categoryCount);
    console.log('  - Orders:', orderCount);

    // Test 7: Test relazioni
    console.log('\n7️⃣ Testing relationships...');
    const userWithOrders = await User.findByPk(savedUser.id, {
      include: ['orders']
    });

    const productWithCategory = await Product.findByPk(savedProduct.id, {
      include: ['category']
    });

    const orderWithItems = await Order.findByPk(savedOrder.id, {
      include: ['items']
    });

    console.log('✅ User orders loaded:', userWithOrders?.orders?.length || 0);
    console.log('✅ Product category loaded:', productWithCategory?.category?.name || 'None');
    console.log('✅ Order items loaded:', orderWithItems?.items?.length || 0);

    // Cleanup - Delete test data
    console.log('\n🧹 Cleaning up test data...');
    await OrderItem.destroy({ where: { orderId: savedOrder.id } });
    await Order.destroy({ where: { id: savedOrder.id } });
    await Product.destroy({ where: { id: savedProduct.id } });
    await Category.destroy({ where: { id: savedCategory.id } });
    await User.destroy({ where: { id: savedUser.id } });

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Database test failed:', error);
    throw error;
  } finally {
    console.log('\n🔌 Closing database connection...');
    await sequelize.close();
  }
}

// Run test if script is executed directly
if (require.main === module) {
  testDatabase()
    .then(() => {
      console.log('🎉 Test script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test script failed:', error);
      process.exit(1);
    });
}

export { testDatabase };