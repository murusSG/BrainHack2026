import type { Request, Response, NextFunction } from "express";
import * as dengueService from "./dengue.service";

export async function getDengueClusters(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await dengueService.getDengueClusters();
    res.json({ data, source: "NEA Dengue Clusters (data.gov.sg)", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}
