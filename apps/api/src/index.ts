import { createServer } from 'http';
import { app } from './app';
import { initSocket } from './lib/socket';
import { startScheduler } from './lib/scheduler';

const PORT = process.env.PORT || 4000;

const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`[mkt-api] Server running on port ${PORT}`);
  startScheduler();
});
