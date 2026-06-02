import type { NextFunction, Request, Response } from "express";
import { publicHospitalDataService } from "./hospitals.service";

export async function getOccupancy(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await publicHospitalDataService.getOccupancy());
  } catch (err) {
    next(err);
  }
}

export async function getWaitingTimes(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await publicHospitalDataService.getWaitingTimes());
  } catch (err) {
    next(err);
  }
}

export async function getReference(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await publicHospitalDataService.getReference());
  } catch (err) {
    next(err);
  }
}

export function getSources(_req: Request, res: Response) {
  res.json(publicHospitalDataService.getSources());
}

