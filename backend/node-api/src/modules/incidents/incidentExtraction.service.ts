import axios from "axios";
import { z } from "zod";
import { env } from "../../config/env";
import { UpstreamApiError } from "../../utils/apiError";
import type { ExtractedIncident, PublicIncidentReport } from "./incident.types";

const extractedIncidentSchema = z
  .object({
    incident_type: z.string().min(1).default("unknown"),
    location_text: z.string().default(""),
    severity: z.string().min(1).default("unknown"),
    description: z.string().default(""),
    possible_casualties: z.boolean().default(false),
    hazards: z.array(z.string()).default([]),
    confidence: z.coerce.number().min(0).max(1).default(0),
    missing_fields: z.array(z.string()).default([]),
  })
  .passthrough();

export async function extractReport(report: PublicIncidentReport): Promise<ExtractedIncident> {
  try {
    const response = await axios.post(
      `${env.FLASK_AI_URL.replace(/\/$/, "")}/agent/extract-report`,
      {
        report_text: report.report_text,
        reported_at: report.reported_at,
        source: report.source,
        reporter_location: report.reporter_location,
      },
      {
        timeout: env.AI_SERVICE_TIMEOUT_MS,
        headers: { "Content-Type": "application/json" },
      }
    );

    const parsed = extractedIncidentSchema.safeParse(response.data);
    if (!parsed.success) {
      throw new UpstreamApiError("AI extraction response was invalid.", {
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    return parsed.data;
  } catch (error) {
    if (error instanceof UpstreamApiError) throw error;
    const message = axios.isAxiosError(error) ? error.message : String(error);
    throw new UpstreamApiError("AI extraction service request failed.", { message });
  }
}
