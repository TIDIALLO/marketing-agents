'use client';

import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectContextValue {
  open: boolean;
  value: string;
  onValueChange: (value: string) => void;
  setOpen: (open: boolean) => void;
}

const SelectContext = createContext<SelectContextValue | null>(null);

function useSelect() {
  const ctx = useContext(SelectContext);
  if (!ctx) throw new Error('Select components must be used within <Select>');
  return ctx;
}

interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
}

function Select({ value, defaultValue = '', onValueChange, children }: SelectProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);

  const currentValue = value ?? internalValue;
  const handleChange = useCallback(
    (v: string) => {
      if (value === undefined) setInternalValue(v);
      onValueChange?.(v);
    },
    [value, onValueChange],
  );

  return (
    <SelectContext.Provider
      value={{ open, value: currentValue, onValueChange: handleChange, setOpen }}
    >
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
}

const SelectTrigger = forwardRef<HTMLButtonElement, HTMLAttributes<HTMLButtonElement>>(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen } = useSelect();

    return (
      <button
        ref={ref}
        type="button"
        role="combobox"
        aria-expanded={open}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        onClick={() => setOpen(!open)}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
    );
  },
);
SelectTrigger.displayName = 'SelectTrigger';

const SelectValue = forwardRef<
  HTMLSpanElement,
  HTMLAttributes<HTMLSpanElement> & { placeholder?: string }
>(({ placeholder, className, ...props }, ref) => {
  const { value } = useSelect();
  return (
    <span ref={ref} className={cn(!value && 'text-muted-foreground', className)} {...props}>
      {value || placeholder}
    </span>
  );
});
SelectValue.displayName = 'SelectValue';

const SelectContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen } = useSelect();
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (!open) return;
      const handler = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.closest('.relative')?.contains(e.target as Node)) {
          setOpen(false);
        }
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, [open, setOpen]);

    if (!open) return null;

    return (
      <div
        ref={ref}
        className={cn(
          'absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95',
          className,
        )}
        {...props}
      >
        <div ref={containerRef}>{children}</div>
      </div>
    );
  },
);
SelectContent.displayName = 'SelectContent';

interface SelectItemProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
}

const SelectItem = forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, children, value: itemValue, ...props }, ref) => {
    const { value, onValueChange, setOpen } = useSelect();
    const isSelected = value === itemValue;

    return (
      <div
        ref={ref}
        role="option"
        aria-selected={isSelected}
        className={cn(
          'relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
          isSelected && 'bg-accent text-accent-foreground',
          className,
        )}
        onClick={() => {
          onValueChange(itemValue);
          setOpen(false);
        }}
        {...props}
      >
        {isSelected && (
          <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
            <Check className="h-4 w-4" />
          </span>
        )}
        {children}
      </div>
    );
  },
);
SelectItem.displayName = 'SelectItem';

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
