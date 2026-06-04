import type { NextFunction, Request, Response } from "express";
import {
  createAllocationRecommendation,
  listAllocationRecommendations,
  listCommandTimeline,
  updateAllocationAgencyStatus,
} from "./command.service";

export async function getAllocations(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await listAllocationRecommendations();
    res.json({
      data,
      source: "MURUS command state",
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

export async function postAllocation(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await createAllocationRecommendation(req.body ?? {});
    res.status(201).json({
      data,
      source: "MURUS command state",
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

export async function patchAllocationAgencies(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await updateAllocationAgencyStatus(String(req.params.id), req.body ?? {});
    res.json({
      data,
      source: "MURUS command state",
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

export async function getTimeline(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await listCommandTimeline();
    res.json({
      data,
      source: "MURUS command state",
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}
