import { Router } from "express";
import { environmentalRouter } from "../modules/environmental/environmental.routes";
import { dengueRouter } from "../modules/dengue/dengue.routes";
import { floodRouter } from "../modules/flood/flood.routes";
import { transportRouter } from "../modules/transport/transport.routes";

export const v1Router = Router();

v1Router.use("/environmental", environmentalRouter);
v1Router.use("/dengue", dengueRouter);
v1Router.use("/flood", floodRouter);
v1Router.use("/transport", transportRouter);
