import type { Request, Response, NextFunction } from "express";
import { supabase } from "../config/supabase";
import { authRepo } from "../repositories/auth.repo";
import { ApiError, ConfigurationError } from "../utils/apiError";

export type UserRole = "public" | "responder" | "leader";

export interface AuthUser {
  id: string;
  email?: string;
  role: UserRole;
  agency?: string;
  fullName?: string;
  phone?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function extractBearerToken(req: Request): string | null {
  const header = req.header("authorization") ?? req.header("Authorization");
  if (!header || !header.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (!supabase) {
      throw new ConfigurationError("Authentication is unavailable: Supabase is not configured.");
    }
    const token = extractBearerToken(req);
    if (!token) throw new ApiError("UNAUTHORIZED", "Missing bearer token.", 401);

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) throw new ApiError("UNAUTHORIZED", "Invalid or expired token.", 401);

    const profile = await authRepo.getProfile(data.user.id);
    const role = profile?.role ?? parseRole(data.user.app_metadata?.role);
    req.user = {
      id: data.user.id,
      email: data.user.email ?? undefined,
      role,
      agency: profile?.agency,
      fullName: profile?.fullName,
      phone: profile?.phone,
    };
    next();
  } catch (err) {
    next(err);
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (!supabase) {
      next();
      return;
    }

    const token = extractBearerToken(req);
    if (!token) {
      next();
      return;
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) throw new ApiError("UNAUTHORIZED", "Invalid or expired token.", 401);

    const profile = await authRepo.getProfile(data.user.id);
    const role = profile?.role ?? parseRole(data.user.app_metadata?.role);
    req.user = {
      id: data.user.id,
      email: data.user.email ?? undefined,
      role,
      agency: profile?.agency,
      fullName: profile?.fullName,
      phone: profile?.phone,
    };
    next();
  } catch (err) {
    next(err);
  }
}

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

function parseRole(value: unknown): UserRole {
  return value === "leader" || value === "responder" || value === "public" ? value : "public";
}
