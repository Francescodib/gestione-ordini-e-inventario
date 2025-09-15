/**
 * Script di verifica dati del database
 * Mostra un riepilogo completo dei dati di seed
 */

import { sequelize, User, Category, Product, Order, OrderItem, UserRole, ProductStatus, OrderStatus } from '../models';
import { Op, fn, col } from 'sequelize';

async function verifyData() {
  console.log('🔍 Database Content Verification\n');
  
  try {
    // Verifica utenti
    console.log('👥 USERS:');
    const users = await User.findAll({
      order: [['role', 'ASC']]
    });
    
    users.forEach(user => {
      console.log(`  • ${user.firstName} ${user.lastName} (${user.username})`);
      console.log(`    Email: ${user.email} | Role: ${user.role} | Verified: ${user.emailVerified ? '✅' : '❌'}`);
    });
    
    // Verifica categorie
    console.log('\n📂 CATEGORIES:');
    const categories = await Category.findAll({
      include: [
        { model: Category, as: 'parent' },
        { model: Category, as: 'children' },
        { model: Product, as: 'products', attributes: [] }
      ],
      attributes: {
        include: [
          [fn('COUNT', col('products.id')), 'productCount']
        ]
      },
      group: ['Category.id', 'parent.id'],
      order: [['sortOrder', 'ASC']]
    });
    
    const mainCategories = categories.filter(c => !c.parentId);
    for (const category of mainCategories) {
      const productCount = await Product.count({ where: { categoryId: category.id } });
      console.log(`  📁 ${category.name} (${productCount} products)`);
      const subcategories = categories.filter(c => c.parentId === category.id);
      for (const subcat of subcategories) {
        const subcatProductCount = await Product.count({ where: { categoryId: subcat.id } });
        console.log(`    └── ${subcat.name} (${subcatProductCount} products)`);
      }
    }
    
    // Verifica prodotti
    console.log('\n📦 PRODUCTS:');
    const products = await Product.findAll({
      include: [
        { model: Category, as: 'category' }
      ],
      order: [['name', 'ASC']]
    });
    
    products.forEach(product => {
      const stockStatus = product.stock === 0 ? '❌ OUT OF STOCK' : 
                         product.stock <= product.minStock ? '⚠️ LOW STOCK' : '✅ IN STOCK';
      console.log(`  • ${product.name} (${product.sku})`);
      console.log(`    Category: ${product.category.name} | Price: €${product.price} | Stock: ${product.stock} ${stockStatus}`);
    });
    
    // Verifica ordini
    console.log('\n🛒 ORDERS:');
    const orders = await Order.findAll({
      include: [
        { model: User, as: 'user' },
        { 
          model: OrderItem, 
          as: 'items',
          include: [
            { model: Product, as: 'product' }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    orders.forEach(order => {
      console.log(`  • Order ${order.orderNumber} - ${order.user.firstName} ${order.user.lastName}`);
      console.log(`    Status: ${order.status} | Payment: ${order.paymentStatus} | Total: €${order.totalAmount}`);
      console.log(`    Items: ${order.items.length} products (${order.items.reduce((sum, item) => sum + item.quantity, 0)} total quantity)`);
      order.items.forEach(item => {
        console.log(`      - ${item.name} x${item.quantity} @ €${item.price} each`);
      });
    });
    
    // Statistiche generali
    console.log('\n📊 STATISTICS:');
    const [userCount, categoryCount, productCount, orderCount, orderItemCount] = await Promise.all([
      User.count(),
      Category.count(),
      Product.count(),
      Order.count(),
      OrderItem.count()
    ]);
    
    const productStats = await Product.findAll({
      attributes: [
        [fn('SUM', col('stock')), 'totalStock'],
        [fn('AVG', col('price')), 'averagePrice']
      ],
      raw: true
    });
    
    const orderStats = await Order.findAll({
      attributes: [
        [fn('SUM', col('totalAmount')), 'totalRevenue'],
        [fn('AVG', col('totalAmount')), 'averageOrderValue']
      ],
      raw: true
    });
    
    console.log(`  Total Users: ${userCount}`);
    console.log(`  Total Categories: ${categoryCount}`);
    console.log(`  Total Products: ${productCount}`);
    console.log(`  Total Orders: ${orderCount}`);
    console.log(`  Total Order Items: ${orderItemCount}`);
    console.log(`  Total Inventory Units: ${productStats[0]?.totalStock || 0}`);
    console.log(`  Average Product Price: €${(productStats[0]?.averagePrice || 0).toFixed(2)}`);
    console.log(`  Total Revenue: €${(orderStats[0]?.totalRevenue || 0).toFixed(2)}`);
    console.log(`  Average Order Value: €${(orderStats[0]?.averageOrderValue || 0).toFixed(2)}`);
    
    // Controlli di integrità
    console.log('\n🔍 INTEGRITY CHECKS:');
    
    // Prodotti con stock basso - compare stock with minStock in same row
    const lowStockProducts = await sequelize.query(
      'SELECT * FROM products WHERE stock <= minStock',
      { type: sequelize.QueryTypes.SELECT }
    );
    console.log(`  Low Stock Products: ${lowStockProducts.length}`);
    
    // Prodotti esauriti
    const outOfStockProducts = await Product.findAll({
      where: { stock: 0 }
    });
    console.log(`  Out of Stock Products: ${outOfStockProducts.length}`);
    
    // Ordini pendenti
    const pendingOrders = await Order.findAll({
      where: { status: OrderStatus.PENDING }
    });
    console.log(`  Pending Orders: ${pendingOrders.length}`);
    
    // Utenti non verificati
    const unverifiedUsers = await User.findAll({
      where: { emailVerified: false }
    });
    console.log(`  Unverified Users: ${unverifiedUsers.length}`);
    
    console.log('\n✅ Database verification completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
    throw error;
  }
}

// Esegui verifica
verifyData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
