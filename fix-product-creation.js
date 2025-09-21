/**
 * Script per risolvere il problema nella creazione prodotti
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

async function fixProductCreation() {
  console.log('🔧 Risoluzione Problema Creazione Prodotti...');

  try {
    // 1. Autenticazione
    const loginResponse = await axios.post(`${API_BASE_URL}/users/login`, {
      email: 'demo@demo.com',
      password: 'Demo123!'
    });

    const { token } = loginResponse.data;
    console.log('✅ Autenticato con successo');

    // 2. Ottenere le categorie
    const categoriesResponse = await axios.get(`${API_BASE_URL}/categories`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const categories = categoriesResponse.data.data || [];
    console.log(`📁 Categorie disponibili: ${categories.length}`);

    if (categories.length === 0) {
      console.log('❌ Nessuna categoria disponibile per creare prodotti');
      return;
    }

    const firstCategory = categories[0];
    console.log(`Usando categoria: ${firstCategory.name} (ID: ${firstCategory.id})`);

    // 3. Tentativo di creazione prodotto con dati completi
    console.log('🛠️  Creazione prodotto di test...');

    const productData = {
      name: 'Prodotto di Test per Ordini',
      description: 'Questo è un prodotto di test creato per verificare la funzionalità di creazione ordini',
      sku: 'PROD-TEST-FIX-001',
      categoryId: firstCategory.id,
      price: 25.99,
      costPrice: 12.50,
      stock: 100,
      minStock: 10,
      status: 'ACTIVE'
    };

    console.log('📋 Dati prodotto:', JSON.stringify(productData, null, 2));

    try {
      const productResponse = await axios.post(`${API_BASE_URL}/products`, productData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Prodotto creato con successo!');
      console.log('📄 Dettagli risposta completa:', JSON.stringify(productResponse.data, null, 2));

      // Verifica che il prodotto sia realmente salvato
      console.log('\n🔍 Verifica prodotto salvato...');

      const verifyResponse = await axios.get(`${API_BASE_URL}/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('📦 Prodotti totali dopo creazione:', verifyResponse.data.data?.length || 0);

      if (verifyResponse.data.data && verifyResponse.data.data.length > 0) {
        console.log('✅ Prodotto verificato nel database');
        const product = verifyResponse.data.data[0];
        console.log('📄 Primo prodotto:', {
          id: product.id,
          name: product.name,
          sku: product.sku,
          price: product.price,
          stock: product.stock,
          status: product.status
        });
      } else {
        console.log('❌ Prodotto non trovato nel database dopo la creazione');
      }

    } catch (createError) {
      console.error('❌ Errore nella creazione prodotto:', createError.message);
      if (createError.response?.data) {
        console.error('📄 Dettagli errore:', JSON.stringify(createError.response.data, null, 2));
      }
      if (createError.response?.status) {
        console.error(`📊 Status HTTP: ${createError.response.status}`);
      }
    }

  } catch (error) {
    console.error('❌ Errore generale:', error.message);
    if (error.response?.data) {
      console.error('📄 Dettagli errore:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

fixProductCreation();