import { Router } from "express";
import { optionalAuth, requireAuth, requireRole } from "../../middlewares/auth";
import * as controller from "./residentAlerts.controller";

export const residentAlertsRouter = Router();

residentAlertsRouter.get("/", controller.getResidentAlerts);
residentAlertsRouter.post("/ask-murus", optionalAuth, controller.postAskMurus);
residentAlertsRouter.post("/rumor-check", optionalAuth, controller.postRumorCheck);
residentAlertsRouter.post("/", requireAuth, requireRole("leader"), controller.postResidentAlert);
residentAlertsRouter.patch("/:id", requireAuth, requireRole("leader"), controller.patchResidentAlert);
