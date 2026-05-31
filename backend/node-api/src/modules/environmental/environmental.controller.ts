import type { Request, Response, NextFunction } from "express";
import * as environmentalService from "./environmental.service";

export async function getPsi(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await environmentalService.getPsi();
    res.json({ data, source: "NEA /environment/psi", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getPm25(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await environmentalService.getPm25();
    res.json({ data, source: "NEA /environment/pm25", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getRainfall(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await environmentalService.getRainfall();
    res.json({ data, source: "NEA /environment/rainfall", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getWeatherForecast(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await environmentalService.getWeatherForecast();
    res.json({ data, source: "NEA /environment/2-hour-weather-forecast", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}
