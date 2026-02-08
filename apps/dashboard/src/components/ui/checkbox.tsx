'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, onChange, ...props }, ref) => (
    <label className="relative inline-flex cursor-pointer items-center">
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
          'flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary ring-offset-background peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 peer-checked:bg-primary peer-checked:text-primary-foreground',
          className,
        )}
      >
        {checked && <Check className="h-3 w-3" />}
      </div>
    </label>
  ),
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
