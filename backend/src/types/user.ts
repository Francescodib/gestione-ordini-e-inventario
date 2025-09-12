/**
 * Definizioni dei tipi TypeScript per la gestione degli utenti
 * Contiene tutte le interfacce e i tipi utilizzati nel sistema di autenticazione
 */

/**
 * Interfaccia principale per l'entità User
 * Rappresenta un utente completo nel sistema con tutti i campi
 */
export interface User {
  id: string;                                    // ID univoco dell'utente
  username: string;                              // Nome utente univoco
  email: string;                                 // Email univoca dell'utente
  password: string;                              // Password hashata (non in chiaro)
  firstName: string;                             // Nome dell'utente
  lastName: string;                              // Cognome dell'utente
  role: 'admin' | 'user' | 'manager';           // Ruolo dell'utente nel sistema
  isActive: boolean;                             // Stato attivo/disattivo dell'account
  createdAt: Date;                               // Data e ora di creazione
  updatedAt: Date;                               // Data e ora dell'ultimo aggiornamento
}

/**
 * Interfaccia per la richiesta di creazione di un nuovo utente
 * Contiene tutti i campi obbligatori per la registrazione
 */
export interface CreateUserRequest {
  username: string;                              // Nome utente (obbligatorio)
  email: string;                                 // Email (obbligatorio)
  password: string;                              // Password in chiaro (obbligatorio)
  firstName: string;                             // Nome (obbligatorio)
  lastName: string;                              // Cognome (obbligatorio)
  role?: 'admin' | 'user' | 'manager';          // Ruolo (opzionale, default: 'user')
}

/**
 * Interfaccia per la richiesta di aggiornamento di un utente esistente
 * Tutti i campi sono opzionali per permettere aggiornamenti parziali
 */
export interface UpdateUserRequest {
  username?: string;                             // Nome utente (opzionale)
  email?: string;                                // Email (opzionale)
  firstName?: string;                            // Nome (opzionale)
  lastName?: string;                             // Cognome (opzionale)
  role?: 'admin' | 'user' | 'manager';          // Ruolo (opzionale)
  isActive?: boolean;                            // Stato attivo (opzionale)
}

/**
 * Interfaccia per la richiesta di login
 * Contiene le credenziali necessarie per l'autenticazione
 */
export interface LoginRequest {
  email: string;                                 // Email dell'utente
  password: string;                              // Password in chiaro
}

/**
 * Interfaccia per la risposta di autenticazione
 * Contiene il token JWT e i dati utente (senza password)
 */
export interface AuthResponse {
  token: string;                                 // Token JWT per l'autenticazione
  user: Omit<User, 'password'>;                 // Dati utente senza password
}

/**
 * Interfaccia per la risposta con dati utente
 * Versione "pulita" dell'utente senza password per le risposte API
 * Equivale a User ma senza il campo password
 */
export interface UserResponse {
  id: string;                                    // ID univoco dell'utente
  username: string;                              // Nome utente
  email: string;                                 // Email
  firstName: string;                             // Nome
  lastName: string;                              // Cognome
  role: 'admin' | 'user' | 'manager';           // Ruolo
  isActive: boolean;                             // Stato attivo
  createdAt: Date;                               // Data di creazione
  updatedAt: Date;                               // Data di aggiornamento
}
