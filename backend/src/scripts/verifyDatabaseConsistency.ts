/**
 * Database Consistency Verification Script
 * File: src/scripts/verifyDatabaseConsistency.ts
 */

import { sequelize, User, Category, Product, Order, OrderItem } from '../models';

interface ConsistencyReport {
  tables: {
    users: number;
    categories: number;
    products: number;
    orders: number;
    orderItems: number;
  };
  relationships: {
    productCategories: { valid: number; invalid: number };
    orderUsers: { valid: number; invalid: number };
    orderItemProducts: { valid: number; invalid: number };
    orderItemOrders: { valid: number; invalid: number };
    categoryHierarchy: { valid: number; invalid: number };
  };
  dataIntegrity: {
    stockConsistency: boolean;
    priceConsistency: boolean;
    orderTotalConsistency: boolean;
  };
  issues: string[];
}

const verifyDatabaseConsistency = async (): Promise<ConsistencyReport> => {
  console.log('🔍 Starting database consistency verification...');

  const report: ConsistencyReport = {
    tables: {
      users: 0,
      categories: 0,
      products: 0,
      orders: 0,
      orderItems: 0
    },
    relationships: {
      productCategories: { valid: 0, invalid: 0 },
      orderUsers: { valid: 0, invalid: 0 },
      orderItemProducts: { valid: 0, invalid: 0 },
      orderItemOrders: { valid: 0, invalid: 0 },
      categoryHierarchy: { valid: 0, invalid: 0 }
    },
    dataIntegrity: {
      stockConsistency: true,
      priceConsistency: true,
      orderTotalConsistency: true
    },
    issues: []
  };

  try {
    // 1. Count records in each table
    console.log('📊 Counting records in each table...');
    report.tables.users = await User.count();
    report.tables.categories = await Category.count();
    report.tables.products = await Product.count();
    report.tables.orders = await Order.count();
    report.tables.orderItems = await OrderItem.count();

    console.log(`   👥 Users: ${report.tables.users}`);
    console.log(`   📂 Categories: ${report.tables.categories}`);
    console.log(`   📦 Products: ${report.tables.products}`);
    console.log(`   📋 Orders: ${report.tables.orders}`);
    console.log(`   🛒 Order Items: ${report.tables.orderItems}`);

    // 2. Verify Product-Category relationships
    console.log('🔗 Verifying product-category relationships...');
    const products = await Product.findAll({
      include: [{ model: Category, as: 'category' }]
    });

    for (const product of products) {
      if (product.categoryId) {
        const category = await Category.findByPk(product.categoryId);
        if (category) {
          report.relationships.productCategories.valid++;
        } else {
          report.relationships.productCategories.invalid++;
          report.issues.push(`Product "${product.name}" (ID: ${product.id}) references non-existent category ${product.categoryId}`);
        }
      }
    }

    // 3. Verify Order-User relationships
    console.log('👥 Verifying order-user relationships...');
    const orders = await Order.findAll();

    for (const order of orders) {
      const user = await User.findByPk(order.userId);
      if (user) {
        report.relationships.orderUsers.valid++;
      } else {
        report.relationships.orderUsers.invalid++;
        report.issues.push(`Order "${order.orderNumber}" (ID: ${order.id}) references non-existent user ${order.userId}`);
      }
    }

    // 4. Verify OrderItem relationships
    console.log('🛒 Verifying order item relationships...');
    const orderItems = await OrderItem.findAll();

    for (const item of orderItems) {
      // Check product relationship
      const product = await Product.findByPk(item.productId);
      if (product) {
        report.relationships.orderItemProducts.valid++;
      } else {
        report.relationships.orderItemProducts.invalid++;
        report.issues.push(`Order item (ID: ${item.id}) references non-existent product ${item.productId}`);
      }

      // Check order relationship
      const order = await Order.findByPk(item.orderId);
      if (order) {
        report.relationships.orderItemOrders.valid++;
      } else {
        report.relationships.orderItemOrders.invalid++;
        report.issues.push(`Order item (ID: ${item.id}) references non-existent order ${item.orderId}`);
      }
    }

    // 5. Verify Category hierarchy
    console.log('🌳 Verifying category hierarchy...');
    const categories = await Category.findAll();

    for (const category of categories) {
      if (category.parentId) {
        const parent = await Category.findByPk(category.parentId);
        if (parent) {
          report.relationships.categoryHierarchy.valid++;
        } else {
          report.relationships.categoryHierarchy.invalid++;
          report.issues.push(`Category "${category.name}" (ID: ${category.id}) references non-existent parent ${category.parentId}`);
        }
      } else {
        report.relationships.categoryHierarchy.valid++;
      }
    }

    // 6. Verify data integrity constraints
    console.log('✅ Verifying data integrity...');

    // Stock consistency
    const negativeStockProducts = await Product.findAll({
      where: sequelize.where(sequelize.col('stock'), '<', 0)
    });
    if (negativeStockProducts.length > 0) {
      report.dataIntegrity.stockConsistency = false;
      report.issues.push(`Found ${negativeStockProducts.length} products with negative stock`);
    }

    // Price consistency
    const zeroPriceProducts = await Product.findAll({
      where: sequelize.where(sequelize.col('price'), '<=', 0)
    });
    if (zeroPriceProducts.length > 0) {
      report.dataIntegrity.priceConsistency = false;
      report.issues.push(`Found ${zeroPriceProducts.length} products with zero or negative price`);
    }

    // Order total consistency
    for (const order of orders) {
      const items = await OrderItem.findAll({ where: { orderId: order.id } });
      const calculatedSubtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
      const expectedTotal = calculatedSubtotal + order.shippingCost + order.taxAmount - order.discountAmount;

      if (Math.abs(expectedTotal - order.totalAmount) > 0.01) { // Allow for small floating point differences
        report.dataIntegrity.orderTotalConsistency = false;
        report.issues.push(`Order "${order.orderNumber}" has inconsistent total: expected ${expectedTotal.toFixed(2)}, actual ${order.totalAmount}`);
      }
    }

    // 7. Generate summary
    console.log('📋 Generating consistency report...');

    const totalRelationships =
      report.relationships.productCategories.valid + report.relationships.productCategories.invalid +
      report.relationships.orderUsers.valid + report.relationships.orderUsers.invalid +
      report.relationships.orderItemProducts.valid + report.relationships.orderItemProducts.invalid +
      report.relationships.orderItemOrders.valid + report.relationships.orderItemOrders.invalid +
      report.relationships.categoryHierarchy.valid + report.relationships.categoryHierarchy.invalid;

    const validRelationships =
      report.relationships.productCategories.valid +
      report.relationships.orderUsers.valid +
      report.relationships.orderItemProducts.valid +
      report.relationships.orderItemOrders.valid +
      report.relationships.categoryHierarchy.valid;

    console.log('\n📊 CONSISTENCY REPORT SUMMARY:');
    console.log('═════════════════════════════════');
    console.log(`📋 Total Records: ${Object.values(report.tables).reduce((a, b) => a + b, 0)}`);
    console.log(`🔗 Relationship Integrity: ${validRelationships}/${totalRelationships} valid (${(validRelationships/totalRelationships*100).toFixed(1)}%)`);
    console.log(`✅ Data Integrity: ${Object.values(report.dataIntegrity).every(Boolean) ? 'PASSED' : 'FAILED'}`);
    console.log(`⚠️  Issues Found: ${report.issues.length}`);

    if (report.issues.length > 0) {
      console.log('\n⚠️  ISSUES DETECTED:');
      console.log('══════════════════');
      report.issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
    } else {
      console.log('\n✅ NO ISSUES DETECTED - Database is fully consistent!');
    }

    return report;

  } catch (error) {
    console.error('❌ Error during consistency verification:', error);
    throw error;
  }
};

// Run verification if called directly
if (require.main === module) {
  sequelize.authenticate()
    .then(() => verifyDatabaseConsistency())
    .then((report) => {
      const hasIssues = report.issues.length > 0 || !Object.values(report.dataIntegrity).every(Boolean);
      console.log(`\n🎯 Verification completed ${hasIssues ? 'with issues' : 'successfully'}!`);
      process.exit(hasIssues ? 1 : 0);
    })
    .catch((error) => {
      console.error('💥 Verification failed:', error);
      process.exit(1);
    });
}

export { verifyDatabaseConsistency };