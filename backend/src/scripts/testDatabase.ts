/**
 * Script di test per verificare la connessione al database e i modelli
 * src/scripts/testDatabase.ts
 */

import { connectDatabase, disconnectDatabase } from '../config/database';
import { User, UserRole } from '../models/User';
import { Category } from '../models/Category';
import { Product, ProductStatus } from '../models/Product';
import { Order, OrderStatus, PaymentStatus } from '../models/Order';

/**
 * Funzione per testare la connessione e i modelli
 */
async function testDatabase() {
  try {
    console.log('🔌 Connecting to database...');
    await connectDatabase();
    
    console.log('🧪 Starting database tests...');
    
    // Test 1: Creazione utente di test
    console.log('\n1️⃣ Testing User model...');
    const testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.USER
    });
    
    const savedUser = await testUser.save();
    console.log('✅ User created:', savedUser.username);
    
    // Test password comparison
    const isValidPassword = await savedUser.comparePassword('password123');
    console.log('✅ Password verification:', isValidPassword);
    
    // Test 2: Creazione categoria di test
    console.log('\n2️⃣ Testing Category model...');
    const testCategory = new Category({
      name: 'Office Supplies',
      description: 'General office supplies and equipment'
    });
    
    const savedCategory = await testCategory.save();
    console.log('✅ Category created:', savedCategory.name, 'Slug:', savedCategory.slug);
    
    // Test 3: Creazione prodotto di test
    console.log('\n3️⃣ Testing Product model...');
    const testProduct = new Product({
      name: 'Wireless Mouse',
      description: 'Ergonomic wireless mouse with optical sensor',
      sku: 'WM-001',
      categoryId: savedCategory._id,
      price: 25.99,
      costPrice: 15.00,
      stock: 100,
      minStock: 10,
      tags: ['electronics', 'computer', 'wireless'],
      status: ProductStatus.ACTIVE
    });
    
    const savedProduct = await testProduct.save();
    console.log('✅ Product created:', savedProduct.name, 'SKU:', savedProduct.sku);
    console.log('   Stock status:', savedProduct.stockStatus);
    console.log('   Profit margin:', savedProduct.profitMargin + '%');
    
    // Test 4: Creazione ordine di test
    console.log('\n4️⃣ Testing Order model...');
    const testOrder = new Order({
      userId: savedUser._id,
      items: [{
        productId: savedProduct._id,
        name: savedProduct.name,
        sku: savedProduct.sku,
        quantity: 2,
        price: savedProduct.price,
        totalPrice: savedProduct.price * 2
      }],
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      subtotal: savedProduct.price * 2,
      shippingCost: 5.99,
      taxAmount: 2.50,
      discountAmount: 0,
      totalAmount: (savedProduct.price * 2) + 5.99 + 2.50,
      shippingAddress: {
        firstName: 'Test',
        lastName: 'User',
        address1: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        postalCode: '12345',
        country: 'Italy'
      }
    });
    
    const savedOrder = await testOrder.save();
    console.log('✅ Order created:', savedOrder.orderNumber);
    console.log('   Total items:', savedOrder.itemsCount);
    console.log('   Total amount:', savedOrder.totalAmount, savedOrder.currency);
    
    // Test 5: Query di test
    console.log('\n5️⃣ Testing queries...');
    
    // Trova prodotti con stock basso
    const lowStockProducts = await Product.findLowStock();
    console.log('📊 Low stock products:', lowStockProducts.length);
    
    // Trova ordini per stato
    const pendingOrders = await Order.findByStatus(OrderStatus.PENDING);
    console.log('📊 Pending orders:', pendingOrders.length);
    
    // Trova utenti attivi
    const activeUsers = await User.findActiveUsers();
    console.log('📊 Active users:', activeUsers.length);
    
    // Test 6: Aggiornamenti
    console.log('\n6️⃣ Testing updates...');
    
    // Aggiorna stock prodotto
    await savedProduct.updateStock(5, 'subtract');
    console.log('✅ Product stock updated:', savedProduct.stock);
    
    // Aggiorna stato ordine
    savedOrder.status = OrderStatus.PROCESSING;
    await savedOrder.save();
    console.log('✅ Order status updated:', savedOrder.status);
    
    // Test 7: Cleanup (rimuovi dati di test)
    console.log('\n7️⃣ Cleaning up test data...');
    await User.findByIdAndDelete(savedUser._id);
    await Category.findByIdAndDelete(savedCategory._id);
    await Product.findByIdAndDelete(savedProduct._id);
    await Order.findByIdAndDelete(savedOrder._id);
    console.log('✅ Test data cleaned up');
    
    console.log('\n🎉 All database tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await disconnectDatabase();
    console.log('👋 Database connection closed');
  }
}

/**
 *