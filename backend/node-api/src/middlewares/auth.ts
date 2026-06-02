import type { Request, Response, NextFunction } from "express";
import { supabase } from "../config/supabase";
import { ApiError, ConfigurationError } from "../utils/apiError";

export type UserRole = "public" | "responder" | "leader";

export interface AuthUser {
  id: string;
  email?: string;
  role: UserRole;
}

// Augment Express's Request so downstream handlers see `req.user`.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function extractBearerToken(req: Request): string | null {
  const header = req.header("authorization") ?? req.header("Authorization");
  if (!header || !header.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

/**
 * Verifies the `Authorization: Bearer <jwt>` against Supabase and attaches the
 * resolved user (with role from `app_metadata.role`) to `req.user`.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (!supabase) {
      throw new ConfigurationError("Authentication is unavailable: Supabase is not configured.");
    }
    const token = extractBearerToken(req);
    if (!token) throw new ApiError("UNAUTHORIZED", "Missing bearer token.", 401);

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) throw new ApiError("UNAUTHORIZED", "Invalid or expired token.", 401);

    const role = (data.user.app_metadata?.role as UserRole | undefined) ?? "public";
    req.user = { id: data.user.id, email: data.user.email ?? undefined, role };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Guards a route to the given roles. Must run after `requireAuth`. Leaders are
 * the highest tier; pass the exact roles a route should admit.
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ApiError("UNAUTHORIZED", "Authentication required.", 401));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new ApiError("FORBIDDEN", "You do not have access to this resource.", 403, {
        required: roles,
        actual: req.user.role,
      }));
      return;
    }
    next();
  };
}
