const port = process.env.PORT || 3000;
const nodeEnv = process.env.NODE_ENV;
const dbUrl = process.env.DATABASE_URL;
const { DB_POOL_SIZE, CACHE_TTL } = process.env;
const metrics = process.env.ENABLE_METRICS === 'true';

// Undeclared ghost variable referenced in code but missing from configs:
const stripeSecret = process.env.STRIPE_WEBHOOK_SECRET;

console.log(`Server listening on ${port} in ${nodeEnv} mode`);
