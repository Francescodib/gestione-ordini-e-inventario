import { User, CreateUserRequest, UpdateUserRequest } from '../types/user';
import bcrypt from 'bcryptjs';

// In-memory storage (replace with database in production)
let users: User[] = [];
let nextId = 1;

export class UserService {
  // Create user
  static async createUser(userData: CreateUserRequest): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const newUser: User = {
      id: nextId.toString(),
      ...userData,
      password: hashedPassword,
      role: userData.role || 'user',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    users.push(newUser);
    nextId++;
    return newUser;
  }

  // Get all users
  static async getAllUsers(): Promise<User[]> {
    return users;
  }

  // Get user by ID
  static async getUserById(id: string): Promise<User | null> {
    return users.find(user => user.id === id) || null;
  }

  // Get user by email
  static async getUserByEmail(email: string): Promise<User | null> {
    return users.find(user => user.email === email) || null;
  }

  // Update user
  static async updateUser(id: string, userData: UpdateUserRequest): Promise<User | null> {
    const userIndex = users.findIndex(user => user.id === id);
    if (userIndex === -1) return null;

    users[userIndex] = {
      ...users[userIndex],
      ...userData,
      updatedAt: new Date()
    };

    return users[userIndex];
  }

  // Delete user
  static async deleteUser(id: string): Promise<boolean> {
    const userIndex = users.findIndex(user => user.id === id);
    if (userIndex === -1) return false;

    users.splice(userIndex, 1);
    return true;
  }

  // Verify password
  static async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }
}
