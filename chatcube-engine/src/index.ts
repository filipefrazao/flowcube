import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import pino from "pino";
import { config } from "./config";
import { authMiddleware } from "./middleware/auth";
import { errorHandler } from "./middleware/errorHandler";
import healthRouter from "./routes/health";
import instancesRouter from "./routes/instances";
import messagesRouter from "./routes/messages";
import { InstanceManager } from "./services/InstanceManager";
import { AuthStore } from "./services/AuthStore";

const logger = pino({ name: "chatcube-engine" });

async function main(): Promise<void> {
  logger.info(
    {
      nodeEnv: config.nodeEnv,
      port: config.port,
    },
    "Starting ChatCube Engine..."
  );

  // Initialize auth store (create table if needed)
  const authStore = new AuthStore();
  try {
    await authStore.initialize();
    logger.info("Auth store initialized");
  } catch (error: unknown) {
    logger.warn(
      "Auth store initialization failed - will retry on first use"
    );
  }

  // Initialize instance manager
  const instanceManager = InstanceManager.getInstance();

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
    res.status(404).json({
      success: false,
      error: "Route not found",
    });
  });

  // Global error handler
  app.use(errorHandler);

  // Start server
  const server = app.listen(config.port, () => {
    logger.info(
      {
        port: config.port,
        nodeEnv: config.nodeEnv,
      },
      `ChatCube Engine running on port ${config.port}`
    );
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, "Received shutdown signal");

    // Stop accepting new connections
    server.close(() => {
      logger.info("HTTP server closed");
    });

    // Disconnect all WhatsApp instances
    try {
      await instanceManager.shutdownAll();
    } catch (error: unknown) {
      logger.error("Error during instance shutdown");
    }

    // Close auth store pool
    try {
      await authStore.close();
    } catch (error: unknown) {
      logger.error("Error closing auth store");
    }

    logger.info("Graceful shutdown complete");
    process.exit(0);
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  // Handle uncaught errors
  process.on("uncaughtException", (error: Error) => {
    logger.fatal({ error: error.message, stack: error.stack }, "Uncaught exception");
    process.exit(1);
  });

  process.on("unhandledRejection", (reason: unknown) => {
    logger.error({ reason }, "Unhandled promise rejection");
  });
}

main().catch((error: Error) => {
  logger.fatal({ error: error.message }, "Failed to start ChatCube Engine");
  process.exit(1);
});
