import { Router } from "express";
import * as controller from "./moh.controller";

export const mohRouter = Router();

mohRouter.get("/infectious-diseases", controller.getInfectiousDiseases);
mohRouter.get("/covid-weekly", controller.getCovidWeekly);
mohRouter.get("/health-capacity", controller.getHealthCapacity);
mohRouter.get("/signals/summary", controller.getSignalsSummary);
