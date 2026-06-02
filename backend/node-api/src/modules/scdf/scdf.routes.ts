import { Router } from "express";
import * as controller from "./scdf.controller";

export const scdfRouter = Router();

scdfRouter.get("/resources", controller.getResources);
scdfRouter.get("/nearest", controller.getNearest);
