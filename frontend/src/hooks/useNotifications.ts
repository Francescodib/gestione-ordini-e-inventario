/**
 * React Hook for Real-time Notifications
 * Manages WebSocket connection and notification state
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getNotificationService,
  initializeNotificationService,
  cleanupNotificationService
} from '../services/notificationService';

// Define interfaces locally to avoid import issues
interface NotificationPayload {
  type: 'ORDER_STATUS_CHANGE' | 'ORDER_CREATED' | 'INVENTORY_LOW' | 'SYSTEM_ALERT';
  title: string;
  message: string;
  data?: any;
  userId?: number;
  userRole?: 'USER' | 'MANAGER' | 'ADMIN';
  timestamp: Date | string;
  orderId?: number;
}

interface NotificationHandlers {
  onNotification?: (notification: NotificationPayload) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
  onOrderStatusChange?: (notification: NotificationPayload) => void;
  onNewOrder?: (notification: NotificationPayload) => void;
  onLowInventory?: (notification: NotificationPayload) => void;
  onSystemAlert?: (notification: NotificationPayload) => void;
}

export interface NotificationState {
  notifications: NotificationPayload[];
  unreadCount: number;
  connected: boolean;
  error: string | null;
}

export interface UseNotificationsOptions {
  maxNotifications?: number;
  autoMarkAsRead?: boolean;
  showToasts?: boolean;
  onNotification?: (notification: NotificationPayload) => void;
}

export const useNotifications = (token?: string, options: UseNotificationsOptions = {}) => {
  const {
    maxNotifications = 50,
    autoMarkAsRead = false,
    showToasts = true,
    onNotification
  } = options;

  const [state, setState] = useState<NotificationState>({
    notifications: [],
    unreadCount: 0,
    connected: false,
    error: null
  });

  const serviceRef = useRef(getNotificationService());
  const notificationsRef = useRef<NotificationPayload[]>([]);

  // Add notification to state
  const addNotification = useCallback((notification: NotificationPayload) => {
    const id = `${notification.type}-${Date.now()}-${Math.random()}`;
    const newNotification = {
      ...notification,
      id,
      timestamp: new Date(notification.timestamp),
      read: autoMarkAsRead
    };

    notificationsRef.current = [
      newNotification,
      ...notificationsRef.current.slice(0, maxNotifications - 1)
    ];

    setState(prev => ({
      ...prev,
      notifications: notificationsRef.current,
      unreadCount: prev.unreadCount + (autoMarkAsRead ? 0 : 1),
      error: null
    }));

    // Call external handler
    onNotification?.(newNotification);

    // Show browser notification if supported and enabled
    if (showToasts && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: id
      });
    }
  }, [autoMarkAsRead, maxNotifications, onNotification, showToasts]);

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    notificationsRef.current = notificationsRef.current.map(notif =>
      (notif as any).id === notificationId ? { ...notif, read: true } : notif
    );

    setState(prev => ({
      ...prev,
      notifications: notificationsRef.current,
      unreadCount: Math.max(0, prev.unreadCount - 1)
    }));

    serviceRef.current.markAsRead(notificationId);
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    notificationsRef.current = notificationsRef.current.map(notif => ({ ...notif, read: true }));

    setState(prev => ({
      ...prev,
      notifications: notificationsRef.current,
      unreadCount: 0
    }));
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    notificationsRef.current = [];
    setState(prev => ({
      ...prev,
      notifications: [],
      unreadCount: 0
    }));
  }, []);

  // Remove specific notification
  const removeNotification = useCallback((notificationId: string) => {
    const notification = notificationsRef.current.find(n => (n as any).id === notificationId);
    const wasUnread = notification && !(notification as any).read;

    notificationsRef.current = notificationsRef.current.filter(n => (n as any).id !== notificationId);

    setState(prev => ({
      ...prev,
      notifications: notificationsRef.current,
      unreadCount: wasUnread ? Math.max(0, prev.unreadCount - 1) : prev.unreadCount
    }));
  }, []);

  // Join room
  const joinRoom = useCallback((room: string) => {
    serviceRef.current.joinRoom(room);
  }, []);

  // Leave room
  const leaveRoom = useCallback((room: string) => {
    serviceRef.current.leaveRoom(room);
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }, []);

  // Initialize connection when token is available
  useEffect(() => {
    if (!token) {
      // Disconnect if no token
      setState(prev => ({ ...prev, connected: false, error: 'No authentication token' }));
      cleanupNotificationService();
      return;
    }

    const handlers: NotificationHandlers = {
      onNotification: addNotification,
      onConnect: () => {
        setState(prev => ({ ...prev, connected: true, error: null }));
      },
      onDisconnect: () => {
        setState(prev => ({ ...prev, connected: false }));
      },
      onError: (error) => {
        setState(prev => ({ ...prev, error: error.message || 'Connection error' }));
      }
    };

    try {
      initializeNotificationService(token, handlers);
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message || 'Failed to initialize notifications' }));
    }

    // Cleanup on unmount
    return () => {
      cleanupNotificationService();
    };
  }, [token, addNotification]);

  // Request notification permission on mount
  useEffect(() => {
    if (showToasts) {
      requestPermission();
    }
  }, [showToasts, requestPermission]);

  return {
    // State
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    connected: state.connected,
    error: state.error,

    // Actions
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
    joinRoom,
    leaveRoom,
    requestPermission,

    // Service access
    service: serviceRef.current
  };
};