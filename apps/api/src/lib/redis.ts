import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(REDIS_URL, { maxRetriesPerRequest: 3, lazyConnect: true, retryStrategy: (times) => Math.min(times * 500, 5000) });
    redis.on('error', (err) => {
      if (!redis?.status || redis.status === 'connecting') {
        console.error('[Redis] Connection error:', err.message);
      }
    });
  }
  return redis;
}

export async function publishEvent(
  channel: string,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    const client = getRedis();
    await client.publish(channel, JSON.stringify(data));
  } catch {
    console.log('[DEV] Redis not available — skipping publish');
  }
}
