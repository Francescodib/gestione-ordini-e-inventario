/**
 * Estensione dei tipi Express per l'applicazione
 * Aggiunge tutti i campi personalizzati all'oggetto Request
 */

import { JwtPayload } from 'jsonwebtoken';

/**
 * Dichiarazione globale per estendere l'interfaccia Request di Express
 * Consolida tutte le estensioni in un unico posto
 */
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;     // Dati utente decodificati dal token JWT (opzionale)
      requestId?: string;    // ID univoco della richiesta per il tracking
      startTime?: number;    // Timestamp di inizio richiesta per performance tracking
      userId?: string;       // ID utente estratto dal token per logging
      userRole?: string;     // Ruolo utente per logging e autorizzazione
      skipLogging?: boolean; // Flag per saltare il logging dettagliato (health checks)
    }
  }
}
