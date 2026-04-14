import dotenv from 'dotenv';
dotenv.config();

import { removeCachedUser } from '../services/cache/user.cache.service';

(async () => {
  const userId = '413634f2-6695-4974-bd80-fdc39bb501e9';
  
  try {
    console.log('🧹 Attempting to clear cache for user:', userId);
    await removeCachedUser(userId);
    console.log('✅ Cache cleared for user');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to clear cache:', err);
    process.exit(1);
  }
})();
