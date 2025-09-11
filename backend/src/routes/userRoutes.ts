import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserService } from '../services/userService';
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
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: toUserResponse(newUser)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user', error: error.message });
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

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: toUserResponse(user)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error during login', error: error.message });
  }
});

// GET /api/users - Get all users (protected)
router.get('/', async (req: Request, res: Response) => {
  try {
    const users = await UserService.getAllUsers();
    const userResponses = users.map(toUserResponse);
    res.json(userResponses);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

// GET /api/users/:id - Get user by ID (protected)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = await UserService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(toUserResponse(user));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user', error: error.message });
  }
});

// PUT /api/users/:id - Update user (protected)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userData: UpdateUserRequest = req.body;
    const updatedUser = await UserService.updateUser(req.params.id, userData);
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(toUserResponse(updatedUser));
  } catch (error) {
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
});

// DELETE /api/users/:id - Delete user (protected)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await UserService.deleteUser(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
});

export default router;
