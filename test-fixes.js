#!/usr/bin/env node

const http = require('http');

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testProductValidation() {
  console.log('\n🧪 Testing Product Creation Validation...');

  // Test 1: Product without description (should fail)
  try {
    const result1 = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/products',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-token-for-test'
      }
    }, {
      name: 'Test Product',
      sku: 'TEST-001',
      categoryId: 1,
      price: 19.99,
      costPrice: 10.00
    });

    console.log('❌ Test 1 - Product without description:');
    console.log('Status:', result1.status);
    console.log('Response:', result1.data);

  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }

  // Test 2: Product with short description (should fail)
  try {
    const result2 = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/products',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-token-for-test'
      }
    }, {
      name: 'Test Product',
      description: 'Short',
      sku: 'TEST-002',
      categoryId: 1,
      price: 19.99,
      costPrice: 10.00
    });

    console.log('\n❌ Test 2 - Product with short description:');
    console.log('Status:', result2.status);
    console.log('Response:', result2.data);

  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
}

async function testOrderValidation() {
  console.log('\n🧪 Testing Order Creation Validation...');

  // Test 3: Order with extended item fields (should succeed if auth were valid)
  try {
    const result3 = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/orders',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-token-for-test'
      }
    }, {
      userId: "1",
      items: [{
        productId: "3",
        name: "Test Product",
        sku: "TEST-001",
        quantity: 2,
        price: 19.99,
        totalPrice: 39.98
      }],
      subtotal: 39.98,
      shippingCost: 5.00,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: 44.98,
      shippingAddress: {
        firstName: "Mario",
        lastName: "Rossi",
        address1: "Via Roma 123",
        city: "Roma",
        state: "RM",
        postalCode: "00100",
        country: "Italy"
      },
      notes: "Test order",
      status: "PENDING",
      paymentStatus: "PENDING"
    });

    console.log('\n✅ Test 3 - Order with extended fields:');
    console.log('Status:', result3.status);
    console.log('Response:', result3.data);

  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting validation tests...');

  // Check if server is running
  try {
    const health = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/health',
      method: 'GET'
    });

    if (health.status === 200) {
      console.log('✅ Server is running');
      await testProductValidation();
      await testOrderValidation();
    } else {
      console.log('❌ Server not responding correctly');
    }
  } catch (error) {
    console.log('❌ Server not reachable:', error.message);
  }

  console.log('\n🏁 Tests completed');
}

runTests();