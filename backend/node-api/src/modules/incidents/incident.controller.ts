import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../../utils/apiError";
import {
  getIncidentClusterDetails,
  getIncidentClusters,
  getDispatcherPriorityQueue,
  getResponderIncidentList,
  submitIncidentReport,
} from "./incident.service";
import {
  getIncidentReports,
  createIncidentReport,
  updateIncidentReport,
} from "./incidentReport.service";
import {
  createResponderIncidentLog,
  getResponderIncidentLogs,
} from "./responderLog.service";

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

export function getPriorityQueue(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ items: getDispatcherPriorityQueue() });
  } catch (error) {
    next(error);
  }
}

export function getResponderIncidents(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ incidents: getResponderIncidentList() });
  } catch (error) {
    next(error);
  }
}

export async function getLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { incidentId } = req.params;
    const logs = await getResponderIncidentLogs(String(incidentId));
    res.json({ logs });
  } catch (error) {
    next(error);
  }
}

export async function postLog(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { incidentId } = req.params;
    const log = await createResponderIncidentLog(String(incidentId), req.body ?? {});
    res.status(201).json(log);
  } catch (error) {
    next(error);
  }
}

export async function getReports(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { incidentId } = req.params;
    const reports = await getIncidentReports(String(incidentId));
    res.json({
      data: { incident_id: incidentId, reports },
      source: "node-api",
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

export async function postReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { incidentId } = req.params;
    const report = await createIncidentReport(
      String(incidentId),
      req.user!.id,
      req.user!.agency ?? "",
      req.body ?? {}
    );
    res.status(201).json({
      data: report,
      source: "node-api",
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

export async function patchReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { reportId } = req.params;
    const report = await updateIncidentReport(
      String(reportId),
      req.user!.id,
      req.user!.agency ?? "",
      req.body ?? {}
    );
    res.json({
      data: report,
      source: "node-api",
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}
