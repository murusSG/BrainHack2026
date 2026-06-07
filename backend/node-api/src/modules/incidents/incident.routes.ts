import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import * as controller from "./incident.controller";

export const incidentRouter = Router();

incidentRouter.post("/report", controller.postIncidentReport);
incidentRouter.get("/priority-queue", controller.getPriorityQueue);
incidentRouter.get("/responder", controller.getResponderIncidents);
incidentRouter.get("/clusters", controller.getIncidentClusterList);
incidentRouter.get("/clusters/:incidentId", controller.getIncidentClusterById);
incidentRouter.get("/:incidentId/reports", requireAuth, controller.getReports);
incidentRouter.post("/:incidentId/reports", requireAuth, controller.postReport);
incidentRouter.patch("/:incidentId/reports/:reportId", requireAuth, controller.patchReport);
