"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";

export interface NotificationProps {
  id?: string;
  type?: "success" | "error" | "warning" | "info";
  title?: string;
  message: string;
  duration?: number;
  onClose?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const notificationStyles = {
  success: {
    container: "bg-green-50 border-green-200 text-green-800",
    icon: CheckCircle,
    iconColor: "text-green-600",
  },
  error: {
    container: "bg-red-50 border-red-200 text-red-800", 
    icon: AlertCircle,
    iconColor: "text-red-600",
  },
  warning: {
    container: "bg-yellow-50 border-yellow-200 text-yellow-800",
    icon: AlertTriangle,
    iconColor: "text-yellow-600",
  },
  info: {
    container: "bg-blue-50 border-blue-200 text-blue-800",
    icon: Info,
    iconColor: "text-blue-600",
  },
};

export const Notification = React.forwardRef<
  HTMLDivElement,
  NotificationProps & React.HTMLAttributes<HTMLDivElement>
>(({ 
  className, 
  type = "info", 
  title, 
  message, 
  onClose, 
  action,
  ...props 
}, ref) => {
  const style = notificationStyles[type];
  const Icon = style.icon;

  return (
    <div
      ref={ref}
      className={cn(
        "relative rounded-lg border-2 p-4 shadow-lg",
        "animate-in slide-in-from-top-2 fade-in-0 duration-300",
        style.container,
        className
      )}
      style={{
        boxShadow: "0px 2px 2px rgba(0, 0, 0, 0.15), inset 0px 4px 0px rgba(255, 255, 255, 0.2), inset 0px -5px 0px rgba(0, 0, 0, 0.15)"
      }}
      {...props}
    >
      <div className="flex items-start space-x-3">
        <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", style.iconColor)} />
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className="text-sm font-medium mb-1">{title}</h4>
          )}
          <p className="text-sm">{message}</p>
          {action && (
            <div className="mt-3">
              <button
                onClick={action.onClick}
                className={cn(
                  "text-sm font-medium underline hover:no-underline transition-all",
                  type === "success" && "text-green-700 hover:text-green-800",
                  type === "error" && "text-red-700 hover:text-red-800", 
                  type === "warning" && "text-yellow-700 hover:text-yellow-800",
                  type === "info" && "text-blue-700 hover:text-blue-800"
                )}
              >
                {action.label}
              </button>
            </div>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={cn(
              "flex-shrink-0 p-1 rounded-sm transition-colors",
              "hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-black/20"
            )}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
});

Notification.displayName = "Notification";

