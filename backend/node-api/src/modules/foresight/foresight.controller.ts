import type { Request, Response, NextFunction } from "express";
import { getForesightPredictions } from "./foresight.service";

function parseIntervention(value: unknown, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function getPredictions(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await getForesightPredictions({
      surgeBeds: parseIntervention(req.query.surgeBeds, 0),
      qrtCount: parseIntervention(req.query.qrtCount, 0),
    });
    res.json({
      data,
      source: "MURUS deterministic foresight engine + optional OpenAI narrative layer",
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}
