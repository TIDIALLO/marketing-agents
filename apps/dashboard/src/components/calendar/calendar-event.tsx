'use client';

import { Badge } from '@/components/ui/badge';
import type { ContentStatus, Platform } from '@synap6ia/shared';

const statusVariantMap: Record<ContentStatus, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  review: 'warning',
  approved: 'outline',
  scheduled: 'default',
  published: 'success',
  failed: 'destructive',
};

export interface CalendarEventData {
  id: string;
  title: string;
  platform: Platform;
  status: ContentStatus;
  scheduledAt: string;
}

interface CalendarEventProps {
  event: CalendarEventData;
  onDragStart?: (e: React.DragEvent, event: CalendarEventData) => void;
}

export function CalendarEvent({ event, onDragStart }: CalendarEventProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, event)}
      className="mb-1 cursor-grab rounded-md border bg-card p-1.5 text-xs shadow-sm hover:shadow-md transition-shadow active:cursor-grabbing"
    >
      <p className="truncate font-medium">{event.title}</p>
      <div className="mt-0.5 flex items-center gap-1">
        <span className="text-muted-foreground">{event.platform}</span>
        <Badge variant={statusVariantMap[event.status]} className="h-4 text-[10px] px-1">
          {event.status}
        </Badge>
      </div>
    </div>
  );
}
