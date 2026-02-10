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

const PLATFORMS = ['all', 'linkedin', 'twitter', 'facebook', 'instagram', 'tiktok'] as const;

const PLATFORM_COLORS: Record<string, string> = {
  linkedin: 'bg-blue-500',
  twitter: 'bg-sky-400',
  facebook: 'bg-indigo-500',
  instagram: 'bg-pink-500',
  tiktok: 'bg-slate-800',
};

interface ScheduleWithPiece extends ContentSchedule {
  contentPiece?: ContentPiece;
}

export default function ContentCalendarPage() {
  const router = useRouter();
  const { toast } = useToast();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('week');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [weekOffset, setWeekOffset] = useState(0);

  const { data: schedules, mutate } = useApi<ScheduleWithPiece[]>(
    `/api/content/schedules?year=${year}&month=${month + 1}`,
  );

  const filteredSchedules = (schedules ?? []).filter((s) => {
    if (platformFilter === 'all') return true;
    return s.contentPiece?.platform === platformFilter;
  });

  const events: CalendarEventData[] = filteredSchedules.map((s) => ({
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
    setWeekOffset(0);
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

  // Week view helpers
  const getWeekDays = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7); // Monday
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const weekDays = getWeekDays();
  const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/content')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Calendrier éditorial</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('week')}
          >
            Semaine
          </Button>
          <Button
            variant={viewMode === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('month')}
          >
            Mois
          </Button>
        </div>
      </div>

      {/* Platform filters */}
      <div className="flex items-center gap-2">
        {PLATFORMS.map((p) => (
          <Button
            key={p}
            variant={platformFilter === p ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPlatformFilter(p)}
            className="capitalize"
          >
            {p === 'all' ? 'Toutes' : p}
            {p !== 'all' && (
              <span className={`ml-1.5 inline-block h-2 w-2 rounded-full ${PLATFORM_COLORS[p] || 'bg-gray-400'}`} />
            )}
          </Button>
        ))}
      </div>

      {viewMode === 'month' ? (
        <>
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
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setWeekOffset(weekOffset - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold min-w-[280px] text-center">
                {weekDays[0]!.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — {weekDays[6]!.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
              </h2>
              <Button variant="outline" size="icon" onClick={() => setWeekOffset(weekOffset + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" onClick={goToToday}>
              Cette semaine
            </Button>
          </div>

          {/* Week grid */}
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, idx) => {
              const dayStr = day.toISOString().slice(0, 10);
              const isToday = dayStr === now.toISOString().slice(0, 10);
              const dayEvents = events.filter((e) => {
                const eventDate = new Date(e.scheduledAt).toISOString().slice(0, 10);
                return eventDate === dayStr;
              });

              return (
                <div
                  key={dayStr}
                  className={`min-h-[200px] rounded-lg border p-3 ${isToday ? 'border-primary bg-primary/5' : 'border-border'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">{DAY_NAMES[idx]}</span>
                    <span className={`text-sm font-bold ${isToday ? 'text-primary' : ''}`}>
                      {day.getDate()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {dayEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className={`rounded px-2 py-1 text-xs text-white truncate cursor-pointer ${PLATFORM_COLORS[evt.platform] || 'bg-gray-500'}`}
                        title={evt.title}
                      >
                        {evt.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
