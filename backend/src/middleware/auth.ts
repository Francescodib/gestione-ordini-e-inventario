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
  console.log('verifyToken middleware called');
  // Estrazione del token dall'header Authorization (formato: "Bearer <token>")
  const token = req.headers.authorization?.split(" ")[1];
  console.log('Token found:', !!token);

  // Controllo presenza del token
  if (!token) {
    console.log('No token found');
    return res.status(401).json({
      message: "Protected route, token required.",
      error: "UNAUTHORIZED"
    });
  }

  try {
    // Verifica e decodifica del token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload;
    console.log('Token decoded successfully:', decoded);
    // Aggiunta dei dati utente alla richiesta per uso nei controller
    req.user = decoded;
    console.log('About to call next()');
    next();
  } catch (error) {
    // Gestione errori di verifica (token scaduto, malformato, ecc.)
    console.log('Token verification error:', error);
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

/**
 * Middleware per verificare accesso amministratore
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      message: "Authentication required",
      error: "UNAUTHORIZED"
    });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      message: "Admin access required",
      error: "FORBIDDEN"
    });
  }

  next();
}

/**
 * Middleware per verificare accesso manager o admin
 */
export function requireManagerOrAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      message: "Authentication required",
      error: "UNAUTHORIZED"
    });
  }

  if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
    return res.status(403).json({
      message: "Manager or Admin access required",
      error: "FORBIDDEN"
    });
  }

  next();
}

/**
 * Middleware per verificare che l'utente possa gestire ordini (admin o manager)
 */
export function requireOrderManagement(req: Request, res: Response, next: NextFunction) {
  return requireManagerOrAdmin(req, res, next);
}

/**
 * Middleware per verificare che l'utente possa creare nuovi utenti
 * Admin può creare tutti i tipi, Manager può creare solo clienti
 */
export function requireUserCreation(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      message: "Authentication required",
      error: "UNAUTHORIZED"
    });
  }

  // Check if trying to create admin/manager and user is not admin
  const targetRole = req.body.role;
  if ((targetRole === 'ADMIN' || targetRole === 'MANAGER') && req.user.role !== 'ADMIN') {
    return res.status(403).json({
      message: "Only admins can create admin or manager accounts",
      error: "FORBIDDEN"
    });
  }

  // Manager and Admin can create client accounts
  if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
    return res.status(403).json({
      message: "Manager or Admin access required to create users",
      error: "FORBIDDEN"
    });
  }

  next();
}

/**
 * Middleware per verificare che l'utente possa modificare il profilo specificato
 * Permette agli utenti di modificare il proprio profilo o agli admin di modificare qualsiasi profilo
 */
export function requireSelfOrAdmin(req: Request, res: Response, next: NextFunction) {
  console.log('requireSelfOrAdmin middleware called');
  console.log('req.user:', req.user);
  console.log('req.params:', req.params);

  if (!req.user) {
    console.log('No user in request');
    return res.status(401).json({
      message: "Authentication required",
      error: "UNAUTHORIZED"
    });
  }

  const targetUserId = parseInt(req.params.id);
  const currentUserId = req.user.userId;

  console.log('targetUserId:', targetUserId);
  console.log('currentUserId:', currentUserId);
  console.log('user role:', req.user.role);

  // Permetti se è admin o se sta modificare il proprio profilo
  if (req.user.role === 'ADMIN' || currentUserId === targetUserId) {
    console.log('Access granted');
    return next();
  }

  console.log('Access denied');
  return res.status(403).json({
    message: "You can only modify your own profile",
    error: "FORBIDDEN"
  });
}
