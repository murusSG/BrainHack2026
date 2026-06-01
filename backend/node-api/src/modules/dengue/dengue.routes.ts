import { Router } from "express";
import * as controller from "./dengue.controller";

export const dengueRouter = Router();

dengueRouter.get("/clusters", controller.getDengueClusters);
