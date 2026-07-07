"use client";

import { useCallback, useMemo, useState } from "react";

export function useSetlistNavigation(itemIds: string[]) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentItemId = useMemo(() => itemIds[currentIndex] ?? null, [itemIds, currentIndex]);

  const goToIndex = useCallback((index: number) => {
    if (itemIds.length === 0) return;
    const next = Math.min(Math.max(index, 0), itemIds.length - 1);
    setCurrentIndex(next);
  }, [itemIds.length]);

  const goNext = useCallback(() => {
    if (itemIds.length === 0) return;
    setCurrentIndex((prev) => Math.min(prev + 1, itemIds.length - 1));
  }, [itemIds.length]);

  const goPrev = useCallback(() => {
    if (itemIds.length === 0) return;
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, [itemIds.length]);

  const reset = useCallback(() => setCurrentIndex(0), []);

  return {
    currentIndex,
    currentItemId,
    goToIndex,
    goNext,
    goPrev,
    reset,
    setCurrentIndex,
  };
}