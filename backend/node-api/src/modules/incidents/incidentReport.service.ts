import { z } from "zod";
import { BadRequestError, ApiError } from "../../utils/apiError";
import {
  listReports,
  insertReport,
  findReport,
  patchReport,
} from "../../repositories/incidentReport.repo";
import type {
  IncidentReport,
  CreateIncidentReportInput,
  UpdateIncidentReportInput,
} from "./incident.types";

const createSchema = z.object({
  author_name: z.string().trim().max(80).optional(),
  situation_summary: z.string().trim().min(1, "situation_summary is required"),
  casualties: z
    .object({
      injured: z.number().int().min(0),
      deceased: z.number().int().min(0),
      missing: z.number().int().min(0),
    })
    .optional(),
  location: z.string().trim().max(500).optional(),
  resources_deployed: z.string().trim().max(2000).optional(),
  actions_taken: z.string().trim().max(2000).optional(),
  hazards: z.array(z.string().trim()).optional(),
  next_steps: z.string().trim().max(2000).optional(),
  status: z.enum(["draft", "submitted"]).default("draft"),
});

const updateSchema = z.object({
  author_name: z.string().trim().max(80).optional(),
  situation_summary: z.string().trim().min(1).optional(),
  casualties: z
    .object({
      injured: z.number().int().min(0),
      deceased: z.number().int().min(0),
      missing: z.number().int().min(0),
    })
    .optional(),
  location: z.string().trim().max(500).optional(),
  resources_deployed: z.string().trim().max(2000).optional(),
  actions_taken: z.string().trim().max(2000).optional(),
  hazards: z.array(z.string().trim()).optional(),
  next_steps: z.string().trim().max(2000).optional(),
  status: z.enum(["draft", "submitted", "acknowledged"]).optional(),
});

export async function getIncidentReports(incidentId: string): Promise<IncidentReport[]> {
  return listReports(incidentId);
}

export async function createIncidentReport(
  incidentId: string,
  authorId: string,
  agency: string,
  input: unknown
): Promise<IncidentReport> {
  if (!agency) {
    throw new BadRequestError(
      "Your user profile does not have an agency set. Contact an administrator."
    );
  }
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    throw new BadRequestError("Invalid report data.", {
      issues: parsed.error.flatten().fieldErrors,
    });
  }
  return insertReport(incidentId, authorId, agency, parsed.data as CreateIncidentReportInput);
}

export async function updateIncidentReport(
  reportId: string,
  requesterId: string,
  requesterAgency: string,
  input: unknown
): Promise<IncidentReport> {
  const report = await findReport(reportId);
  if (!report) {
    throw new ApiError("NOT_FOUND", "Report not found.", 404);
  }

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    throw new BadRequestError("Invalid update data.", {
      issues: parsed.error.flatten().fieldErrors,
    });
  }

  const patch = parsed.data as UpdateIncidentReportInput;
  const isAuthor = report.author_id === requesterId;

  if (patch.status !== undefined) {
    enforceStatusTransition(report, isAuthor, patch.status);
  }

  if (hasNonStatusFields(patch) && !isAuthor) {
    throw new ApiError("FORBIDDEN", "Only the report author can edit report content.", 403);
  }

  return patchReport(reportId, patch);
}

function enforceStatusTransition(
  report: IncidentReport,
  isAuthor: boolean,
  nextStatus: string
): void {
  if (nextStatus === "submitted") {
    if (!isAuthor) {
      throw new ApiError("FORBIDDEN", "Only the report author can submit a report.", 403);
    }
    if (report.status !== "draft") {
      throw new ApiError(
        "CONFLICT",
        `Cannot transition from '${report.status}' to 'submitted'.`,
        409
      );
    }
    return;
  }

  if (nextStatus === "acknowledged") {
    if (isAuthor) {
      throw new ApiError("FORBIDDEN", "Authors cannot acknowledge their own report.", 403);
    }
    if (report.status !== "submitted") {
      throw new ApiError(
        "CONFLICT",
        `Cannot transition from '${report.status}' to 'acknowledged'.`,
        409
      );
    }
    return;
  }

  throw new ApiError("CONFLICT", `Invalid status transition to '${nextStatus}'.`, 409);
}

function hasNonStatusFields(patch: UpdateIncidentReportInput): boolean {
  const { status: _status, ...rest } = patch;
  return Object.keys(rest).length > 0;
}
