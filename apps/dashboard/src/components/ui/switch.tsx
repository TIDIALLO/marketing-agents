'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const switchVariants = cva(
  'relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      size: {
        sm: 'h-4 w-7',
        default: 'h-5 w-9',
        lg: 'h-6 w-11',
      },
    },
    defaultVariants: { size: 'default' },
  },
);

const thumbVariants = cva(
  'pointer-events-none block rounded-full bg-background shadow-lg ring-0 transition-transform',
  {
    variants: {
      size: {
        sm: 'h-3 w-3',
        default: 'h-4 w-4',
        lg: 'h-5 w-5',
      },
    },
    defaultVariants: { size: 'default' },
  },
);

const translateVariants = {
  sm: 'translate-x-3',
  default: 'translate-x-4',
  lg: 'translate-x-5',
} as const;

interface SwitchProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'>,
    VariantProps<typeof switchVariants> {
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, onChange, size = 'default', ...props }, ref) => (
    <label className="inline-flex cursor-pointer items-center">
      <input
        type="checkbox"
        ref={ref}
        checked={checked}
        onChange={(e) => {
          onChange?.(e);
          onCheckedChange?.(e.target.checked);
        }}
        className="peer sr-only"
        {...props}
      />
      <div
        className={cn(
          switchVariants({ size }),
          checked ? 'bg-primary' : 'bg-input',
          className,
        )}
      >
        <span
          className={cn(
            thumbVariants({ size }),
            checked ? translateVariants[size ?? 'default'] : 'translate-x-0',
          )}
        />
      </div>
    </label>
  ),
);
Switch.displayName = 'Switch';

export { Switch, switchVariants };
