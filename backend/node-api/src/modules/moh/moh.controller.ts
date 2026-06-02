import type { Request, Response, NextFunction } from "express";
import * as mohService from "./moh.service";

export async function getInfectiousDiseases(req: Request, res: Response, next: NextFunction) {
  try {
    const disease = req.query.disease ? String(req.query.disease) : undefined;
    const data = await mohService.getInfectiousDiseases(disease);
    res.json({ data, source: "MOH / CDA public health datasets", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getHealthCapacity(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await mohService.getHealthCapacity();
    res.json({ data, source: "MOH health capacity datasets", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getCovidWeekly(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await mohService.getCovidWeekly();
    res.json({ data, source: "MOH COVID weekly datasets", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getSignalsSummary(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await mohService.getSignalsSummary();
    res.json({ data, source: "MOH / CDA health signal summary", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}
