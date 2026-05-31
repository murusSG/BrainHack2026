import { Router } from "express";
import * as controller from "./environmental.controller";

export const environmentalRouter = Router();

environmentalRouter.get("/psi", controller.getPsi);
environmentalRouter.get("/pm25", controller.getPm25);
environmentalRouter.get("/rainfall", controller.getRainfall);
environmentalRouter.get("/weather", controller.getWeatherForecast);
