import { Router } from "express";
import * as controller from "./flood.controller";

export const floodRouter = Router();

floodRouter.get("/alerts", controller.getFloodAlerts);
floodRouter.get("/sensors", controller.getWaterSensors);
