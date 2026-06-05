import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { requestLogger } from "./middlewares/requestLogger";
import { errorHandler } from "./middlewares/errorHandler";
import { v1Router } from "./routes/v1";
import { incidentRouter } from "./modules/incidents/incident.routes";
import { resourceAllocationRouter } from "./modules/resourceAllocation/resourceAllocation.routes";

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
  app.use("/api/incidents", incidentRouter);
  app.use("/api/resource-allocation", resourceAllocationRouter);

  app.use(errorHandler);

  return app;
}
