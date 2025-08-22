import React, { createContext, useContext, useCallback, useRef, ReactNode } from 'react';
import { toast } from 'react-hot-toast';
import { socketService } from '@/services/socket';
import { useAuth } from './AuthContext';

type NotificationType = 'urgent' | 'info' | 'warning';

interface Notification {
  id: string;
  patientId: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  markAsRead: (id: string) => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
  sendAlert: (patientId: string, message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Notification sound
const playNotificationSound = (type: NotificationType = 'info') => {
  const audio = new Audio(
    type === 'urgent' 
      ? '/sounds/urgent-alert.mp3'
      : '/sounds/notification.mp3'
  );
  audio.volume = 0.5;
  audio.play().catch(e => console.error('Error playing sound:', e));};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const { user } = useAuth();
  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;

  // Handle incoming alerts
  React.useEffect(() => {
    if (!user) return;

    const handleAlert = (data: {
      patientId: string;
      message: string;
      type: NotificationType;
      timestamp: string;
    }) => {
      const newNotification: Notification = {
        ...data,
        id: Date.now().toString(),
        read: false,
      };

      // Play sound for new notifications
      playNotificationSound(data.type);

      // Show toast notification
      toast(
        <div className="flex items-start">
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">
              {data.patientId} - {data.type.toUpperCase()}
            </p>
            <p className="text-sm text-gray-500">{data.message}</p>
          </div>
        </div>,
        {
          duration: data.type === 'urgent' ? 10000 : 5000,
          position: 'top-right',
        }
      );

      setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep max 50 notifications
    };

    // Subscribe to alerts
    const cleanup = socketService.onAlert(handleAlert);

    return () => {
      cleanup?.();
    };
  }, [user]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const sendAlert = useCallback((patientId: string, message: string, type: NotificationType = 'info') => {
    socketService.sendAlert(patientId, message, type);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        markAsRead,
        clearNotification,
        clearAll,
        sendAlert,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
