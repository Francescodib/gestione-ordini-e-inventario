/**
 * Servizio per la gestione dell'autenticazione JWT
 * Fornisce funzionalità per la generazione, verifica e gestione dei token JWT
 */

import jwt from 'jsonwebtoken';
import { User } from '../types/auth';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Interfaccia per il payload del token JWT
 * Contiene le informazioni essenziali dell'utente codificate nel token
 */
export interface TokenPayload {
  userId: number;      // ID univoco dell'utente
  email: string;       // Email dell'utente
  role?: string;       // Ruolo dell'utente (opzionale)
  iat?: number;        // Timestamp di emissione (issued at)
  exp?: number;        // Timestamp di scadenza (expiration)
}

/**
 * Interfaccia per la risposta di autenticazione
 * Contiene il token JWT e i dati utente (senza password)
 */
export interface AuthResponse {
  success: boolean;
  token: string;                    // Token JWT per l'autenticazione
  user: Omit<User, 'password'>;    // Dati utente senza password
  expiresAt?: Date;
  message?: string;
}

/**
 * Classe di servizio per la gestione dell'autenticazione
 * Implementa tutte le operazioni relative ai token JWT
 */
export class AuthService {
  // Configurazione JWT - chiave segreta per la firma dei token
  private static readonly JWT_SECRET = process.env.JWT_SECRET!;
  // Durata di validità del token (24 ore)
  private static readonly TOKEN_EXPIRY = '24h';

  /**
   * Genera un nuovo token JWT per l'utente specificato
   * 
   * @param user - Oggetto utente per cui generare il token
   * @returns Token JWT firmato
   */
  static generateToken(user: User): string {
    // Creazione del payload del token con le informazioni essenziali
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    // Generazione e firma del token con scadenza
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.TOKEN_EXPIRY
    });
  }

  /**
   * Verifica la validità di un token JWT
   * 
   * @param token - Token JWT da verificare
   * @returns Payload decodificato se valido, null se non valido
   */
  static verifyToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, this.JWT_SECRET) as TokenPayload;
    } catch (error) {
      // Token non valido, scaduto o malformato
      return null;
    }
  }

  /**
   * Crea una risposta di autenticazione completa
   * Include il token JWT e i dati utente (senza password)
   *
   * @param user - Oggetto utente completo
   * @returns Risposta di autenticazione con token e dati utente
   */
  static createAuthResponse(user: User): AuthResponse {
    const token = this.generateToken(user);
    // Rimozione della password dai dati utente per la risposta
    const { password, ...userWithoutPassword } = user;

    // Calcolo della data di scadenza (24 ore da ora)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    return {
      success: true,
      token,
      user: userWithoutPassword,
      expiresAt
    };
  }

  /**
   * Estrae il token dall'header Authorization
   * Gestisce il formato "Bearer <token>"
   * 
   * @param authHeader - Header Authorization completo
   * @returns Token estratto o null se non valido
   */
  static extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader) return null;
    
    const parts = authHeader.split(' ');
    // Verifica del formato corretto: "Bearer <token>"
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }
    
    return parts[1];
  }

  /**
   * Verifica se un token è scaduto
   * Controlla la data di scadenza senza verificare la firma
   * 
   * @param token - Token JWT da controllare
   * @returns true se il token è scaduto, false altrimenti
   */
  static isTokenExpired(token: string): boolean {
    try {
      // Decodifica senza verifica della firma per leggere solo l'exp
      const decoded = jwt.decode(token) as TokenPayload;
      if (!decoded || !decoded.exp) return true;
      
      // Confronto con il timestamp corrente
      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch (error) {
      // Se non riesce a decodificare, considera scaduto
      return true;
    }
  }

  /**
   * Rinnova un token JWT esistente
   * Genera un nuovo token con lo stesso payload del token originale
   * 
   * @param token - Token JWT da rinnovare
   * @returns Nuovo token JWT o null se il token originale non è valido
   */
  static refreshToken(token: string): string | null {
    try {
      // Verifica del token originale
      const decoded = jwt.verify(token, this.JWT_SECRET) as TokenPayload;
      
      // Generazione di un nuovo token con gli stessi dati
      return this.generateToken({
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role || 'user'
      } as User);
    } catch (error) {
      // Token non valido o scaduto
      return null;
    }
  }
}
