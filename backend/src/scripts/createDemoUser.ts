/**
 * Script per creare utente demo automaticamente
 * File: src/scripts/createDemoUser.ts
 */

import { User, UserRole, sequelize } from '../models';
import bcrypt from 'bcryptjs';
import { logger } from '../config/logger';

/**
 * Crea l'utente demo se non esistono ancora utenti nel sistema
 */
export async function createDemoUserIfNeeded(): Promise<void> {
  try {
    // Verifica se esistono già utenti nel database
    const userCount = await User.count();
    
    if (userCount === 0) {
      console.log('🚀 Nessun utente trovato, creazione utente demo...');
      
      // Hash della password demo
      const hashedPassword = await bcrypt.hash('Demo123!', 12);
      
      // Crea l'utente demo
      const demoUser = await User.create({
        username: 'demo',
        email: 'demo@demo.com',
        password: hashedPassword,
        firstName: 'Demo',
        lastName: 'User',
        role: UserRole.ADMIN, // Admin per avere accesso completo
        isActive: true,
        emailVerified: true
      });
      
      console.log('✅ Utente demo creato con successo!');
      console.log('📧 Email: demo@demo.com');
      console.log('🔑 Password: Demo123!');
      console.log('👤 Ruolo: ADMIN');
      console.log('');
      console.log('🎯 Usa queste credenziali per il primo accesso al sistema!');
      
      if (logger) {
        logger.info('Demo user created successfully', {
          userId: demoUser.id,
          email: demoUser.email,
          role: demoUser.role
        });
      }
    } else {
      console.log('👥 Utenti già presenti nel sistema, utente demo non necessario');
    }
    
  } catch (error: any) {
    console.error('❌ Errore durante la creazione dell\'utente demo:', error.message);
    if (logger) {
      logger.error('Demo user creation failed', {
        error: error.message
      });
    }
  }
}

/**
 * Esegui lo script direttamente se chiamato
 */
if (require.main === module) {
  (async () => {
    try {
      await sequelize.authenticate();
      console.log('✅ Connesso al database');
      
      await createDemoUserIfNeeded();
      
    } catch (error: any) {
      console.error('❌ Errore:', error.message);
      process.exit(1);
    } finally {
      await sequelize.close();
    }
  })();
}