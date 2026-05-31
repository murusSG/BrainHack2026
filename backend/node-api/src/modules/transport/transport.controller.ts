import type { Request, Response, NextFunction } from "express";
import * as transportService from "./transport.service";

export async function getTrafficIncidents(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await transportService.getTrafficIncidents();
    res.json({ data, source: "LTA DataMall /TrafficIncidents", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getTrainAlerts(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await transportService.getTrainAlerts();
    res.json({ data, source: "LTA DataMall /TrainServiceAlerts", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}
