import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../../utils/apiError";
import {
  getIncidentClusterDetails,
  getIncidentClusters,
  submitIncidentReport,
} from "./incident.service";

export async function postIncidentReport(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await submitIncidentReport(req.body ?? {});
    const statusCode = result.status === "new_incident_created" ? 201 : 200;
    res.status(statusCode).json(result);
  } catch (error) {
    next(error);
  }
}

export function getIncidentClusterList(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ clusters: getIncidentClusters() });
  } catch (error) {
    next(error);
  }
}

export function getIncidentClusterById(req: Request, res: Response, next: NextFunction) {
  try {
    const cluster = getIncidentClusterDetails(String(req.params.incidentId));
    if (!cluster) {
      throw new ApiError("NOT_FOUND", "Incident cluster not found.", 404, {
        incident_id: req.params.incidentId,
      });
    }
    res.json(cluster);
  } catch (error) {
    next(error);
  }
}
