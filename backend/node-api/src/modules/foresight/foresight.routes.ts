import { Router } from "express";
import * as controller from "./foresight.controller";

export const foresightRouter = Router();

foresightRouter.get("/predictions", controller.getPredictions);
