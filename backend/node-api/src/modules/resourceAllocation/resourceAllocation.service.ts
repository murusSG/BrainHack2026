import { z } from "zod";
import { BadRequestError } from "../../utils/apiError";
import { approveClusterAgencies } from "../incidents/incidentCluster.service";

const approvalSchema = z.object({
  incident_id: z.string().min(1),
  dispatcher_id: z.string().min(1),
  approved_agencies: z.array(z.string().min(1)).min(1),
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
