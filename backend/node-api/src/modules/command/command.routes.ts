import { Router } from "express";
import * as controller from "./command.controller";

export const commandRouter = Router();

commandRouter.get("/allocations", controller.getAllocations);
commandRouter.post("/allocations", controller.postAllocation);
commandRouter.patch("/allocations/:id/agencies", controller.patchAllocationAgencies);
commandRouter.get("/timeline", controller.getTimeline);
