/**
 * Router per la gestione delle rotte degli utenti
 * Sistema di gestione utenti con Prisma e SQLite
 */

import express, { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { AuthService } from '../services/authService';
import { verifyToken } from '../middleware/auth';
import { CreateUserRequest, UpdateUserRequest, LoginRequest, UserResponse } from '../types/auth';
import { logger } from '../config/logger';
import { 
  validateBody, 
  validateQuery, 
  validateId,
  sanitizeInput,
  validateContentType,
  handleValidationErrors
} from "../middleware/validation";
import {
  createUserSchema,
  loginUserSchema,
  updateUserSchema,
  changePasswordSchema,
  paginationSchema
} from "../validation/schemas";

// Inizializzazione del router Express
const router = express.Router();

// ==========================================
// ROTTE PUBBLICHE (senza autenticazione)
// ==========================================

/**
 * POST /api/users/register
 * Registrazione di un nuovo utente
 */
router.post('/register', 
  sanitizeInput(),
  validateContentType(),
  validateBody(createUserSchema),
  async (req: Request, res: Response) => {
  try {
    const userData: CreateUserRequest = req.body;
    
    // Validazione input base
    if (!userData.email || !userData.password || !userData.firstName || !userData.lastName) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields: email, password, firstName, lastName' 
      });
    }

    if (userData.password.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Verifica se l'utente esiste già
    const existingUser = await UserService.getUserByEmail(userData.email);
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'User already exists with this email' 
      });
    }

    // Se username non fornito, genera da email
    if (!userData.username) {
      userData.username = userData.email.split('@')[0];
    }

    // Verifica se username esiste già
    const existingUsername = await UserService.getUserByUsername(userData.username);
    if (existingUsername) {
      return res.status(400).json({ 
        success: false,
        message: 'Username already exists' 
      });
    }

    // Creazione del nuovo utente
    const newUser = await UserService.createUser(userData);
    
    // Conversione per risposta (rimuove dati sensibili)
    const userForToken = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      role: newUser.role,
      isActive: newUser.isActive,
      emailVerified: newUser.emailVerified,
      lastLogin: newUser.lastLogin,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt
    };

    // Generazione della risposta di autenticazione con token
    const authResponse = AuthService.createAuthResponse(userForToken as any);

    res.status(201).json({
      success: true,
      ...authResponse,
      message: 'User registered successfully'
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error creating user', 
      error: error.message 
    });
  }
});

/**
 * POST /api/users/login
 * Login di un utente esistente
 */
router.post('/login', 
  sanitizeInput(),
  validateContentType(),
  validateBody(loginUserSchema),
  async (req: Request, res: Response) => {
  try {
    const { email, password }: LoginRequest = req.body;
    
    // Validazione input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required' 
      });
    }

    // Autenticazione dell'utente
    const user = await UserService.authenticateUser(email, password);
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Conversione per token
    const userForToken = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    // Generazione della risposta di autenticazione
    const authResponse = AuthService.createAuthResponse(userForToken as any);
    
    // Log successful login
    logger.info('User login successful', { userId: user.id, ip: req.ip });
    
    res.json({
      success: true,
      ...authResponse,
      message: 'Login successful'
    });
  } catch (error: any) {
    logger.error('Login error:', error);
    
    // Log failed login attempt
    logger.warn('User login failed', { email: req.body?.email || 'unknown', ip: req.ip });
    
    res.status(500).json({ 
      success: false,
      message: 'Error during login', 
      error: error.message 
    });
  }
});

/**
 * POST /api/users/refresh
 * Rinnovo del token JWT
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    // Tentativo di rinnovo del token
    const newToken = AuthService.refreshToken(token);
    if (!newToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    res.json({
      success: true,
      token: newToken,
      message: 'Token refreshed successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error refreshing token',
      error: error.message
    });
  }
});

/**
 * POST /api/users/reset-password
 * Richiesta reset password (invio email)
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Verifica se l'utente esiste
    const user = await UserService.getUserByEmail(email);
    if (!user) {
      // Per sicurezza, non rivelare se l'email esiste o meno
      return res.json({
        success: true,
        message: 'If the email exists in our system, a password reset link will be sent.'
      });
    }

    // TODO: In una implementazione reale, qui dovresti:
    // 1. Generare un token temporaneo per il reset
    // 2. Salvarlo nel database con una scadenza
    // 3. Inviare una email all'utente con il link di reset
    //
    // Per ora simuliamo l'invio
    logger.info('Password reset requested', {
      userId: user.id,
      email: user.email,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Password reset email sent successfully'
    });
  } catch (error: any) {
    logger.error('Password reset error:', error);

    res.status(500).json({
      success: false,
      message: 'Error processing password reset request',
      error: error.message
    });
  }
});

// ==========================================
// ROTTE PROTETTE (richiedono autenticazione)
// ==========================================

/**
 * GET /api/users/me
 * Recupero del profilo dell'utente corrente
 */
router.get('/me', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: 'User not authenticated' 
      });
    }

    // Recupero dei dati utente dal database
    const user = await UserService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Conversione per risposta
    const userResponse: UserResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.json({
      success: true,
      data: userResponse
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      message: 'Error fetching user profile', 
      error: error.message 
    });
  }
});

/**
 * GET /api/users
 * Recupero di tutti gli utenti (con paginazione opzionale)
 */
router.get('/', 
  verifyToken,
  validateQuery(paginationSchema, { allowUnknown: true }),
  async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, role, active } = req.query;
    
    // Per ora implementazione semplice, in seguito aggiungeremo paginazione
    let users;
    
    if (role) {
      users = await UserService.getUsersByRole(role as any);
    } else {
      const includeInactive = active === 'false' ? true : false;
      users = await UserService.getAllUsers(!includeInactive);
    }

    // Conversione per risposta
    const userResponses = users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));

    res.json({
      success: true,
      data: userResponses,
      count: userResponses.length
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      message: 'Error fetching users', 
      error: error.message 
    });
  }
});

/**
 * GET /api/users/search
 * Ricerca utenti per nome o email
 */
router.get('/search', verifyToken, async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ 
        success: false,
        message: 'Search query parameter "q" is required' 
      });
    }

    const users = await UserService.searchUsers(q);
    
    const userResponses = users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));

    res.json({
      success: true,
      data: userResponses,
      count: userResponses.length
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      message: 'Error searching users', 
      error: error.message 
    });
  }
});

/**
 * GET /api/users/stats
 * Statistiche degli utenti
 */
router.get('/stats', verifyToken, async (req: Request, res: Response) => {
  try {
    const stats = await UserService.getUserStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      message: 'Error fetching user stats', 
      error: error.message 
    });
  }
});

/**
 * GET /api/users/:id
 * Recupero di un utente specifico per ID
 */
router.get('/:id', 
  verifyToken,
  validateId(),
  async (req: Request, res: Response) => {
  try {
    const user = await UserService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    const userResponse: UserResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.json({
      success: true,
      data: userResponse
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      message: 'Error fetching user', 
      error: error.message 
    });
  }
});

/**
 * PUT /api/users/:id
 * Aggiornamento di un utente esistente
 */
router.put('/:id', 
  verifyToken,
  validateId(),
  sanitizeInput(),
  validateContentType(),
  validateBody(updateUserSchema),
  async (req: Request, res: Response) => {
  try {
    const userData: UpdateUserRequest = req.body;
    
    // Verifica conflitti email/username
    if (userData.email || userData.username) {
      const conflicts = await UserService.checkUserExists(
        userData.email, 
        userData.username, 
        req.params.id
      );
      
      if (conflicts.emailExists) {
        return res.status(400).json({ 
          success: false,
          message: 'Email already exists' 
        });
      }
      
      if (conflicts.usernameExists) {
        return res.status(400).json({ 
          success: false,
          message: 'Username already exists' 
        });
      }
    }

    const updatedUser = await UserService.updateUser(req.params.id, userData);
    
    if (!updatedUser) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    const userResponse: UserResponse = {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      role: updatedUser.role,
      isActive: updatedUser.isActive,
      emailVerified: updatedUser.emailVerified,
      lastLogin: updatedUser.lastLogin,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt
    };

    res.json({
      success: true,
      data: userResponse,
      message: 'User updated successfully'
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      message: 'Error updating user', 
      error: error.message 
    });
  }
});

/**
 * DELETE /api/users/:id
 * Eliminazione di un utente (soft delete)
 */
router.delete('/:id', verifyToken, async (req: Request, res: Response) => {
  try {
    const deleted = await UserService.deleteUser(req.params.id);
    if (!deleted) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    res.json({ 
      success: true,
      message: 'User deactivated successfully' 
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      message: 'Error deleting user', 
      error: error.message 
    });
  }
});

// Middleware di gestione errori di validazione
router.use(handleValidationErrors());

export default router;