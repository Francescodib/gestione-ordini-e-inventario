import express, { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { AuthService } from '../services/authService';
import { verifyToken } from '../middleware/auth';
import { CreateUserRequest, UpdateUserRequest, LoginRequest, UserResponse } from '../types/user';

const router = express.Router();

// Helper function to convert User to UserResponse (remove password)
const toUserResponse = (user: any): UserResponse => {
  const { password, ...userResponse } = user;
  return userResponse;
};

// POST /api/users/register - Register new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const userData: CreateUserRequest = req.body;
    
    // Check if user already exists
    const existingUser = await UserService.getUserByEmail(userData.email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const newUser = await UserService.createUser(userData);
    const authResponse = AuthService.createAuthResponse(newUser);

    res.status(201).json(authResponse);
  } catch (error) {
    res.status(500).json({ message: 'Error creating user', error: (error as Error).message });
  }
});

// POST /api/users/login - Login user
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password }: LoginRequest = req.body;
    
    const user = await UserService.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await UserService.verifyPassword(user, password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const authResponse = AuthService.createAuthResponse(user);
    res.json(authResponse);
  } catch (error) {
    res.status(500).json({ message: 'Error during login', error: (error as Error).message });
  }
});

// Note: verifyToken is already imported at the top

// POST /api/users/refresh - Refresh JWT token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    const newToken = AuthService.refreshToken(token);
    if (!newToken) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    res.json({ token: newToken });
  } catch (error) {
    res.status(500).json({ message: 'Error refreshing token', error: (error as Error).message });
  }
});

// GET /api/users/me - Get current user profile (protected)
router.get('/me', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const user = await UserService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(toUserResponse(user));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user profile', error: (error as Error).message });
  }
});

// GET /api/users - Get all users (protected)
router.get('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const users = await UserService.getAllUsers();
    const userResponses = users.map(toUserResponse);
    res.json(userResponses);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: (error as Error).message });
  }
});

// GET /api/users/:id - Get user by ID (protected)
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

// PUT /api/users/:id - Update user (protected)
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

// DELETE /api/users/:id - Delete user (protected)
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
