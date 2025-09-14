/**
 * Script di verifica dati del database
 * Mostra un riepilogo completo dei dati di seed
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyData() {
  console.log('🔍 Database Content Verification\n');
  
  try {
    // Verifica utenti
    console.log('👥 USERS:');
    const users = await prisma.user.findMany({
      orderBy: { role: 'asc' }
    });
    
    users.forEach(user => {
      console.log(`  • ${user.firstName} ${user.lastName} (${user.username})`);
      console.log(`    Email: ${user.email} | Role: ${user.role} | Verified: ${user.emailVerified ? '✅' : '❌'}`);
    });
    
    // Verifica categorie
    console.log('\n📂 CATEGORIES:');
    const categories = await prisma.category.findMany({
      include: {
        parent: true,
        children: true,
        _count: { select: { products: true } }
      },
      orderBy: { sortOrder: 'asc' }
    });
    
    const mainCategories = categories.filter(c => !c.parentId);
    mainCategories.forEach(category => {
      console.log(`  📁 ${category.name} (${category._count.products} products)`);
      const subcategories = categories.filter(c => c.parentId === category.id);
      subcategories.forEach(subcat => {
        console.log(`    └── ${subcat.name} (${subcat._count.products} products)`);
      });
    });
    
    // Verifica prodotti
    console.log('\n📦 PRODUCTS:');
    const products = await prisma.product.findMany({
      include: {
        category: true
      },
      orderBy: { name: 'asc' }
    });
    
    products.forEach(product => {
      const stockStatus = product.stock === 0 ? '❌ OUT OF STOCK' : 
                         product.stock <= product.minStock ? '⚠️ LOW STOCK' : '✅ IN STOCK';
      console.log(`  • ${product.name} (${product.sku})`);
      console.log(`    Category: ${product.category.name} | Price: €${product.price} | Stock: ${product.stock} ${stockStatus}`);
    });
    
    // Verifica ordini
    console.log('\n🛒 ORDERS:');
    const orders = await prisma.order.findMany({
      include: {
        user: true,
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
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
    const stats = await Promise.all([
      prisma.user.count(),
      prisma.category.count(),
      prisma.product.count(),
      prisma.order.count(),
      prisma.orderItem.count(),
      prisma.product.aggregate({
        _sum: { stock: true },
        _avg: { price: true }
      }),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        _avg: { totalAmount: true }
      })
    ]);
    
    console.log(`  Total Users: ${stats[0]}`);
    console.log(`  Total Categories: ${stats[1]}`);
    console.log(`  Total Products: ${stats[2]}`);
    console.log(`  Total Orders: ${stats[3]}`);
    console.log(`  Total Order Items: ${stats[4]}`);
    console.log(`  Total Inventory Units: ${stats[5]._sum.stock || 0}`);
    console.log(`  Average Product Price: €${(stats[5]._avg.price || 0).toFixed(2)}`);
    console.log(`  Total Revenue: €${(stats[6]._sum.totalAmount || 0).toFixed(2)}`);
    console.log(`  Average Order Value: €${(stats[6]._avg.totalAmount || 0).toFixed(2)}`);
    
    // Controlli di integrità
    console.log('\n🔍 INTEGRITY CHECKS:');
    
    // Prodotti con stock basso
    const lowStockProducts = await prisma.product.findMany({
      where: {
        stock: { lte: prisma.product.fields.minStock }
      }
    });
    console.log(`  Low Stock Products: ${lowStockProducts.length}`);
    
    // Prodotti esauriti
    const outOfStockProducts = await prisma.product.findMany({
      where: { stock: 0 }
    });
    console.log(`  Out of Stock Products: ${outOfStockProducts.length}`);
    
    // Ordini pendenti
    const pendingOrders = await prisma.order.findMany({
      where: { status: 'PENDING' }
    });
    console.log(`  Pending Orders: ${pendingOrders.length}`);
    
    // Utenti non verificati
    const unverifiedUsers = await prisma.user.findMany({
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
