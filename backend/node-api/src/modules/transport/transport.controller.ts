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

export async function getTravelTimes(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await transportService.getTravelTimes();
    res.json({ data, source: "LTA DataMall /EstTravelTimes", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getTrafficSpeedBands(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await transportService.getTrafficSpeedBands();
    res.json({ data, source: "LTA DataMall /TrafficSpeedBands", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getTrafficCameras(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await transportService.getTrafficCameras();
    res.json({ data, source: "LTA DataMall /Traffic-Imagesv2", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getFaultyTrafficLights(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await transportService.getFaultyTrafficLights();
    res.json({ data, source: "LTA DataMall /FaultyTrafficLights", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getCrowdDensityRealtime(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await transportService.getCrowdDensityRealtime();
    res.json({ data, source: "LTA DataMall /PCDRealTime", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getCrowdDensityForecast(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await transportService.getCrowdDensityForecast();
    res.json({ data, source: "LTA DataMall /PCDForecast", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getBusArrivals(req: Request, res: Response, next: NextFunction) {
  try {
    const { busStopCode } = req.query;
    if (!busStopCode || typeof busStopCode !== "string" || !/^\d{5}$/.test(busStopCode)) {
      res.status(400).json({ error: "busStopCode query param is required and must be a 5-digit string" });
      return;
    }
    const data = await transportService.getBusArrivals(busStopCode);
    res.json({ data, source: "LTA DataMall /BusArrivalv2", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getRoadWorks(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await transportService.getRoadWorks();
    res.json({ data, source: "LTA DataMall /RoadWorks", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getRoadOpenings(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await transportService.getRoadOpenings();
    res.json({ data, source: "LTA DataMall /RoadOpenings", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getCarparkAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await transportService.getCarparkAvailability();
    res.json({ data, source: "LTA DataMall /CarParkAvailabilityv2", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getLtaFloodAlerts(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await transportService.getLtaFloodAlerts();
    res.json({ data, source: "LTA DataMall /Flood-Alerts", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}
