import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface FunnelStage {
  label: string;
  value: number;
  color?: string;
}

interface FunnelProps extends HTMLAttributes<HTMLDivElement> {
  stages: FunnelStage[];
}

const Funnel = forwardRef<HTMLDivElement, FunnelProps>(
  ({ className, stages, ...props }, ref) => {
    const maxValue = Math.max(...stages.map((s) => s.value), 1);

    return (
      <div ref={ref} className={cn('space-y-2', className)} {...props}>
        {stages.map((stage) => {
          const widthPercent = (stage.value / maxValue) * 100;

          return (
            <div key={stage.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{stage.label}</span>
                <span className="text-muted-foreground">{stage.value}</span>
              </div>
              <div className="h-8 w-full rounded bg-muted">
                <div
                  className={cn(
                    'flex h-full items-center rounded px-3 text-xs font-medium text-white transition-all',
                    stage.color ?? 'bg-primary',
                  )}
                  style={{ width: `${Math.max(widthPercent, 8)}%` }}
                >
                  {widthPercent > 15 && `${Math.round(widthPercent)}%`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  },
);
Funnel.displayName = 'Funnel';

export { Funnel, type FunnelStage };
