import { useEffect, useCallback, useRef } from 'react';

export interface UsePullToRefreshOptions {
  threshold?: number;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
}

export function usePullToRefresh({
  threshold = 80,
  onRefresh,
  disabled = false,
}: UsePullToRefreshOptions) {
  const touchStartY = useRef<number>(0);
  const isAtTop = useRef<boolean>(true);
  const isRefreshing = useRef<boolean>(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled) return;
    
    // Only start tracking if we're at the top of the page
    isAtTop.current = window.scrollY === 0;
    if (!isAtTop.current) return;

    touchStartY.current = e.touches[0].clientY;
  }, [disabled]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || !isAtTop.current || isRefreshing.current) return;

    const touchMoveY = e.touches[0].clientY;
    const pullDistance = Math.max(0, touchMoveY - touchStartY.current);

    // Prevent default browser pull-to-refresh when pulling down
    if (pullDistance > 0 && window.scrollY === 0) {
      e.preventDefault();
    }
  }, [disabled]);

  const handleTouchEnd = useCallback(async (e: TouchEvent) => {
    if (disabled || !isAtTop.current || isRefreshing.current) return;

    const touchEndY = e.changedTouches[0].clientY;
    const pullDistance = Math.max(0, touchEndY - touchStartY.current);

    if (pullDistance >= threshold) {
      isRefreshing.current = true;
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Pull to refresh error:', error);
      } finally {
        isRefreshing.current = false;
      }
    }

    touchStartY.current = 0;
  }, [disabled, onRefresh, threshold]);

  useEffect(() => {
    if (disabled) return;

    // Add passive: false to be able to preventDefault
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, disabled]);

  const manualRefresh = useCallback(async () => {
    if (isRefreshing.current) return;

    isRefreshing.current = true;
    try {
      await onRefresh();
    } catch (error) {
      console.error('Manual refresh error:', error);
    } finally {
      isRefreshing.current = false;
    }
  }, [onRefresh]);

  return {
    manualRefresh,
  };
}