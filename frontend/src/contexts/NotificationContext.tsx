import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { authenticatedFetch } from '../utils/tokenManager';

interface NotificationContextType {
  notificationCount: number;
  refreshNotifications: () => void;
  markAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [notificationCount, setNotificationCount] = useState(0);

  const fetchNotificationCount = useCallback(async () => {
    if (!isAuthenticated) {
      setNotificationCount(0);
      return;
    }

    try {
      // Fetch all notifications in parallel using authenticatedFetch
      const [resInv, resOrgInv, resFollow] = await Promise.all([
        authenticatedFetch('/invitation/my'),
        authenticatedFetch('/org-invitation/my'),
        authenticatedFetch('/user/my-follows')
      ]);

      const [dataInv, dataOrgInv, dataFollow] = await Promise.all([
        resInv.json(),
        resOrgInv.json(),
        resFollow.json()
      ]);

      const totalCount = 
        (dataInv.invitations?.length || 0) + 
        (dataOrgInv.invitations?.length || 0) + 
        (dataFollow.notifications?.length || 0);

      setNotificationCount(totalCount);
    } catch (error) {
      console.error('Error fetching notification count:', error);
      setNotificationCount(0);
    }
  }, [isAuthenticated]);

  const refreshNotifications = () => {
    fetchNotificationCount();
  };

  // 🎯 ACTUALIZEAZĂ markAsRead să folosească noul endpoint
  const markAsRead = async () => {
    if (!isAuthenticated) return;

    try {
      console.log('Marking all notifications as read...');
      
      // Marchează toate notificările ca citite pe server
      const response = await authenticatedFetch('/user/mark-all-notifications-read', {
        method: 'POST'
      });

      if (response.ok) {
        console.log('✅ Notifications marked as read successfully');
        // Resetează count-ul local instant pentru UX
        setNotificationCount(0);
        
        // Refresh din server pentru confirmare (după 1s)
        setTimeout(fetchNotificationCount, 1000);
      } else {
        console.error('❌ Failed to mark notifications as read:', response.status);
        // Dacă eșuează, resetează măcar local pentru UX
        setNotificationCount(0);
      }
      
    } catch (error) {
      console.error('❌ Error marking notifications as read:', error);
      // Dacă eșuează, resetează măcar local pentru UX
      setNotificationCount(0);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotificationCount();
      // Check for new notifications every 30 seconds
      const interval = setInterval(fetchNotificationCount, 30000);
      return () => clearInterval(interval);
    } else {
      setNotificationCount(0);
    }
  }, [isAuthenticated, fetchNotificationCount]);

  return (
    <NotificationContext.Provider value={{ notificationCount, refreshNotifications, markAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
};