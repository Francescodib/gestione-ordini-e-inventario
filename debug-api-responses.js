/**
 * Debug per verificare le risposte delle API
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

async function debugApiResponses() {
  console.log('🔍 Debug Risposte API...');

  try {
    // 1. Autenticazione
    const loginResponse = await axios.post(`${API_BASE_URL}/users/login`, {
      email: 'demo@demo.com',
      password: 'Demo123!'
    });

    const { token } = loginResponse.data;
    console.log('✅ Autenticato con successo');

    // 2. Test API prodotti con diversi filtri
    console.log('\n--- TEST API PRODOTTI ---');

    // Test senza filtri
    try {
      const allProductsResponse = await axios.get(`${API_BASE_URL}/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('📦 Prodotti (tutti):', {
        count: allProductsResponse.data.products?.length || 0,
        structure: Object.keys(allProductsResponse.data),
        firstProduct: allProductsResponse.data.products?.[0] || 'nessuno'
      });
    } catch (err) {
      console.log('❌ Errore API prodotti (tutti):', err.response?.data || err.message);
    }

    // Test con filtro ACTIVE
    try {
      const activeProductsResponse = await axios.get(`${API_BASE_URL}/products?status=ACTIVE`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('📦 Prodotti ACTIVE:', {
        count: activeProductsResponse.data.products?.length || 0,
        structure: Object.keys(activeProductsResponse.data),
        firstProduct: activeProductsResponse.data.products?.[0] || 'nessuno'
      });
    } catch (err) {
      console.log('❌ Errore API prodotti ACTIVE:', err.response?.data || err.message);
    }

    // 3. Test API utenti
    console.log('\n--- TEST API UTENTI ---');

    try {
      const usersResponse = await axios.get(`${API_BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('👥 Utenti:', {
        count: usersResponse.data.users?.length || 0,
        structure: Object.keys(usersResponse.data),
        firstUser: usersResponse.data.users?.[0] ? {
          id: usersResponse.data.users[0].id,
          email: usersResponse.data.users[0].email
        } : 'nessuno'
      });
    } catch (err) {
      console.log('❌ Errore API utenti:', err.response?.data || err.message);
    }

    // 4. Test API categorie
    console.log('\n--- TEST API CATEGORIE ---');

    try {
      const categoriesResponse = await axios.get(`${API_BASE_URL}/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('📁 Categorie:', {
        count: categoriesResponse.data.data?.length || 0,
        structure: Object.keys(categoriesResponse.data),
        firstCategory: categoriesResponse.data.data?.[0] || 'nessuna'
      });
    } catch (err) {
      console.log('❌ Errore API categorie:', err.response?.data || err.message);
    }

    // 5. Creiamo un prodotto di test se necessario
    console.log('\n--- CREAZIONE PRODOTTO TEST ---');

    try {
      const categoriesResponse = await axios.get(`${API_BASE_URL}/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const categories = categoriesResponse.data.data || [];

      if (categories.length > 0) {
        const testProduct = {
          name: 'Test Product Debug',
          description: 'Prodotto di test per debug creazione ordini',
          sku: 'DEBUG-TEST-001',
          categoryId: categories[0].id,
          price: 19.99,
          costPrice: 10.00,
          stock: 50,
          minStock: 5
        };

        const productResponse = await axios.post(`${API_BASE_URL}/products`, testProduct, {
          headers: { Authorization: `Bearer ${token}` }
        });

        console.log('✅ Prodotto test creato:', {
          id: productResponse.data.id,
          name: productResponse.data.name,
          sku: productResponse.data.sku
        });
      } else {
        console.log('❌ Impossibile creare prodotto: nessuna categoria disponibile');
      }

    } catch (err) {
      if (err.response?.status === 409) {
        console.log('ℹ️  Prodotto test già esistente');
      } else {
        console.log('❌ Errore creazione prodotto test:', err.response?.data || err.message);
      }
    }

    // 6. Verifica prodotti dopo creazione
    console.log('\n--- VERIFICA FINALE PRODOTTI ---');

    try {
      const finalProductsResponse = await axios.get(`${API_BASE_URL}/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('📦 Prodotti finali:', {
        count: finalProductsResponse.data.products?.length || 0,
        products: finalProductsResponse.data.products?.map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          isActive: p.isActive
        })) || []
      });
    } catch (err) {
      console.log('❌ Errore verifica finale prodotti:', err.response?.data || err.message);
    }

  } catch (error) {
    console.error('❌ Errore generale nel debug:', error.message);
  }
}

debugApiResponses();