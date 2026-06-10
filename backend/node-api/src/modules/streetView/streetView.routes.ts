import { Router } from "express";
import * as controller from "./streetView.controller";

export const streetViewRouter = Router();

streetViewRouter.get("/metadata", controller.metadata);
streetViewRouter.get("/image", controller.image);
