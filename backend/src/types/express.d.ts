/**
 * Estensione dei tipi Express per l'autenticazione JWT
 * Aggiunge il campo user all'oggetto Request per contenere i dati dell'utente autenticato
 */

import { JwtPayload } from 'jsonwebtoken';

/**
 * Dichiarazione globale per estendere l'interfaccia Request di Express
 * Aggiunge il campo user opzionale che conterrà i dati decodificati dal token JWT
 */
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;  // Dati utente decodificati dal token JWT (opzionale)
    }
  }
}
