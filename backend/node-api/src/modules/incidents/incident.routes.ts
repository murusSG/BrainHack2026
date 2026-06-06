import { Router } from "express";
import * as controller from "./incident.controller";

export const incidentRouter = Router();

incidentRouter.post("/report", controller.postIncidentReport);
incidentRouter.get("/priority-queue", controller.getPriorityQueue);
incidentRouter.get("/responder", controller.getResponderIncidents);
incidentRouter.get("/:incidentId/logs", controller.getResponderLogs);
incidentRouter.post("/:incidentId/logs", controller.postResponderLog);
incidentRouter.get("/clusters", controller.getIncidentClusterList);
incidentRouter.get("/clusters/:incidentId", controller.getIncidentClusterById);
