import type { Request, Response, NextFunction } from "express";

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const message = err instanceof Error ? err.message : "Internal server error";
  const status = (err as { status?: number }).status ?? 500;
  console.error(`[error] ${req.method} ${req.path}:`, message);
  res.status(status).json({ error: message });
}
