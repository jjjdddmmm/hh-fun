"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { Notification, NotificationProps } from "@/components/ui/notification";

interface NotificationWithId extends NotificationProps {
  id: string;
}

interface NotificationContextType {
  notifications: NotificationWithId[];
  showNotification: (notification: Omit<NotificationProps, "id" | "onClose">) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  hideNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}

interface NotificationProviderProps {
  children: React.ReactNode;
  maxNotifications?: number;
  defaultDuration?: number;
}

export function NotificationProvider({ 
  children, 
  maxNotifications = 5,
  defaultDuration = 5000
}: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<NotificationWithId[]>([]);

  const hideNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const showNotification = useCallback((notification: Omit<NotificationProps, "id" | "onClose">) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const duration = notification.duration || defaultDuration;
    
    const newNotification: NotificationWithId = {
      ...notification,
      id,
      onClose: () => hideNotification(id)
    };

    setNotifications(prev => {
      // Add new notification and limit total count
      const updated = [newNotification, ...prev].slice(0, maxNotifications);
      return updated;
    });

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        hideNotification(id);
      }, duration);
    }
  }, [hideNotification, maxNotifications, defaultDuration]);

  const showSuccess = useCallback((message: string, title?: string) => {
    showNotification({ type: "success", message, title });
  }, [showNotification]);

  const showError = useCallback((message: string, title?: string) => {
    showNotification({ type: "error", message, title });
  }, [showNotification]);

  const showWarning = useCallback((message: string, title?: string) => {
    showNotification({ type: "warning", message, title });
  }, [showNotification]);

  const showInfo = useCallback((message: string, title?: string) => {
    showNotification({ type: "info", message, title });
  }, [showNotification]);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const value: NotificationContextType = {
    notifications,
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideNotification,
    clearAll,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {/* Notification Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
        {notifications.map((notification) => (
          <Notification
            key={notification.id}
            {...notification}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}