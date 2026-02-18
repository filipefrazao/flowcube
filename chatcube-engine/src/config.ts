import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3100"),
  nodeEnv: process.env.NODE_ENV || "development",

  // Database (shared with FlowCube)
  databaseUrl: process.env.DATABASE_URL || "",

  // Redis
  redisUrl: process.env.REDIS_URL || "redis://flowcube-redis:6379/3",

  // Django backend webhook URL
  djangoWebhookUrl:
    process.env.DJANGO_WEBHOOK_URL ||
    "http://flowcube-backend:8000/api/v1/chatcube/webhook/",

  // Internal API key for auth between services
  engineApiKey: process.env.ENGINE_API_KEY || "",

  // Sessions directory for Baileys auth (file-based fallback)
  sessionsDir: process.env.SESSIONS_DIR || "/app/sessions",

  // Message queue defaults
  defaultMessageDelay: parseInt(process.env.MESSAGE_DELAY || "3000"),

  // Reconnect settings
  maxReconnectRetries: parseInt(process.env.MAX_RECONNECT_RETRIES || "5"),

  // Cloudflare R2 (media storage - future)
  r2Endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || "",
  r2AccessKey: process.env.CLOUDFLARE_R2_ACCESS_KEY || "",
  r2SecretKey: process.env.CLOUDFLARE_R2_SECRET_KEY || "",
  r2Bucket: process.env.CLOUDFLARE_R2_BUCKET || "chatcube-media",
};
