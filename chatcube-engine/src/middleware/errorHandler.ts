import { Request, Response, NextFunction } from "express";
import pino from "pino";
import { ApiResponse } from "../types";

const logger = pino({ name: "error-handler" });

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response<ApiResponse>,
  _next: NextFunction
): void {
  logger.error(
    {
      err: err.message,
      stack: err.stack,
      method: req.method,
      path: req.path,
      body: req.body,
    },
    "Unhandled error"
  );

  const statusCode = (err as any).statusCode || 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message;

  res.status(statusCode).json({
    success: false,
    error: message,
  });
}
