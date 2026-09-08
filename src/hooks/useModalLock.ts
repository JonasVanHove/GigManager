"use client";

import { useEffect, useRef, useCallback } from "react";

interface ModalLockOptions {
  isOpen?: boolean;
  onClose?: () => void;
  preventBackdropClose?: boolean;
  preventEscapeClose?: boolean;
}

export function useModalLock({
  isOpen = true,
  onClose,
  preventBackdropClose = false,
  preventEscapeClose = false,
}: ModalLockOptions = {}) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const { body, documentElement } = document;
    const prevBodyOverflow = body.style.overflow;
    const prevDocOverflow = documentElement.style.overflow;
    const scrollY = window.scrollY;
    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";
    body.classList.add("modal-open");
    return () => {
      body.style.overflow = prevBodyOverflow;
      documentElement.style.overflow = prevDocOverflow;
      body.classList.remove("modal-open");
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || preventEscapeClose || !onCloseRef.current) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      onCloseRef.current?.();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, preventEscapeClose]);

  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (preventBackdropClose) return;
      if (event.target !== event.currentTarget) return;
      if (touchStartRef.current) return;
      onCloseRef.current?.();
    },
    [preventBackdropClose]
  );

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null;
  }, []);

  return { handleBackdropClick, handleTouchStart, handleTouchEnd };
}