import type { NextFunction, Request, Response } from "express";
import {
  approveResourceAllocation,
  decideResourceAllocation,
} from "./resourceAllocation.service";

export function postResourceAllocationApproval(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(approveResourceAllocation(req.body ?? {}));
  } catch (error) {
    next(error);
  }
}

export function postResourceAllocationDecision(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(decideResourceAllocation(req.body ?? {}));
  } catch (error) {
    next(error);
  }
}
