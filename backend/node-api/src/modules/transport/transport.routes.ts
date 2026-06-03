import { Router } from "express";
import * as controller from "./transport.controller";

export const transportRouter = Router();

transportRouter.get("/incidents", controller.getTrafficIncidents);
transportRouter.get("/train-alerts", controller.getTrainAlerts);
transportRouter.get("/flood-alerts", controller.getLtaFloodAlerts);
