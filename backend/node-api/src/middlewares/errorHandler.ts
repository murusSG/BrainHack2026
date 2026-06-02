import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const message = err instanceof Error ? err.message : "Internal server error";
  const status = err instanceof ApiError ? err.status : 500;
  const code = err instanceof ApiError ? err.code : "INTERNAL_ERROR";
  const details = err instanceof ApiError ? err.details : {};
  console.error(`[error] ${req.method} ${req.path}:`, message);
  res.status(status).json({ error: { code, message, details } });
}
