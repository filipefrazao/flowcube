import { Router, Request, Response } from "express";
import { config } from "../config";
import { InstanceManager } from "../services/InstanceManager";
import { HealthResponse, ApiResponse } from "../types";

const router = Router();
const pkg = require("../../package.json");

/**
 * GET /api/health
 * Health check endpoint - no auth required
 */
router.get("/", (_req: Request, res: Response<ApiResponse<HealthResponse>>) => {
  const manager = InstanceManager.getInstance();

  const healthData: HealthResponse = {
    status: "ok",
    uptime: process.uptime(),
    instances: manager.getInstanceCount(),
    version: pkg.version || "1.0.0",
    nodeEnv: config.nodeEnv,
  };

  res.json({
    success: true,
    data: healthData,
  });
});

export default router;
