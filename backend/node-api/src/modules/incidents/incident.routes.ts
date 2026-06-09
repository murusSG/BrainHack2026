import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import * as controller from "./incident.controller";

export const incidentRouter = Router();

incidentRouter.get("/", controller.getIncidents);
incidentRouter.post("/report", controller.postIncidentReport);
incidentRouter.get("/public-reports", controller.getPublicReports);
incidentRouter.post("/public-reports", controller.postIncidentReport);
incidentRouter.get("/priority-queue", controller.getPriorityQueue);
incidentRouter.get("/queue/pending", controller.getPriorityQueue);
incidentRouter.get("/responder", controller.getResponderIncidents);
incidentRouter.get("/clusters", controller.getIncidentClusterList);
incidentRouter.get("/clusters/:incidentId", controller.getIncidentClusterById);
incidentRouter.get("/:incidentId", controller.getIncidentById);
incidentRouter.patch("/:incidentId/status", controller.patchIncident);
incidentRouter.get("/:incidentId/logs", controller.getLogs);
incidentRouter.post("/:incidentId/logs", controller.postLog);
incidentRouter.get("/:incidentId/reports", requireAuth, controller.getReports);
incidentRouter.post("/:incidentId/reports", requireAuth, controller.postReport);
incidentRouter.patch("/:incidentId/reports/:reportId", requireAuth, controller.patchReport);
