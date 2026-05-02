import { getConnectedRedis } from "./src/config/redis";

const clearUserCache = async () => {
  const userId = "51fb342d-807b-4e4a-8c1b-a9cadaad20c9";
  const cacheKey = `PADIPLUS:doc:user:${userId}`;
  
  try {
    const redisClient = await getConnectedRedis();
    
    if (!redisClient) {
      console.error("❌ Redis client not available");
      process.exit(1);
    }
    
    const result = await redisClient.del(cacheKey);
    
    if (result === 1) {
      console.log(`✅ Successfully cleared cache for user: ${userId}`);
      console.log(`   Cache key: ${cacheKey}`);
    } else {
      console.log(`⚠️  No cache found for user: ${userId}`);
      console.log(`   Cache key: ${cacheKey}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error clearing cache:", error);
    process.exit(1);
  }
};

clearUserCache();
