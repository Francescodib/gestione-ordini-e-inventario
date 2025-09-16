/**
 * Middleware di autenticazione e autorizzazione
 * Gestisce la verifica dei token JWT e i controlli di accesso per le rotte protette
 */

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();


/**
 * Middleware principale per la verifica del token JWT
 * Estrae il token dall'header Authorization e lo verifica
 * Se valido, aggiunge i dati utente alla richiesta
 * 
 * @param req - Oggetto richiesta Express
 * @param res - Oggetto risposta Express  
 * @param next - Funzione per passare al middleware successivo
 */
export function verifyToken(req: Request, res: Response, next: NextFunction) {
  // Estrazione del token dall'header Authorization (formato: "Bearer <token>")
  const token = req.headers.authorization?.split(" ")[1];
  
  // Controllo presenza del token
  if (!token) {
    return res.status(401).json({ 
      message: "Protected route, token required.",
      error: "UNAUTHORIZED" 
    });
  }

  try {
    // Verifica e decodifica del token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload;
    // Aggiunta dei dati utente alla richiesta per uso nei controller
    req.user = decoded;
    next();
  } catch (error) {
    // Gestione errori di verifica (token scaduto, malformato, ecc.)
    return res.status(401).json({ 
      message: "Invalid or expired token",
      error: "UNAUTHORIZED" 
    });
  }
}

/**
 * Middleware factory per il controllo dei ruoli utente
 * Restituisce un middleware che verifica se l'utente ha il ruolo specificato
 * 
 * @param role - Ruolo richiesto per accedere alla risorsa
 * @returns Middleware function per il controllo del ruolo
 */
export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Controllo autenticazione (deve essere chiamato dopo verifyToken)
    if (!req.user) {
      return res.status(401).json({ 
        message: "Authentication required",
        error: "UNAUTHORIZED" 
      });
    }

    // Controllo del ruolo specifico
    if (req.user.role !== role) {
      return res.status(403).json({ 
        message: "Insufficient permissions",
        error: "FORBIDDEN" 
      });
    }

    next();
  };
}

/**
 * Middleware per verificare che l'utente sia attivo
 * Controlla che l'account utente non sia stato disattivato
 * 
 * @param req - Oggetto richiesta Express
 * @param res - Oggetto risposta Express
 * @param next - Funzione per passare al middleware successivo
 */
export function requireActiveUser(req: Request, res: Response, next: NextFunction) {
  // Controllo autenticazione
  if (!req.user) {
    return res.status(401).json({ 
      message: "Authentication required",
      error: "UNAUTHORIZED" 
    });
  }

  // Controllo stato attivo dell'account
  if (!req.user.isActive) {
    return res.status(403).json({ 
      message: "Account is deactivated",
      error: "ACCOUNT_DEACTIVATED" 
    });
  }

  next();
}

/**
 * Middleware di autenticazione opzionale
 * Non fallisce se il token è assente o non valido
 * Utile per rotte che possono funzionare sia con che senza autenticazione
 * 
 * @param req - Oggetto richiesta Express
 * @param res - Oggetto risposta Express
 * @param next - Funzione per passare al middleware successivo
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];
  
  // Se presente un token, tenta di verificarlo
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload;
      req.user = decoded;
    } catch (error) {
      // Ignora token non validi nell'autenticazione opzionale
      // Non blocca la richiesta
    }
  }
  
  next();
}
