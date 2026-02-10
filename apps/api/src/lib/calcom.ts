// ─── Cal.com v2 API Integration ─────────────────────────────
// https://cal.com/docs/api-reference/v2

const CALCOM_API_KEY = process.env.CALCOM_API_KEY || '';
const CALCOM_API_URL = process.env.CALCOM_API_URL || 'https://api.cal.com/v2';
const CALCOM_EVENT_TYPE_ID = process.env.CALCOM_EVENT_TYPE_ID || '';

function isConfigured(): boolean {
  return !!(CALCOM_API_KEY && CALCOM_EVENT_TYPE_ID);
}

async function calFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${CALCOM_API_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CALCOM_API_KEY}`,
      'cal-api-version': '2024-08-13',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Cal.com API error ${response.status}: ${body}`);
  }

  return response.json() as Promise<T>;
}

// ─── Availability ─────────────────────────────────────────────

export interface CalSlot {
  time: string; // ISO datetime
}

interface SlotsResponse {
  status: string;
  data: {
    slots: Record<string, CalSlot[]>;
  };
}

export interface AvailableSlot {
  date: string;
  time: string;
  isoDateTime: string;
}

export async function getAvailableSlots(
  daysAhead = 7,
  limit = 3,
): Promise<AvailableSlot[]> {
  if (!isConfigured()) {
    console.log('[Cal.com] Not configured — returning mock slots');
    return getMockSlots();
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1); // Start from tomorrow
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + daysAhead);

  const params = new URLSearchParams({
    startTime: startDate.toISOString(),
    endTime: endDate.toISOString(),
    eventTypeId: CALCOM_EVENT_TYPE_ID,
  });

  try {
    const response = await calFetch<SlotsResponse>(`/slots/available?${params}`);

    const allSlots: AvailableSlot[] = [];
    for (const [dateKey, daySlots] of Object.entries(response.data.slots)) {
      for (const slot of daySlots) {
        const dt = new Date(slot.time);
        allSlots.push({
          date: dateKey,
          time: dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          isoDateTime: slot.time,
        });
      }
    }

    // Return the first N slots, spread across different days
    const selectedSlots: AvailableSlot[] = [];
    const usedDates = new Set<string>();
    for (const slot of allSlots) {
      if (selectedSlots.length >= limit) break;
      if (!usedDates.has(slot.date)) {
        selectedSlots.push(slot);
        usedDates.add(slot.date);
      }
    }

    // If we don't have enough from unique days, fill from remaining
    if (selectedSlots.length < limit) {
      for (const slot of allSlots) {
        if (selectedSlots.length >= limit) break;
        if (!selectedSlots.includes(slot)) {
          selectedSlots.push(slot);
        }
      }
    }

    return selectedSlots;
  } catch (err) {
    console.error('[Cal.com] Failed to fetch slots:', err);
    return getMockSlots();
  }
}

// ─── Create Booking ──────────────────────────────────────────

interface CreateBookingInput {
  name: string;
  email: string;
  startTime: string; // ISO datetime
  notes?: string;
  metadata?: Record<string, string>;
}

interface BookingResponse {
  status: string;
  data: {
    id: number;
    uid: string;
    title: string;
    startTime: string;
    endTime: string;
    status: string;
    meetingUrl?: string;
  };
}

export async function createBooking(input: CreateBookingInput): Promise<BookingResponse['data'] | null> {
  if (!isConfigured()) {
    console.log('[Cal.com] Not configured — skipping booking creation');
    return null;
  }

  try {
    const response = await calFetch<BookingResponse>('/bookings', {
      method: 'POST',
      body: JSON.stringify({
        eventTypeId: Number(CALCOM_EVENT_TYPE_ID),
        start: input.startTime,
        attendee: {
          name: input.name,
          email: input.email,
          timeZone: 'Africa/Dakar',
        },
        metadata: {
          source: 'agents-marketing',
          ...input.metadata,
        },
      }),
    });

    return response.data;
  } catch (err) {
    console.error('[Cal.com] Failed to create booking:', err);
    return null;
  }
}

// ─── Cancel Booking ──────────────────────────────────────────

export async function cancelBooking(bookingUid: string, reason?: string): Promise<boolean> {
  if (!isConfigured()) {
    console.log('[Cal.com] Not configured — skipping booking cancellation');
    return false;
  }

  try {
    await calFetch(`/bookings/${bookingUid}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ cancellationReason: reason ?? 'Annulé par le système' }),
    });
    return true;
  } catch (err) {
    console.error('[Cal.com] Failed to cancel booking:', err);
    return false;
  }
}

// ─── Reschedule Booking ─────────────────────────────────────

export async function rescheduleBooking(
  bookingUid: string,
  newStartTime: string,
): Promise<BookingResponse['data'] | null> {
  if (!isConfigured()) {
    console.log('[Cal.com] Not configured — skipping reschedule');
    return null;
  }

  try {
    const response = await calFetch<BookingResponse>(`/bookings/${bookingUid}/reschedule`, {
      method: 'POST',
      body: JSON.stringify({ start: newStartTime }),
    });
    return response.data;
  } catch (err) {
    console.error('[Cal.com] Failed to reschedule booking:', err);
    return null;
  }
}

// ─── Mock Slots (dev fallback) ───────────────────────────────

function getMockSlots(): AvailableSlot[] {
  const now = new Date();
  const slots: AvailableSlot[] = [];

  for (let i = 1; i <= 3; i++) {
    const d = new Date(now.getTime() + i * 24 * 3600_000);
    const hours = [10, 14, 11][i - 1]!;
    d.setHours(hours, 0, 0, 0);
    slots.push({
      date: d.toISOString().slice(0, 10),
      time: `${hours}:00`,
      isoDateTime: d.toISOString(),
    });
  }

  return slots;
}

export { isConfigured as isCalcomConfigured };
