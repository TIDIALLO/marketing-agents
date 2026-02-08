'use client';

import { useEffect, useRef, useState } from 'react';

interface UseSSEResult<T> {
  data: T | null;
  isConnected: boolean;
}

export function useSSE<T>(endpoint: string): UseSSEResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const token = localStorage.getItem('access_token');
    const url = `${apiBase}${endpoint}${endpoint.includes('?') ? '&' : '?'}token=${token}`;

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as T;
        setData(parsed);
      } catch {
        // Ignore non-JSON messages
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [endpoint]);

  return { data, isConnected };
}
