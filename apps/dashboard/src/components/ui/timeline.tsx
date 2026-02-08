import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TimelineItem {
  id: string;
  icon?: ReactNode;
  title: string;
  description?: string;
  timestamp: string;
  color?: string;
}

interface TimelineProps extends HTMLAttributes<HTMLDivElement> {
  items: TimelineItem[];
}

const Timeline = forwardRef<HTMLDivElement, TimelineProps>(
  ({ className, items, ...props }, ref) => (
    <div ref={ref} className={cn('space-y-0', className)} {...props}>
      {items.map((item, index) => (
        <div key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
          {index < items.length - 1 && (
            <div className="absolute left-[15px] top-8 h-full w-px bg-border" />
          )}
          <div
            className={cn(
              'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background',
              item.color,
            )}
          >
            {item.icon ?? (
              <div className="h-2 w-2 rounded-full bg-muted-foreground" />
            )}
          </div>
          <div className="flex-1 pt-0.5">
            <p className="text-sm font-medium">{item.title}</p>
            {item.description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">{item.timestamp}</p>
          </div>
        </div>
      ))}
    </div>
  ),
);
Timeline.displayName = 'Timeline';

export { Timeline, type TimelineItem };
