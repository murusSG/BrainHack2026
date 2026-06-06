import { z } from "zod";
import { BadRequestError } from "../../utils/apiError";
import {
  approveClusterAgencies,
  decideClusterDispatch,
} from "../incidents/incidentCluster.service";

const approvalSchema = z.object({
  incident_id: z.string().min(1),
  dispatcher_id: z.string().min(1),
  approved_agencies: z.array(z.string().min(1)).min(1),
});

const decisionSchema = z
  .object({
    incident_id: z.string().min(1),
    dispatcher_id: z.string().min(1),
    decision: z.enum(["approved", "declined"]),
    approved_agencies: z.array(z.string().min(1)).default([]),
    dispatcher_note: z.string().trim().max(1000).optional(),
  })
  .superRefine((value, context) => {
    if (value.decision === "approved" && value.approved_agencies.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["approved_agencies"],
        message: "At least one agency is required for approval.",
      });
    }
  });

export function approveResourceAllocation(input: unknown) {
  const parsed = approvalSchema.safeParse(input);
  if (!parsed.success) {
    throw new BadRequestError("incident_id, dispatcher_id, and approved_agencies are required.", {
      issues: parsed.error.flatten().fieldErrors,
    });
  }

  const approvedAgencies = [...new Set(parsed.data.approved_agencies.map((agency) => agency.trim()))];

  // TODO: Persist approval to PostgreSQL with an immutable audit event.
  // TODO: Write dispatcher ID, selected agencies, and before/after state to audit logging.
  // TODO: Replace this prototype approval with a real notification workflow only after RBAC is enforced.
  // TODO: Integrate agency APIs, email queues, or message buses behind approval-only service boundaries.
  approveClusterAgencies({
    incidentId: parsed.data.incident_id,
    dispatcherId: parsed.data.dispatcher_id,
    approvedAgencies,
  });

  console.info("[resource-allocation] dispatcher approved recommendation", {
    incidentId: parsed.data.incident_id,
    approvedBy: parsed.data.dispatcher_id,
    approvedAgencyCount: approvedAgencies.length,
    status: "approved",
  });

  return {
    incident_id: parsed.data.incident_id,
    approved_by: parsed.data.dispatcher_id,
    approved_agencies: approvedAgencies,
    status: "approved",
    message: "Agency recommendations approved. Real notification workflow is not implemented yet.",
  };
}

export function decideResourceAllocation(input: unknown) {
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) {
    throw new BadRequestError(
      "incident_id, dispatcher_id, decision, and approved agencies for approval are required.",
      { issues: parsed.error.flatten().fieldErrors }
    );
  }

  const approvedAgencies = [
    ...new Set(parsed.data.approved_agencies.map((agency) => agency.trim()).filter(Boolean)),
  ];
  const cluster = decideClusterDispatch({
    incidentId: parsed.data.incident_id,
    dispatcherId: parsed.data.dispatcher_id,
    decision: parsed.data.decision,
    approvedAgencies,
    dispatcherNote: parsed.data.dispatcher_note,
  });

  console.info("[resource-allocation] dispatcher decision recorded", {
    incidentId: parsed.data.incident_id,
    dispatcherId: parsed.data.dispatcher_id,
    decision: parsed.data.decision,
    approvedAgencyCount: approvedAgencies.length,
  });

  return {
    incident_id: cluster.incident_id,
    decision: parsed.data.decision,
    status: cluster.status,
    approved_agencies: cluster.approved_agencies,
    dispatcher_note: parsed.data.dispatcher_note,
    timestamp: cluster.dispatch_decision?.timestamp,
    message:
      parsed.data.decision === "approved"
        ? "Dispatch approved and shared with responder agencies."
        : "Dispatch declined and removed from the priority queue.",
  };
}
