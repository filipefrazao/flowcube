import { Request, Response, NextFunction } from "express";
import { config } from "../config";
import { ApiResponse } from "../types";

/**
 * Authentication middleware - validates X-Engine-Key header
 * Bypasses /api/health endpoint
 */
export function authMiddleware(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): void {
  // Bypass health check
  if (req.path === "/api/health" || req.path === "/api/health/") {
    next();
    return;
  }

  const apiKey = req.headers["x-engine-key"] as string | undefined;

  if (!apiKey) {
    res.status(401).json({
      success: false,
      error: "Missing X-Engine-Key header",
    });
    return;
  }

  if (apiKey !== config.engineApiKey) {
    res.status(403).json({
      success: false,
      error: "Invalid API key",
    });
    return;
  }

  next();
}
