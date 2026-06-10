import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth";
import * as controller from "./residentAlerts.controller";

export const residentAlertsRouter = Router();

residentAlertsRouter.get("/", controller.getResidentAlerts);
residentAlertsRouter.post("/ask-murus", controller.postAskMurus);
residentAlertsRouter.post("/", requireAuth, requireRole("leader"), controller.postResidentAlert);
residentAlertsRouter.patch("/:id", requireAuth, requireRole("leader"), controller.patchResidentAlert);
