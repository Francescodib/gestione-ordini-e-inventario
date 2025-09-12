/**
 * Router per la gestione delle rotte degli utenti
 * Definisce tutti gli endpoint per l'autenticazione e la gestione degli utenti
 * Include rotte pubbliche (registrazione, login) e protette (CRUD utenti)
 */

import express, { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { AuthService } from '../services/authService';
import { verifyToken } from '../middleware/auth';
import { CreateUserRequest, UpdateUserRequest, LoginRequest, UserResponse } from '../types/user';

// Inizializzazione del router Express
const router = express.Router();

/**
 * Funzione helper per convertire un oggetto User in UserResponse
 * Rimuove la password dai dati utente prima di inviarli al client
 * 
 * @param user - Oggetto User completo
 * @returns Oggetto UserResponse senza password
 */
const toUserResponse = (user: any): UserResponse => {
  const { password, ...userResponse } = user;
  return userResponse;
};

// ==========================================
// ROTTE PUBBLICHE (senza autenticazione)
// ==========================================

/**
 * POST /api/users/register
 * Registrazione di un nuovo utente
 * ROTTA PUBBLICA - Non richiede autenticazione
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const userData: CreateUserRequest = req.body;
    
    // Verifica se l'utente esiste già con questa email
    const existingUser = await UserService.getUserByEmail(userData.email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Creazione del nuovo utente
    const newUser = await UserService.createUser(userData);
    // Generazione della risposta di autenticazione con token
    const authResponse = AuthService.createAuthResponse(newUser);

    res.status(201).json(authResponse);
  } catch (error) {
    res.status(500).json({ message: 'Error creating user', error: (error as Error).message });
  }
});

/**
 * POST /api/users/login
 * Login di un utente esistente
 * ROTTA PUBBLICA - Non richiede autenticazione
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password }: LoginRequest = req.body;
    
    // Ricerca dell'utente per email
    const user = await UserService.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verifica della password
    const isValidPassword = await UserService.verifyPassword(user, password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generazione della risposta di autenticazione
    const authResponse = AuthService.createAuthResponse(user);
    res.json(authResponse);
  } catch (error) {
    res.status(500).json({ message: 'Error during login', error: (error as Error).message });
  }
});

/**
 * POST /api/users/refresh
 * Rinnovo del token JWT
 * ROTTA PUBBLICA - Richiede solo il token da rinnovare
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    // Tentativo di rinnovo del token
    const newToken = AuthService.refreshToken(token);
    if (!newToken) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    res.json({ token: newToken });
  } catch (error) {
    res.status(500).json({ message: 'Error refreshing token', error: (error as Error).message });
  }
});

// ==========================================
// ROTTE PROTETTE (richiedono autenticazione)
// ==========================================

/**
 * GET /api/users/me
 * Recupero del profilo dell'utente corrente
 * ROTTA PROTETTA - Richiede token JWT valido
 */
router.get('/me', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Recupero dei dati utente dal database
    const user = await UserService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Invio della risposta senza password
    res.json(toUserResponse(user));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user profile', error: (error as Error).message });
  }
});

/**
 * GET /api/users
 * Recupero di tutti gli utenti
 * ROTTA PROTETTA - Richiede token JWT valido
 */
router.get('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const users = await UserService.getAllUsers();
    // Rimozione delle password da tutti gli utenti
    const userResponses = users.map(toUserResponse);
    res.json(userResponses);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: (error as Error).message });
  }
});

/**
 * GET /api/users/:id
 * Recupero di un utente specifico per ID
 * ROTTA PROTETTA - Richiede token JWT valido
 */
router.get('/:id', verifyToken, async (req: Request, res: Response) => {
  try {
    const user = await UserService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(toUserResponse(user));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user', error: (error as Error).message });
  }
});

/**
 * PUT /api/users/:id
 * Aggiornamento di un utente esistente
 * ROTTA PROTETTA - Richiede token JWT valido
 */
router.put('/:id', verifyToken, async (req: Request, res: Response) => {
  try {
    const userData: UpdateUserRequest = req.body;
    const updatedUser = await UserService.updateUser(req.params.id, userData);
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(toUserResponse(updatedUser));
  } catch (error) {
    res.status(500).json({ message: 'Error updating user', error: (error as Error).message });
  }
});

/**
 * DELETE /api/users/:id
 * Eliminazione di un utente
 * ROTTA PROTETTA - Richiede token JWT valido
 */
router.delete('/:id', verifyToken, async (req: Request, res: Response) => {
  try {
    const deleted = await UserService.deleteUser(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user', error: (error as Error).message });
  }
});

export default router;
