import type { Request, Response, NextFunction } from "express";
import { BadRequestError } from "../../utils/apiError";
import { parseCoordinatePair } from "../../utils/geo";
import type { RouteMode } from "../../services/oneMap.client";
import * as oneMapService from "./onemap.service";

export async function search(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.query.query ? String(req.query.query).trim() : "";
    if (!query) throw new BadRequestError("Search query is required.");
    const data = await oneMapService.search(query);
    res.json({ data, source: "OneMap search", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function reverseGeocode(req: Request, res: Response, next: NextFunction) {
  try {
    const { lat, lng } = parseCoordinatePair(req.query.lat, req.query.lng);
    const data = await oneMapService.reverseGeocode(lat, lng);
    res.json({ data, source: "OneMap reverse geocode", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function route(req: Request, res: Response, next: NextFunction) {
  try {
    const start = parseCoordinatePair(req.query.startLat, req.query.startLng);
    const end = parseCoordinatePair(req.query.endLat, req.query.endLng);
    const mode = (req.query.mode ? String(req.query.mode) : "drive") as RouteMode;
    if (!["drive", "walk", "cycle", "pt"].includes(mode)) {
      throw new BadRequestError("Unsupported route mode.", { mode });
    }
    const data = await oneMapService.route(start.lat, start.lng, end.lat, end.lng, mode);
    res.json({ data, source: "OneMap route", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}
