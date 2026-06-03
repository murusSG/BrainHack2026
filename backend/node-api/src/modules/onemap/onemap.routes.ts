import { Router } from "express";
import * as controller from "./onemap.controller";

export const oneMapRouter = Router();

oneMapRouter.get("/search", controller.search);
oneMapRouter.get("/reverse-geocode", controller.reverseGeocode);
oneMapRouter.get("/route", controller.route);
