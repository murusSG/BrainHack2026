import type { NextFunction, Request, Response } from "express";
import {
  approveResourceAllocation,
  decideResourceAllocation,
} from "./resourceAllocation.service";

export async function postResourceAllocationApproval(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    res.json(await approveResourceAllocation(req.body ?? {}));
  } catch (error) {
    next(error);
  }
}

export async function postResourceAllocationDecision(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    res.json(await decideResourceAllocation(req.body ?? {}));
  } catch (error) {
    next(error);
  }
}
