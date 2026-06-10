import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import * as controller from "./residents.controller";

export const residentsRouter = Router();

residentsRouter.get("/me", requireAuth, controller.getMe);
residentsRouter.patch("/me", requireAuth, controller.patchMe);
