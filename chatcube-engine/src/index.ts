import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import pino from "pino";
import { Pool } from "pg";
import { config } from "./config";
import { authMiddleware } from "./middleware/auth";
import { errorHandler } from "./middleware/errorHandler";
import healthRouter from "./routes/health";
import instancesRouter from "./routes/instances";
import messagesRouter from "./routes/messages";
import { InstanceManager } from "./services/InstanceManager";

const logger = pino({ name: "chatcube-engine" });

async function main(): Promise<void> {
  logger.info(
    { nodeEnv: config.nodeEnv, port: config.port },
    "Starting ChatCube Engine..."
  );

  // Initialize shared PostgreSQL pool for auth state
  const pgPool = new Pool({
    connectionString: config.databaseUrl,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  // Test database connection
  try {
    await pgPool.query("SELECT 1");
    logger.info("PostgreSQL connection established");
  } catch (error) {
    logger.error({ error }, "Failed to connect to PostgreSQL - auth will use file fallback");
  }

  // Ensure auth tables exist
  try {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS chatcube_auth_creds (
        instance_id VARCHAR(255) PRIMARY KEY,
        creds TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS chatcube_auth_keys (
        instance_id VARCHAR(255) NOT NULL,
        key_type VARCHAR(127) NOT NULL,
        key_id VARCHAR(255) NOT NULL,
        key_data TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        PRIMARY KEY (instance_id, key_type, key_id)
      );
    `);
    logger.info("Auth tables initialized");
  } catch (error) {
    logger.warn({ error }, "Auth table initialization failed - tables may already exist");
  }

  // Initialize instance manager with PostgreSQL pool
  const instanceManager = InstanceManager.getInstance();
  instanceManager.setPgPool(pgPool);

  // Create Express app
  const app = express();

  // Middleware
  app.use(helmet());
  app.use(cors());
  app.use(morgan("combined"));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Auth middleware (bypasses /api/health)
  app.use(authMiddleware);

  // Routes
  app.use("/api/health", healthRouter);
  app.use("/api/instances", instancesRouter);
  app.use("/api/messages", messagesRouter);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ success: false, error: "Route not found" });
  });

  // Global error handler
  app.use(errorHandler);

  // Start server
  const server = app.listen(config.port, () => {
    logger.info(
      { port: config.port, nodeEnv: config.nodeEnv },
      `ChatCube Engine running on port ${config.port}`
    );
  });

  // Auto-restore instances after server is ready
  setTimeout(async () => {
    try {
      logger.info("Starting instance auto-restore...");
      await instanceManager.restoreInstances();
      logger.info("Instance auto-restore completed");
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      logger.error({ error: errMsg }, "Instance auto-restore failed");
    }

    // Start health monitoring after restore
    instanceManager.startHealthMonitor();
  }, 3000); // Wait 3s for Django to be ready

  // Graceful shutdown (preserves sessions)
  const gracefulShutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, "Received shutdown signal");

    // Stop accepting new connections
    server.close(() => {
      logger.info("HTTP server closed");
    });

    // Disconnect all instances (sessions preserved in PostgreSQL)
    try {
      await instanceManager.shutdownAll();
    } catch {
      logger.error("Error during instance shutdown");
    }

    // Close PostgreSQL pool
    try {
      await pgPool.end();
    } catch {
      logger.error("Error closing PostgreSQL pool");
    }

    logger.info("Graceful shutdown complete - sessions preserved in PostgreSQL");
    process.exit(0);
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  // Handle uncaught errors WITHOUT killing the process
  process.on("uncaughtException", (error: Error) => {
    logger.fatal(
      { error: error.message, stack: error.stack },
      "Uncaught exception - attempting to continue"
    );
    // Don't exit - let the process continue. Only critical failures
    // like OOM will naturally kill the process.
    // Docker's restart policy handles truly fatal crashes.
  });

  process.on("unhandledRejection", (reason: unknown) => {
    logger.error({ reason }, "Unhandled promise rejection");
  });
}

main().catch((error: Error) => {
  logger.fatal({ error: error.message }, "Failed to start ChatCube Engine");
  process.exit(1);
});
