import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redisOptions = {
  port: Number(process.env.CLIENT_SAMPLE_REDIS_PORT) || 6379,
  host: process.env.CLIENT_SAMPLE_REDIS_HOST || 'localhost',
  password: process.env.CLIENT_SAMPLE_REDIS_PASSWORD,
};

const flushRedis = async () => {
  const redis = new Redis(redisOptions);
  try {
    console.log('Connecting to Redis at ' + redisOptions.host + ':' + redisOptions.port + '...');
    const result = await redis.flushall();
    console.log('✅ Redis cache cleared successfully: ' + result);
  } catch (error: any) {
    console.error('❌ Failed to clear Redis cache: ' + error.message);
  } finally {
    await redis.quit();
    process.exit(0);
  }
};

flushRedis();
