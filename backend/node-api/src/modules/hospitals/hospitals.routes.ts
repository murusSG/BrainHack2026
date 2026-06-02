import { Router } from "express";
import * as controller from "./hospitals.controller";

export const hospitalsRouter = Router();

hospitalsRouter.get("/occupancy", controller.getOccupancy);
hospitalsRouter.get("/waiting-times", controller.getWaitingTimes);
hospitalsRouter.get("/reference", controller.getReference);
hospitalsRouter.get("/sources", controller.getSources);

