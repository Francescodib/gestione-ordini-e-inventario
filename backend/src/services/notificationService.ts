/**
 * Real-time Notification Service
 * Manages WebSocket connections and real-time notifications for order status changes
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { logger } from '../config/logger';
import { User } from '../models';

export interface NotificationPayload {
  type: 'ORDER_STATUS_CHANGE' | 'ORDER_CREATED' | 'PAYMENT_STATUS_CHANGE' | 'INVENTORY_LOW' | 'STOCK_ALERT' | 'SYSTEM_ALERT';
  title: string;
  message: string;
  data?: any;
  userId?: number;
  userRole?: 'CLIENT' | 'MANAGER' | 'ADMIN';
  timestamp: Date;
  orderId?: number;
  productId?: number;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface AuthenticatedSocket extends Socket {
  user?: {
    id: number;
    email: string;
    role: 'CLIENT' | 'MANAGER' | 'ADMIN';
  };
}

export class NotificationService {
  private io: SocketIOServer;
  private connectedUsers = new Map<number, AuthenticatedSocket[]>(); // userId -> sockets

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || ["http://localhost:5173", "http://localhost:5174"],
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    logger.info('NotificationService initialized');
  }

  private setupEventHandlers(): void {
    this.io.use(this.authenticateSocket.bind(this));

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);

      socket.on('disconnect', () => {
        this.handleDisconnection(socket);
      });

      socket.on('join_room', (room: string) => {
        this.handleJoinRoom(socket, room);
      });

      socket.on('leave_room', (room: string) => {
        this.handleLeaveRoom(socket, room);
      });

      socket.on('mark_notification_read', (notificationId: string) => {
        this.handleMarkNotificationRead(socket, notificationId);
      });
    });
  }

  private async authenticateSocket(socket: AuthenticatedSocket, next: (err?: Error) => void): Promise<void> {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      // Verify user still exists and is active
      const user = await User.findByPk(decoded.userId);
      if (!user || !user.isActive) {
        return next(new Error('User not found or inactive'));
      }

      socket.user = {
        id: user.id,
        email: user.email,
        role: user.role
      };

      next();
    } catch (error: any) {
      logger.warn('Socket authentication failed', { error: error.message });
      next(new Error('Authentication failed'));
    }
  }

  private handleConnection(socket: AuthenticatedSocket): void {
    if (!socket.user) return;

    const userId = socket.user.id;

    // Add socket to user's connections
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, []);
    }
    this.connectedUsers.get(userId)!.push(socket);

    // Join user-specific room
    socket.join(`user:${userId}`);

    // Join role-specific rooms
    socket.join(`role:${socket.user.role}`);

    // Join general notifications room
    socket.join('general');

    logger.info('Socket connected', {
      socketId: socket.id,
      userId: socket.user.id,
      userEmail: socket.user.email,
      role: socket.user.role,
      totalConnections: this.connectedUsers.get(userId)?.length || 0
    });

    logger.info('User connected to notifications', {
      userId: socket.user.id,
      userEmail: socket.user.email,
      role: socket.user.role
    });
  }

  private handleDisconnection(socket: AuthenticatedSocket): void {
    if (!socket.user) return;

    const userId = socket.user.id;
    const userSockets = this.connectedUsers.get(userId);

    if (userSockets) {
      const index = userSockets.indexOf(socket);
      if (index > -1) {
        userSockets.splice(index, 1);
      }

      // Remove user entry if no more sockets
      if (userSockets.length === 0) {
        this.connectedUsers.delete(userId);
      }
    }

    logger.info('Socket disconnected', {
      socketId: socket.id,
      userId: socket.user.id,
      remainingConnections: userSockets?.length || 0
    });
  }

  private handleJoinRoom(socket: AuthenticatedSocket, room: string): void {
    if (!socket.user) return;

    // Validate room access based on user role
    if (!this.canJoinRoom(socket.user, room)) {
      socket.emit('error', { message: 'Insufficient permissions to join room' });
      return;
    }

    socket.join(room);
    logger.debug('Socket joined room', {
      socketId: socket.id,
      userId: socket.user.id,
      room
    });
  }

  private handleLeaveRoom(socket: AuthenticatedSocket, room: string): void {
    socket.leave(room);
    logger.debug('Socket left room', {
      socketId: socket.id,
      userId: socket.user?.id,
      room
    });
  }

  private handleMarkNotificationRead(socket: AuthenticatedSocket, notificationId: string): void {
    // Here you could implement notification read status tracking
    logger.debug('Notification marked as read', {
      socketId: socket.id,
      userId: socket.user?.id,
      notificationId
    });
  }

  private canJoinRoom(user: { role: string }, room: string): boolean {
    // Admin can join any room
    if (user.role === 'ADMIN') return true;

    // Define room access rules
    const allowedRooms = {
      CLIENT: ['general', `user:${user}`, 'role:CLIENT'],
      MANAGER: ['general', `user:${user}`, 'role:CLIENT', 'role:MANAGER', 'orders', 'inventory'],
      ADMIN: ['*'] // Already handled above
    };

    const userAllowedRooms = allowedRooms[user.role as keyof typeof allowedRooms] || [];
    return userAllowedRooms.includes('*') || userAllowedRooms.includes(room);
  }

  /**
   * Send notification to specific user
   */
  public notifyUser(userId: number, notification: NotificationPayload): void {
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets && userSockets.length > 0) {
      userSockets.forEach(socket => {
        socket.emit('notification', notification);
      });

      logger.debug('Notification sent to user', {
        userId,
        type: notification.type,
        socketsCount: userSockets.length
      });
    }
  }

  /**
   * Send notification to users with specific role
   */
  public notifyRole(role: 'CLIENT' | 'MANAGER' | 'ADMIN', notification: NotificationPayload): void {
    this.io.to(`role:${role}`).emit('notification', notification);

    logger.debug('Notification sent to role', {
      role,
      type: notification.type
    });
  }

  /**
   * Send notification to all admins
   */
  public notifyAdmins(notification: NotificationPayload): void {
    this.notifyRole('ADMIN', notification);
  }

  /**
   * Send notification to all managers and admins
   */
  public notifyManagers(notification: NotificationPayload): void {
    this.notifyRole('MANAGER', notification);
    this.notifyRole('ADMIN', notification);
  }

  /**
   * Send notification to all connected users
   */
  public notifyAll(notification: NotificationPayload): void {
    this.io.to('general').emit('notification', notification);

    logger.debug('Notification sent to all users', {
      type: notification.type
    });
  }

  /**
   * Send notification to specific room
   */
  public notifyRoom(room: string, notification: NotificationPayload): void {
    this.io.to(room).emit('notification', notification);

    logger.debug('Notification sent to room', {
      room,
      type: notification.type
    });
  }

  /**
   * Order status change notification
   */
  public async notifyOrderStatusChange(orderId: number, oldStatus: string, newStatus: string, userId?: number): Promise<void> {
    const notification: NotificationPayload = {
      type: 'ORDER_STATUS_CHANGE',
      title: 'Stato Ordine Aggiornato',
      message: `Ordine #${orderId} cambiato da "${oldStatus}" a "${newStatus}"`,
      timestamp: new Date(),
      orderId,
      data: {
        orderId,
        oldStatus,
        newStatus
      }
    };

    // Always notify managers and admins
    this.notifyManagers(notification);

    // Notify the customer only if they are not already an admin/manager
    if (userId) {
      // Check if user has admin/manager role by looking at connected user sockets
      const userSockets = this.connectedUsers.get(userId);
      let isAdminOrManager = false;

      if (userSockets && userSockets.length > 0) {
        // Check the role from any socket (they should all have same user)
        const userRole = userSockets[0].user?.role;
        isAdminOrManager = userRole === 'ADMIN' || userRole === 'MANAGER';
      }

      // Only notify as customer if they're not admin/manager
      if (!isAdminOrManager) {
        this.notifyUser(userId, notification);
      }
    }
  }

  /**
   * New order notification
   */
  public notifyNewOrder(orderId: number, customerName: string, totalAmount: number): void {
    const notification: NotificationPayload = {
      type: 'ORDER_CREATED',
      title: 'Nuovo Ordine Ricevuto',
      message: `Nuovo ordine #${orderId} da ${customerName} per €${totalAmount.toFixed(2)}`,
      timestamp: new Date(),
      orderId,
      data: {
        orderId,
        customerName,
        totalAmount
      }
    };

    this.notifyManagers(notification);
  }

  /**
   * Low inventory notification
   */
  public notifyLowInventory(productName: string, currentStock: number, minStock: number): void {
    const notification: NotificationPayload = {
      type: 'INVENTORY_LOW',
      title: 'Scorte in Esaurimento',
      message: `${productName}: solo ${currentStock} rimanenti (minimo: ${minStock})`,
      timestamp: new Date(),
      data: {
        productName,
        currentStock,
        minStock
      }
    };

    this.notifyManagers(notification);
  }

  /**
   * Get connection statistics
   */
  public getStats(): {
    totalConnectedUsers: number;
    totalActiveSockets: number;
    connectionsByRole: Record<string, number>;
  } {
    const connectionsByRole: Record<string, number> = { USER: 0, MANAGER: 0, ADMIN: 0 };
    let totalSockets = 0;

    this.connectedUsers.forEach(sockets => {
      totalSockets += sockets.length;
      sockets.forEach(socket => {
        if (socket.user?.role) {
          connectionsByRole[socket.user.role] = (connectionsByRole[socket.user.role] || 0) + 1;
        }
      });
    });

    return {
      totalConnectedUsers: this.connectedUsers.size,
      totalActiveSockets: totalSockets,
      connectionsByRole
    };
  }

  /**
   * Close all connections and cleanup
   */
  public shutdown(): void {
    this.io.close();
    this.connectedUsers.clear();
    logger.info('NotificationService shutdown completed');
  }

  /**
   * Payment status change notification
   */
  public async notifyPaymentStatusChange(orderId: number, oldStatus: string, newStatus: string, userId?: number): Promise<void> {
    const notification: NotificationPayload = {
      type: 'PAYMENT_STATUS_CHANGE',
      title: 'Stato Pagamento Aggiornato',
      message: `Pagamento ordine #${orderId} cambiato da "${oldStatus}" a "${newStatus}"`,
      timestamp: new Date(),
      orderId,
      priority: newStatus === 'PAID' ? 'medium' : newStatus === 'FAILED' ? 'high' : 'low',
      data: {
        orderId,
        oldStatus,
        newStatus
      }
    };

    // Always notify managers and admins
    this.notifyManagers(notification);

    // Notify the customer only if they are not already an admin/manager
    if (userId) {
      const userSockets = this.connectedUsers.get(userId);
      let isAdminOrManager = false;

      if (userSockets && userSockets.length > 0) {
        const userRole = userSockets[0].user?.role;
        isAdminOrManager = userRole === 'ADMIN' || userRole === 'MANAGER';
      }

      if (!isAdminOrManager) {
        this.notifyUser(userId, notification);
      }
    }
  }

  /**
   * Stock alert notification for products that are low in stock
   */
  public notifyStockAlert(productId: number, productName: string, currentStock: number, threshold: number): void {
    const priority = currentStock === 0 ? 'critical' :
                    currentStock <= threshold / 2 ? 'high' : 'medium';

    const notification: NotificationPayload = {
      type: 'STOCK_ALERT',
      title: currentStock === 0 ? 'Prodotto Esaurito' : 'Scorte Basse',
      message: currentStock === 0
        ? `${productName} è esaurito!`
        : `${productName}: solo ${currentStock} unità rimaste (soglia: ${threshold})`,
      timestamp: new Date(),
      productId,
      priority,
      data: {
        productId,
        productName,
        currentStock,
        threshold,
        isOutOfStock: currentStock === 0
      }
    };

    // Only notify managers and admins for stock alerts
    this.notifyManagers(notification);
  }

  /**
   * Get list of products that are currently low in stock
   */
  public async notifyLowStockProducts(products: Array<{id: number, name: string, stock: number, minStock?: number}>): Promise<void> {
    if (products.length === 0) return;

    const notification: NotificationPayload = {
      type: 'INVENTORY_LOW',
      title: `${products.length} Prodotti con Scorte Basse`,
      message: `Ci sono ${products.length} prodotti che necessitano rifornimento`,
      timestamp: new Date(),
      priority: 'medium',
      data: {
        products: products.map(p => ({
          id: p.id,
          name: p.name,
          stock: p.stock,
          minStock: p.minStock || 10
        }))
      }
    };

    this.notifyManagers(notification);
  }
}

// Global instance
let notificationService: NotificationService | null = null;

export const initializeNotificationService = (server: HTTPServer): NotificationService => {
  if (notificationService) {
    return notificationService;
  }

  notificationService = new NotificationService(server);
  return notificationService;
};

export const getNotificationService = (): NotificationService | null => {
  return notificationService;
};