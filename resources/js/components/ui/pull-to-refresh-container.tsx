import { ReactNode } from 'react';
import { usePullToRefresh, UsePullToRefreshOptions } from '@/hooks/use-pull-to-refresh';
import { cn } from '@/lib/utils';

export interface PullToRefreshContainerProps extends UsePullToRefreshOptions {
  children: ReactNode;
  className?: string;
}

export function PullToRefreshContainer({
  children,
  className,
  threshold = 80,
  onRefresh,
  disabled = false,
}: PullToRefreshContainerProps) {
  usePullToRefresh({
    threshold,
    onRefresh,
    disabled,
  });

  return (
    <div
      className={cn(
        'relative h-full w-full',
        // Prevent default pull-to-refresh behavior
        'overscroll-behavior-y-contain',
        className
      )}
      style={{
        touchAction: 'pan-down',
      }}
    >
      {children}
    </div>
  );
}