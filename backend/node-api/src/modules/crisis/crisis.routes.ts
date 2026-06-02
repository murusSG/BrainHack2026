import { Router } from "express";
import * as controller from "./crisis.controller";

export const crisisRouter = Router();

crisisRouter.get("/events", controller.getEvents);
crisisRouter.get("/events/:id", controller.getEvent);
