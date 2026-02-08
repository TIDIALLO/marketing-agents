'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApi } from '@/hooks/use-api';
import { apiClient } from '@/lib/api';
import { useToast } from '@/providers/ToastProvider';
import { Button } from '@/components/ui/button';
import { CalendarGrid } from '@/components/calendar/calendar-grid';
import type { CalendarEventData } from '@/components/calendar/calendar-event';
import type { ContentSchedule, ContentPiece } from '@synap6ia/shared';

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

interface ScheduleWithPiece extends ContentSchedule {
  contentPiece?: ContentPiece;
}

export default function ContentCalendarPage() {
  const router = useRouter();
  const { toast } = useToast();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const { data: schedules, mutate } = useApi<ScheduleWithPiece[]>(
    `/api/content/schedules?year=${year}&month=${month + 1}`,
  );

  const events: CalendarEventData[] = (schedules ?? []).map((s) => ({
    id: s.id,
    title: s.contentPiece?.title ?? 'Contenu programmé',
    platform: s.contentPiece?.platform ?? 'linkedin',
    status: s.contentPiece?.status ?? 'scheduled',
    scheduledAt: s.scheduledAt,
  }));

  const goToPrevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  };

  const goToNextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  };

  const goToToday = () => {
    setYear(now.getFullYear());
    setMonth(now.getMonth());
  };

  const handleDropEvent = useCallback(
    async (eventId: string, date: string) => {
      try {
        await apiClient(`/api/content/schedules/${eventId}`, {
          method: 'PUT',
          body: { scheduledAt: date },
        });
        toast({ title: 'Contenu reprogrammé', variant: 'success' });
        await mutate();
      } catch {
        toast({ title: 'Erreur', description: 'La reprogrammation a échoué', variant: 'destructive' });
      }
    },
    [mutate, toast],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/content')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Calendrier éditorial</h1>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[180px] text-center">
            {MONTH_NAMES[month]} {year}
          </h2>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" onClick={goToToday}>
          Aujourd&apos;hui
        </Button>
      </div>

      <CalendarGrid
        year={year}
        month={month}
        events={events}
        onDropEvent={handleDropEvent}
      />
    </div>
  );
}
