import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3100"),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgres://flowcube:FlowCube2026!@flowcube-postgres:5432/flowcube",
  redisUrl: process.env.REDIS_URL || "redis://flowcube-redis:6379/3",
  djangoWebhookUrl:
    process.env.DJANGO_WEBHOOK_URL ||
    "http://flowcube-backend:8000/api/v1/chatcube/webhook/",
  engineApiKey: process.env.ENGINE_API_KEY || "chatcube-internal-key-2026",
  sessionsDir: process.env.SESSIONS_DIR || "/app/sessions",
  defaultMessageDelay: parseInt(process.env.MESSAGE_DELAY || "3000"),
  maxQueueSize: parseInt(process.env.MAX_QUEUE_SIZE || "1000"),
  maxMessageRetries: parseInt(process.env.MAX_MESSAGE_RETRIES || "3"),
  r2Endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || "",
  r2AccessKey: process.env.CLOUDFLARE_R2_ACCESS_KEY || "",
  r2SecretKey: process.env.CLOUDFLARE_R2_SECRET_KEY || "",
  r2Bucket: process.env.CLOUDFLARE_R2_BUCKET || "chatcube-media",
};
