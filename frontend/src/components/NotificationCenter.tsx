/**
 * Notification Center Component
 * Displays real-time notifications with a dropdown interface
 */

import React, { useState } from 'react';
import {
  Bell,
  BellRing,
  X,
  CheckCircle,
  AlertCircle,
  Package,
  ShoppingCart,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

// Define NotificationPayload locally to avoid import issues
interface NotificationPayload {
  type: 'ORDER_STATUS_CHANGE' | 'ORDER_CREATED' | 'PAYMENT_STATUS_CHANGE' | 'INVENTORY_LOW' | 'STOCK_ALERT' | 'SYSTEM_ALERT';
  title: string;
  message: string;
  data?: any;
  userId?: number;
  userRole?: 'CLIENT' | 'MANAGER' | 'ADMIN';
  timestamp: Date | string;
  orderId?: number;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

interface NotificationCenterProps {
  token?: string;
  className?: string;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ token, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);

  const {
    notifications,
    unreadCount,
    connected,
    error,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification
  } = useNotifications(token, {
    maxNotifications: 20,
    showToasts: true
  });

  const getNotificationIcon = (type: NotificationPayload['type']) => {
    const iconClass = "h-4 w-4";

    switch (type) {
      case 'ORDER_STATUS_CHANGE':
        return <Package className={`${iconClass} text-blue-500`} />;
      case 'ORDER_CREATED':
        return <ShoppingCart className={`${iconClass} text-green-500`} />;
      case 'PAYMENT_STATUS_CHANGE':
        return <CheckCircle className={`${iconClass} text-purple-500`} />;
      case 'INVENTORY_LOW':
      case 'STOCK_ALERT':
        return <AlertCircle className={`${iconClass} text-orange-500`} />;
      case 'SYSTEM_ALERT':
        return <AlertCircle className={`${iconClass} text-red-500`} />;
      default:
        return <Bell className={`${iconClass} text-gray-500`} />;
    }
  };

  const getNotificationColor = (type: NotificationPayload['type'], priority?: string) => {
    // Priority override for critical and high priority notifications
    if (priority === 'critical') {
      return 'border-l-red-600 bg-red-100 border-red-300';
    }
    if (priority === 'high') {
      return 'border-l-orange-600 bg-orange-100 border-orange-300';
    }

    switch (type) {
      case 'ORDER_STATUS_CHANGE':
        return 'border-l-blue-500 bg-blue-50';
      case 'ORDER_CREATED':
        return 'border-l-green-500 bg-green-50';
      case 'PAYMENT_STATUS_CHANGE':
        return 'border-l-purple-500 bg-purple-50';
      case 'INVENTORY_LOW':
      case 'STOCK_ALERT':
        return 'border-l-orange-500 bg-orange-50';
      case 'SYSTEM_ALERT':
        return 'border-l-red-500 bg-red-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const formatTime = (timestamp: Date | string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ora';
    if (minutes < 60) return `${minutes}m fa`;
    if (hours < 24) return `${hours}h fa`;
    return `${days}g fa`;
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Handle navigation based on notification type
    if (notification.type === 'ORDER_STATUS_CHANGE' || notification.type === 'ORDER_CREATED' || notification.type === 'PAYMENT_STATUS_CHANGE') {
      if (notification.orderId) {
        // Navigate to order detail page
        window.location.href = `/orders/${notification.orderId}`;
      }
    } else if (notification.type === 'INVENTORY_LOW' || notification.type === 'STOCK_ALERT') {
      // Navigate to products page with low stock filter
      window.location.href = '/products?lowStock=true';
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg transition-colors duration-200 ${
          isOpen
            ? 'bg-blue-100 text-blue-600'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
        aria-label="Notifiche"
      >
        {unreadCount > 0 ? (
          <BellRing className="h-6 w-6" />
        ) : (
          <Bell className="h-6 w-6" />
        )}

        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Connection Status Indicator */}
        <div className="absolute -bottom-1 -right-1">
          {connected ? (
            <Wifi className="h-3 w-3 text-green-500" />
          ) : (
            <WifiOff className="h-3 w-3 text-red-500" />
          )}
        </div>
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Panel */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-semibold text-gray-900">Notifiche</h3>
                {connected ? (
                  <span className="flex items-center text-xs text-green-600">
                    <Wifi className="h-3 w-3 mr-1" />
                    Connesso
                  </span>
                ) : (
                  <span className="flex items-center text-xs text-red-600">
                    <WifiOff className="h-3 w-3 mr-1" />
                    Disconnesso
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Segna tutto come letto
                  </button>
                )}

                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Pulisci
                  </button>
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border-l-4 border-red-500">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Nessuna notifica</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification: any) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors border-l-4 ${
                        getNotificationColor(notification.type, notification.priority)
                      } ${
                        !notification.read && !notification.priority ? 'bg-blue-50' :
                        !notification.read ? '' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <h4 className={`text-sm font-medium ${
                                !notification.read ? 'text-gray-900' : 'text-gray-700'
                              }`}>
                                {notification.title}
                              </h4>
                              {notification.priority && ['high', 'critical'].includes(notification.priority) && (
                                <span className={`px-1.5 py-0.5 text-xs font-semibold rounded ${
                                  notification.priority === 'critical'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-orange-100 text-orange-800'
                                }`}>
                                  {notification.priority === 'critical' ? 'CRITICO' : 'ALTO'}
                                </span>
                              )}
                              {!notification.read && (
                                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                              )}
                            </div>

                            <p className="text-sm text-gray-600 mt-1">
                              {notification.message}
                            </p>

                            <p className="text-xs text-gray-500 mt-2">
                              {formatTime(notification.timestamp)}
                            </p>
                          </div>
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNotification(notification.id);
                          }}
                          className="ml-2 p-1 text-gray-400 hover:text-gray-600 rounded"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;