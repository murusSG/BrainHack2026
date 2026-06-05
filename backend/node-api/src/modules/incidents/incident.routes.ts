import { Router } from "express";
import * as controller from "./incident.controller";

export const incidentRouter = Router();

incidentRouter.post("/report", controller.postIncidentReport);
incidentRouter.get("/clusters", controller.getIncidentClusterList);
incidentRouter.get("/clusters/:incidentId", controller.getIncidentClusterById);
