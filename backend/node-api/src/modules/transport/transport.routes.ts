import { Router } from "express";
import * as controller from "./transport.controller";

export const transportRouter = Router();

transportRouter.get("/incidents", controller.getTrafficIncidents);
transportRouter.get("/train-alerts", controller.getTrainAlerts);
transportRouter.get("/travel-times", controller.getTravelTimes);
transportRouter.get("/speed-bands", controller.getTrafficSpeedBands);
transportRouter.get("/traffic-cameras", controller.getTrafficCameras);
transportRouter.get("/faulty-traffic-lights", controller.getFaultyTrafficLights);
transportRouter.get("/crowd-density", controller.getCrowdDensityRealtime);
transportRouter.get("/crowd-density-forecast", controller.getCrowdDensityForecast);
transportRouter.get("/bus-arrivals", controller.getBusArrivals);
transportRouter.get("/road-works", controller.getRoadWorks);
transportRouter.get("/road-openings", controller.getRoadOpenings);
transportRouter.get("/carparks", controller.getCarparkAvailability);
transportRouter.get("/flood-alerts", controller.getLtaFloodAlerts);
