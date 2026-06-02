import type { Request, Response, NextFunction } from "express";
import { parseCoordinatePair } from "../../utils/geo";
import * as scdfService from "./scdf.service";

export async function getResources(req: Request, res: Response, next: NextFunction) {
  try {
    const resourceType = scdfService.parseScdfResourceType(req.query.type);
    const data = await scdfService.getResources(resourceType);
    res.json({ data, source: "SCDF public resources (data.gov.sg)", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getNearest(req: Request, res: Response, next: NextFunction) {
  try {
    const { lat, lng } = parseCoordinatePair(req.query.lat, req.query.lng);
    const resourceType = scdfService.parseScdfResourceType(req.query.type);
    const data = await scdfService.getNearestResources(lat, lng, resourceType);
    res.json({ data, source: "SCDF public resources (data.gov.sg)", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}
