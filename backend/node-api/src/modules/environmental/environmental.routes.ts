import { Router } from "express";
import * as controller from "./environmental.controller";

export const environmentalRouter = Router();

environmentalRouter.get("/psi", controller.getPsi);
environmentalRouter.get("/pm25", controller.getPm25);
environmentalRouter.get("/rainfall", controller.getRainfall);
environmentalRouter.get("/weather", controller.getWeatherForecast);
environmentalRouter.get("/air-temperature", controller.getAirTemperature);
environmentalRouter.get("/humidity", controller.getHumidity);
environmentalRouter.get("/wind-direction", controller.getWindDirection);
environmentalRouter.get("/wind-speed", controller.getWindSpeed);
environmentalRouter.get("/uv-index", controller.getUvIndex);
environmentalRouter.get("/weather-24h", controller.getWeatherForecast24h);
environmentalRouter.get("/weather-4day", controller.getWeatherForecast4Day);
