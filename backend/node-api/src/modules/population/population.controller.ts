import type { Request, Response, NextFunction } from "express";
import { BadRequestError } from "../../utils/apiError";
import { parseCoordinatePair } from "../../utils/geo";
import * as populationService from "./population.service";

export async function getHdbBuildings(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await populationService.getHdbBuildings();
    res.json({ data, source: "HDB buildings (data.gov.sg)", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getPlanningAreas(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await populationService.getPlanningAreas();
    res.json({ data, source: "Population planning areas (data.gov.sg)", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getImpactContext(req: Request, res: Response, next: NextFunction) {
  try {
    const area = req.query.area ? String(req.query.area).trim() : "";
    if (!area) throw new BadRequestError("Planning area is required.");
    const data = await populationService.getImpactContext(area);
    res.json({ data, source: "Population impact context", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getNearbyContext(req: Request, res: Response, next: NextFunction) {
  try {
    const { lat, lng } = parseCoordinatePair(req.query.lat, req.query.lng);
    const data = await populationService.getNearbyContext(lat, lng);
    res.json({ data, source: "Population nearby context", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}
