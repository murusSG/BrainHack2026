import type { NextFunction, Request, Response } from "express";
import { BadRequestError } from "../../utils/apiError";
import { parseCoordinatePair } from "../../utils/geo";
import * as streetViewClient from "../../services/googleStreetView.client";

export async function metadata(req: Request, res: Response, next: NextFunction) {
  try {
    const point = parseCoordinatePair(req.query.lat, req.query.lng);
    const data = await streetViewClient.streetViewPreview({
      ...point,
      heading: optionalNumber(req.query.heading, "heading"),
      pitch: optionalNumber(req.query.pitch, "pitch"),
      fov: optionalNumber(req.query.fov, "fov"),
      radius: optionalNumber(req.query.radius, "radius"),
    });
    res.json({ data, source: "Google Street View metadata", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function image(req: Request, res: Response, next: NextFunction) {
  try {
    const point = parseCoordinatePair(req.query.lat, req.query.lng);
    const data = await streetViewClient.streetViewImage({
      ...point,
      heading: optionalNumber(req.query.heading, "heading"),
      pitch: optionalNumber(req.query.pitch, "pitch"),
      fov: optionalNumber(req.query.fov, "fov"),
      radius: optionalNumber(req.query.radius, "radius"),
    });
    res.setHeader("Content-Type", data.contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(data.bytes);
  } catch (err) {
    next(err);
  }
}

function optionalNumber(value: unknown, label: string): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new BadRequestError(`${label} must be numeric.`, { [label]: value });
  }
  return parsed;
}
