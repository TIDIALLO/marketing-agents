'use client';

import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const toastVariants = cva(
  'pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-4 shadow-lg transition-all',
  {
    variants: {
      variant: {
        default: 'border bg-background text-foreground',
        success: 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400',
        destructive: 'border-destructive/30 bg-destructive/10 text-destructive',
        warning: 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface ToastProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
  title?: string;
  description?: string;
  onDismiss?: () => void;
}

const Toast = forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant, title, description, onDismiss, ...props }, ref) => (
    <div ref={ref} className={cn(toastVariants({ variant }), className)} {...props}>
      <div className="flex-1">
        {title && <p className="text-sm font-semibold">{title}</p>}
        {description && (
          <p className="text-sm opacity-90">{description}</p>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="rounded-md p-1 opacity-70 hover:opacity-100 transition-opacity"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  ),
);
Toast.displayName = 'Toast';

export { Toast, toastVariants };
