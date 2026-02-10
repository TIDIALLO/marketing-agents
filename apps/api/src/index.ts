import { createServer } from 'http';
import { app } from './app';
import { initSocket } from './lib/socket';
import { startScheduler } from './lib/scheduler';
import { startOrchestrator } from './services/agent-orchestrator.service';

const PORT = process.env.PORT || 4100;

const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`[mkt-api] Server running on port ${PORT}`);
  startScheduler();
  startOrchestrator().catch((err) =>
    console.error('[mkt-api] Orchestrator startup failed:', err),
  );
});
