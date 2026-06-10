import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../../utils/apiError";
import { getResidentProfile, updateResidentProfile } from "./residents.service";

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new ApiError("UNAUTHORIZED", "Authentication required.", 401);
    const data = await getResidentProfile(req.user);
    res.json({
      data,
      source: "MURUS resident profile",
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

export async function patchMe(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new ApiError("UNAUTHORIZED", "Authentication required.", 401);
    const data = await updateResidentProfile(req.user, req.body ?? {});
    res.json({
      data,
      source: "MURUS resident profile",
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}
