import { Router } from "express";
import * as controller from "./population.controller";

export const hdbRouter = Router();
export const populationRouter = Router();

hdbRouter.get("/buildings", controller.getHdbBuildings);

populationRouter.get("/planning-areas", controller.getPlanningAreas);
populationRouter.get("/impact-context", controller.getImpactContext);
populationRouter.get("/nearby-context", controller.getNearbyContext);
