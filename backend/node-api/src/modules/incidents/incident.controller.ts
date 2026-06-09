import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../../utils/apiError";
import {
  getIncidentClusterDetails,
  getIncidentClusters,
  getDispatcherPriorityQueue,
  getPublicIncidentReportList,
  getResponderIncidentList,
  submitIncidentReport,
  updateIncidentStatus,
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

export async function getIncidentClusterList(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ clusters: await getIncidentClusters() });
  } catch (error) {
    next(error);
  }
}

export async function getIncidentClusterById(req: Request, res: Response, next: NextFunction) {
  try {
    const cluster = await getIncidentClusterDetails(String(req.params.incidentId));
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

export async function getPriorityQueue(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ items: await getDispatcherPriorityQueue() });
  } catch (error) {
    next(error);
  }
}

export async function getResponderIncidents(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ incidents: await getResponderIncidentList() });
  } catch (error) {
    next(error);
  }
}

export async function getIncidents(req: Request, res: Response, next: NextFunction) {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const statuses = status
      ? status
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : undefined;
    res.json({ incidents: await getIncidentClusters(statuses) });
  } catch (error) {
    next(error);
  }
}

export async function getIncidentById(req: Request, res: Response, next: NextFunction) {
  try {
    const incident = await getIncidentClusterDetails(String(req.params.incidentId));
    if (!incident) {
      throw new ApiError("NOT_FOUND", "Incident not found.", 404, {
        incident_id: req.params.incidentId,
      });
    }
    res.json({ incident });
  } catch (error) {
    next(error);
  }
}

export async function patchIncident(req: Request, res: Response, next: NextFunction) {
  try {
    const incident = await updateIncidentStatus(String(req.params.incidentId), req.body ?? {});
    res.json({ incident });
  } catch (error) {
    next(error);
  }
}

export async function getPublicReports(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ reports: await getPublicIncidentReportList() });
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
