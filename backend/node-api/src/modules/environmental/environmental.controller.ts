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

export async function getAirTemperature(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await environmentalService.getAirTemperature();
    res.json({ data, source: "NEA /environment/air-temperature", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getHumidity(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await environmentalService.getHumidity();
    res.json({ data, source: "NEA /environment/relative-humidity", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getWindDirection(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await environmentalService.getWindDirection();
    res.json({ data, source: "NEA /environment/wind-direction", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getWindSpeed(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await environmentalService.getWindSpeed();
    res.json({ data, source: "NEA /environment/wind-speed", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getUvIndex(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await environmentalService.getUvIndex();
    res.json({ data, source: "NEA /environment/uv-index", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getWeatherForecast24h(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await environmentalService.getWeatherForecast24h();
    res.json({ data, source: "NEA /environment/24-hour-weather-forecast", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getWeatherForecast4Day(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await environmentalService.getWeatherForecast4Day();
    res.json({ data, source: "NEA /environment/4-day-weather-forecast", fetchedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}
