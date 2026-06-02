import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { requestLogger } from "./middlewares/requestLogger";
import { errorHandler } from "./middlewares/errorHandler";
import { v1Router } from "./routes/v1";
import { scdfRouter } from "./modules/scdf/scdf.routes";
import { mohRouter } from "./modules/moh/moh.routes";
import { oneMapRouter } from "./modules/onemap/onemap.routes";
import { hdbRouter, populationRouter } from "./modules/population/population.routes";
import { hospitalsRouter } from "./modules/hospitals/hospitals.routes";
import { crisisRouter } from "./modules/crisis/crisis.routes";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json());
  app.use(requestLogger);

  app.get("/", (_req, res) => {
    res.json({
      service: "murusSG Node API",
      status: "ok",
      docs: "/api/v1/health",
    });
  });

  app.get("/api/v1/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/api/v1", v1Router);
  app.use("/api/crisis", crisisRouter);
  app.use("/api/scdf", scdfRouter);
  app.use("/api/moh", mohRouter);
  app.use("/api/onemap", oneMapRouter);
  app.use("/api/hdb", hdbRouter);
  app.use("/api/population", populationRouter);
  app.use("/api/hospitals", hospitalsRouter);

  app.use(errorHandler);

  return app;
}
