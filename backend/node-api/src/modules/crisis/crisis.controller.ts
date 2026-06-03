import type { Request, Response, NextFunction } from "express";
import { aggregateEvents, getEventById, type CrisisEventFilter } from "./crisis.service";
import { BadRequestError, ApiError } from "../../utils/apiError";
import { SEVERITY_ORDER, type HazardType, type Severity } from "../../../../shared/types/crisisEvent";

const HAZARD_TYPES: HazardType[] = ["environmental", "biological", "security", "infrastructure"];

function parseFilter(req: Request): CrisisEventFilter {
  const filter: CrisisEventFilter = {};

  const hazardType = req.query.hazardType;
  if (typeof hazardType === "string") {
    if (!HAZARD_TYPES.includes(hazardType as HazardType)) {
      throw new BadRequestError("Unsupported hazardType.", { hazardType, allowed: HAZARD_TYPES });
    }
    filter.hazardType = hazardType as HazardType;
  }

  const severity = req.query.severity;
  if (typeof severity === "string") {
    if (!SEVERITY_ORDER.includes(severity as Severity)) {
      throw new BadRequestError("Unsupported severity.", { severity, allowed: SEVERITY_ORDER });
    }
    filter.minSeverity = severity as Severity;
  }

  // near=lat,lng,radiusMeters: the proximity lens.
  const near = req.query.near;
  if (typeof near === "string") {
    const parts = near.split(",").map((part) => Number(part.trim()));
    const [lat, lng, radiusMeters] = parts;
    if (parts.length !== 3 || parts.some((value) => !Number.isFinite(value))) {
      throw new BadRequestError("near must be 'lat,lng,radiusMeters' with numeric values.", { near });
    }
    filter.near = { lat, lng, radiusMeters };
  }

  return filter;
}

export async function getEvents(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await aggregateEvents(parseFilter(req));
    res.json({ data, source: "murusSG crisis aggregator", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    const event = await getEventById(id);
    if (!event) throw new ApiError("NOT_FOUND", "Crisis event not found.", 404, { id });
    res.json({ data: event, source: "murusSG crisis aggregator", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}
