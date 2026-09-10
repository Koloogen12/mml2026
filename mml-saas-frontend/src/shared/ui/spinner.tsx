import type { FC } from 'react';
import { cn } from '@/lib/utils';

interface SpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-3',
};

export const Spinner: FC<SpinnerProps> = ({ className, size = 'md' }) => {
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-muted-foreground/30 border-t-foreground',
        sizeClasses[size],
        className,
      )}
    />
  );
};
