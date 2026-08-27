"use client";

import { useEffect, useState } from "react";

interface RouteProgressBarProps {
  isLoading: boolean;
}

export default function RouteProgressBar({ isLoading }: RouteProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    let finishTimer: NodeJS.Timeout;

    if (isLoading) {
      setVisible(true);
      setProgress(15);

      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev < 65) return prev + Math.random() * 12 + 5;
          if (prev < 85) return prev + Math.random() * 4 + 1;
          if (prev < 95) return prev + 0.5;
          return prev;
        });
      }, 150);
    } else if (visible) {
      setProgress(100);
      finishTimer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
    }

    return () => {
      clearInterval(timer);
      clearTimeout(finishTimer);
    };
  }, [isLoading, visible]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-transparent overflow-hidden pointer-events-none">
      <div
        className="h-full bg-gradient-to-r from-brand-500 via-amber-400 to-orange-500 shadow-md shadow-brand-500/50 transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}
