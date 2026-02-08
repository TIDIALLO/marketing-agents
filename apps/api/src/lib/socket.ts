import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';

let io: SocketServer | null = null;

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    const tenantId = socket.handshake.auth?.tenantId as string | undefined;
    if (tenantId) {
      socket.join(`tenant:${tenantId}`);
      console.log(`[Socket] Client joined tenant:${tenantId}`);
    }

    socket.on('disconnect', () => {
      if (tenantId) console.log(`[Socket] Client left tenant:${tenantId}`);
    });
  });

  return io;
}

export function getIO(): SocketServer | null {
  return io;
}

export function emitToTenant(
  tenantId: string,
  event: string,
  data: Record<string, unknown>,
): void {
  if (io) {
    io.to(`tenant:${tenantId}`).emit(event, data);
  }
}
