import type { Request, Response, NextFunction } from "express";
import * as floodService from "./flood.service";

export async function getFloodAlerts(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await floodService.getFloodAlerts();
    res.json({ data, source: "PUB Flood Alerts (data.gov.sg)", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getWaterSensors(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await floodService.getWaterSensors();
    res.json({ data, source: "PUB Water Level Sensors (data.gov.sg)", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}
