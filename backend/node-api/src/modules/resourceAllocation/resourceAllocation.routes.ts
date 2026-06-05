import { Router } from "express";
import * as controller from "./resourceAllocation.controller";

export const resourceAllocationRouter = Router();

resourceAllocationRouter.post("/approve", controller.postResourceAllocationApproval);
