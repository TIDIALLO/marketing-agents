'use client';

import { useEffect } from 'react';
import { useSocket } from '@/providers/SocketProvider';
import type { ServerToClientEvents } from '@mktengine/shared';

export function useSocketEvent<K extends keyof ServerToClientEvents>(
  event: K,
  handler: ServerToClientEvents[K],
) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket.on(event, handler as any);

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      socket.off(event, handler as any);
    };
  }, [socket, event, handler]);
}
