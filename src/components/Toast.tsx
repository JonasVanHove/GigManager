"use client";

import { useEffect, useState } from "react";
import { Icons } from "./Icons";

interface ToastProps {
  message: string;
  type: "success" | "error" | "info" | "warning";
  duration?: number;
  onClose: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function Toast({ message, type, duration = 4000, onClose, action }: ToastProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        onClose();
      }
    }, 16);

    return () => clearInterval(interval);
  }, [duration, onClose]);

  const icons = {
    success: <Icons.Check className="h-5 w-5" />,
    error: <Icons.Close className="h-5 w-5" />,
    info: <Icons.InfoCircle className="h-5 w-5" />,
    warning: <Icons.AlertTriangle className="h-5 w-5" />,
  };

  const styles = {
    success: "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-800",
    error: "bg-red-50 text-red-900 border-red-200 dark:bg-red-950 dark:text-red-100 dark:border-red-800",
    info: "bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950 dark:text-blue-100 dark:border-blue-800",
    warning: "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-800",
  };

  const progressStyles = {
    success: "bg-emerald-500",
    error: "bg-red-500",
    info: "bg-blue-500",
    warning: "bg-amber-500",
  };

  return (
    <div className={`pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg border shadow-lg ${styles[type]}`}>
      <div className="p-4">
        <div className="flex items-start">
          <div className="shrink-0">{icons[type]}</div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-medium">{message}</p>
          </div>
          <div className="ml-4 flex shrink-0">
            {action && (
              <button
                type="button"
                onClick={action.onClick}
                className="inline-flex rounded-md text-sm font-medium underline hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2"
              >
                {action.label}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="ml-2 inline-flex rounded-md p-1 hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2"
            >
              <span className="sr-only">Close</span>
              <Icons.Close className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      <div className="h-1 bg-gray-200 dark:bg-gray-700">
        <div 
          className={`h-full transition-all duration-100 ${progressStyles[type]}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
