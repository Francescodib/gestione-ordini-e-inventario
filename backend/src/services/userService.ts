/**
 * Servizio per la gestione degli utenti
 * Implementa tutte le operazioni CRUD per gli utenti e la gestione delle password
 * NOTA: Attualmente usa storage in memoria - sostituire con database in produzione
 */

import { User, CreateUserRequest, UpdateUserRequest } from '../types/user';
import bcrypt from 'bcryptjs';

// ==========================================
// STORAGE IN MEMORIA (TEMPORANEO)
// ==========================================

/**
 * Array per memorizzare gli utenti in memoria
 * NOTA: Sostituire con connessione database in produzione
 */
let users: User[] = [];

/**
 * Contatore per generare ID univoci
 * NOTA: In produzione usare UUID o auto-increment del database
 */
let nextId = 1;

/**
 * Classe di servizio per la gestione degli utenti
 * Implementa tutte le operazioni CRUD e di autenticazione
 */
export class UserService {
  
  // ==========================================
  // OPERAZIONI CRUD UTENTI
  // ==========================================

  /**
   * Crea un nuovo utente nel sistema
   * Hasha la password e assegna un ID univoco
   * 
   * @param userData - Dati per la creazione dell'utente
   * @returns Oggetto User creato con ID e password hashata
   */
  static async createUser(userData: CreateUserRequest): Promise<User> {
    // Hash della password con salt rounds = 10
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    // Creazione dell'oggetto utente completo
    const newUser: User = {
      id: nextId.toString(),           // ID univoco generato
      ...userData,                     // Spread dei dati forniti
      password: hashedPassword,        // Password hashata
      role: userData.role || 'user',   // Ruolo di default se non specificato
      isActive: true,                  // Utente attivo di default
      createdAt: new Date(),           // Timestamp di creazione
      updatedAt: new Date()            // Timestamp di aggiornamento
    };
    
    // Aggiunta alla lista in memoria
    users.push(newUser);
    nextId++;
    return newUser;
  }

  /**
   * Recupera tutti gli utenti dal sistema
   * 
   * @returns Array di tutti gli utenti
   */
  static async getAllUsers(): Promise<User[]> {
    return users;
  }

  /**
   * Recupera un utente specifico per ID
   * 
   * @param id - ID dell'utente da cercare
   * @returns Oggetto User o null se non trovato
   */
  static async getUserById(id: string): Promise<User | null> {
    return users.find(user => user.id === id) || null;
  }

  /**
   * Recupera un utente specifico per email
   * Utile per l'autenticazione durante il login
   * 
   * @param email - Email dell'utente da cercare
   * @returns Oggetto User o null se non trovato
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    return users.find(user => user.email === email) || null;
  }

  /**
   * Aggiorna i dati di un utente esistente
   * Mantiene i dati non specificati invariati
   * 
   * @param id - ID dell'utente da aggiornare
   * @param userData - Nuovi dati per l'utente
   * @returns Oggetto User aggiornato o null se non trovato
   */
  static async updateUser(id: string, userData: UpdateUserRequest): Promise<User | null> {
    const userIndex = users.findIndex(user => user.id === id);
    if (userIndex === -1) return null;

    // Aggiornamento con spread operator per mantenere i dati esistenti
    users[userIndex] = {
      ...users[userIndex],     // Dati esistenti
      ...userData,             // Nuovi dati (sovrascrivono quelli esistenti)
      updatedAt: new Date()    // Aggiornamento timestamp
    };

    return users[userIndex];
  }

  /**
   * Elimina un utente dal sistema
   * 
   * @param id - ID dell'utente da eliminare
   * @returns true se eliminato con successo, false se non trovato
   */
  static async deleteUser(id: string): Promise<boolean> {
    const userIndex = users.findIndex(user => user.id === id);
    if (userIndex === -1) return false;

    // Rimozione dall'array
    users.splice(userIndex, 1);
    return true;
  }

  // ==========================================
  // OPERAZIONI DI AUTENTICAZIONE
  // ==========================================

  /**
   * Verifica se la password fornita corrisponde a quella dell'utente
   * Confronta la password in chiaro con l'hash memorizzato
   * 
   * @param user - Oggetto utente con password hashata
   * @param password - Password in chiaro da verificare
   * @returns true se la password è corretta, false altrimenti
   */
  static async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }
}
