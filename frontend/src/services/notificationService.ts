/**
 * Real-time Notification Service for Frontend
 * Manages WebSocket connections and real-time notifications using socket.io-client
 */

import { io, Socket } from 'socket.io-client';

export interface NotificationPayload {
  type: 'ORDER_STATUS_CHANGE' | 'ORDER_CREATED' | 'INVENTORY_LOW' | 'SYSTEM_ALERT';
  title: string;
  message: string;
  data?: any;
  userId?: number;
  userRole?: 'USER' | 'MANAGER' | 'ADMIN';
  timestamp: Date | string;
  orderId?: number;
}

export interface NotificationHandlers {
  onNotification?: (notification: NotificationPayload) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
  onOrderStatusChange?: (notification: NotificationPayload) => void;
  onNewOrder?: (notification: NotificationPayload) => void;
  onLowInventory?: (notification: NotificationPayload) => void;
  onSystemAlert?: (notification: NotificationPayload) => void;
}

export class NotificationService {
  private socket: Socket | null = null;
  private handlers: NotificationHandlers = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(private serverUrl: string = import.meta.env.VITE_WS_URL || 'http://localhost:3000') {}

  /**
   * Connect to WebSocket server with authentication
   */
  public connect(token: string, handlers: NotificationHandlers = {}): void {
    this.handlers = handlers;

    if (this.socket?.connected) {
      this.disconnect();
    }

    this.socket = io(this.serverUrl, {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      timeout: 5000
    });

    this.setupEventListeners();
  }

  /**
   * Setup all event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('📡 Connected to notification service');
      this.reconnectAttempts = 0;
      this.handlers.onConnect?.();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('📡 Disconnected from notification service:', reason);
      this.handlers.onDisconnect?.();
    });

    this.socket.on('connect_error', (error) => {
      console.error('📡 Connection error:', error);
      this.reconnectAttempts++;
      this.handlers.onError?.(error);

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('📡 Max reconnection attempts reached');
      }
    });

    // Notification events
    this.socket.on('notification', (notification: NotificationPayload) => {
      console.log('📬 Received notification:', notification);

      // Call general notification handler
      this.handlers.onNotification?.(notification);

      // Call specific type handlers
      switch (notification.type) {
        case 'ORDER_STATUS_CHANGE':
          this.handlers.onOrderStatusChange?.(notification);
          break;
        case 'ORDER_CREATED':
          this.handlers.onNewOrder?.(notification);
          break;
        case 'INVENTORY_LOW':
          this.handlers.onLowInventory?.(notification);
          break;
        case 'SYSTEM_ALERT':
          this.handlers.onSystemAlert?.(notification);
          break;
      }
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('📡 Socket error:', error);
      this.handlers.onError?.(error);
    });
  }

  /**
   * Join a specific notification room
   */
  public joinRoom(room: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join_room', room);
      console.log(`📡 Joined room: ${room}`);
    }
  }

  /**
   * Leave a specific notification room
   */
  public leaveRoom(room: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave_room', room);
      console.log(`📡 Left room: ${room}`);
    }
  }

  /**
   * Mark a notification as read
   */
  public markAsRead(notificationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('mark_notification_read', notificationId);
    }
  }

  /**
   * Send a test notification (for debugging)
   */
  public sendTestNotification(): void {
    if (this.socket?.connected) {
      this.socket.emit('test_notification');
    }
  }

  /**
   * Update event handlers
   */
  public updateHandlers(handlers: Partial<NotificationHandlers>): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  /**
   * Get connection status
   */
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get socket ID
   */
  public getSocketId(): string | undefined {
    return this.socket?.id;
  }

  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('📡 Disconnected from notification service');
    }
  }

  /**
   * Manually reconnect
   */
  public reconnect(): void {
    if (this.socket) {
      this.socket.connect();
    }
  }

  /**
   * Get connection statistics
   */
  public getStats(): {
    connected: boolean;
    socketId?: string;
    reconnectAttempts: number;
    maxReconnectAttempts: number;
  } {
    return {
      connected: this.isConnected(),
      socketId: this.getSocketId(),
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }
}

// Global notification service instance
let notificationService: NotificationService | null = null;

/**
 * Get or create notification service instance
 */
export const getNotificationService = (): NotificationService => {
  if (!notificationService) {
    notificationService = new NotificationService();
  }
  return notificationService;
};

/**
 * Initialize notification service with token
 */
export const initializeNotificationService = (token: string, handlers?: NotificationHandlers): NotificationService => {
  const service = getNotificationService();
  service.connect(token, handlers);
  return service;
};

/**
 * Cleanup notification service
 */
export const cleanupNotificationService = (): void => {
  if (notificationService) {
    notificationService.disconnect();
    notificationService = null;
  }
};