'use client';

import { useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { CalendarEvent, type CalendarEventData } from './calendar-event';

interface CalendarGridProps {
  year: number;
  month: number;
  events: CalendarEventData[];
  onDropEvent?: (eventId: string, date: string) => void;
}

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

export function CalendarGrid({ year, month, events, onDropEvent }: CalendarGridProps) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const cells = useMemo(() => {
    const result: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) result.push(null);
    for (let d = 1; d <= daysInMonth; d++) result.push(d);
    while (result.length % 7 !== 0) result.push(null);
    return result;
  }, [firstDay, daysInMonth]);

  const eventsByDay = useMemo(() => {
    const map = new Map<number, CalendarEventData[]>();
    for (const event of events) {
      const date = new Date(event.scheduledAt);
      if (date.getFullYear() === year && date.getMonth() === month) {
        const day = date.getDate();
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push(event);
      }
    }
    return map;
  }, [events, year, month]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, day: number) => {
      e.preventDefault();
      const eventId = e.dataTransfer.getData('text/plain');
      if (eventId && onDropEvent) {
        const date = new Date(year, month, day).toISOString();
        onDropEvent(eventId, date);
      }
    },
    [year, month, onDropEvent],
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, event: CalendarEventData) => {
      e.dataTransfer.setData('text/plain', event.id);
    },
    [],
  );

  return (
    <div className="rounded-md border">
      <div className="grid grid-cols-7 border-b">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="p-2 text-center text-xs font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, index) => (
          <div
            key={index}
            className={cn(
              'min-h-[100px] border-b border-r p-1 last:border-r-0',
              day === null && 'bg-muted/30',
              isCurrentMonth && day === today.getDate() && 'bg-primary/5',
            )}
            onDragOver={day ? handleDragOver : undefined}
            onDrop={day ? (e) => handleDrop(e, day) : undefined}
          >
            {day && (
              <>
                <span
                  className={cn(
                    'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs',
                    isCurrentMonth && day === today.getDate() &&
                      'bg-primary text-primary-foreground font-bold',
                  )}
                >
                  {day}
                </span>
                <div className="mt-0.5">
                  {eventsByDay.get(day)?.map((event) => (
                    <CalendarEvent
                      key={event.id}
                      event={event}
                      onDragStart={handleDragStart}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
