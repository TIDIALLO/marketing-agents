import { forwardRef, type InputHTMLAttributes } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DatePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {}

const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className, ...props }, ref) => (
    <div className="relative">
      <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="date"
        ref={ref}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    </div>
  ),
);
DatePicker.displayName = 'DatePicker';

export { DatePicker };
