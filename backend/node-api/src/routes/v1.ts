import { Router } from "express";
import { environmentalRouter } from "../modules/environmental/environmental.routes";
import { dengueRouter } from "../modules/dengue/dengue.routes";
import { floodRouter } from "../modules/flood/flood.routes";
import { transportRouter } from "../modules/transport/transport.routes";
import { scdfRouter } from "../modules/scdf/scdf.routes";
import { mohRouter } from "../modules/moh/moh.routes";
import { oneMapRouter } from "../modules/onemap/onemap.routes";
import { hdbRouter, populationRouter } from "../modules/population/population.routes";
import { hospitalsRouter } from "../modules/hospitals/hospitals.routes";

export const v1Router = Router();

v1Router.use("/environmental", environmentalRouter);
v1Router.use("/dengue", dengueRouter);
v1Router.use("/flood", floodRouter);
v1Router.use("/transport", transportRouter);
v1Router.use("/scdf", scdfRouter);
v1Router.use("/moh", mohRouter);
v1Router.use("/onemap", oneMapRouter);
v1Router.use("/hdb", hdbRouter);
v1Router.use("/population", populationRouter);
v1Router.use("/hospitals", hospitalsRouter);
