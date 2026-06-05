import axios from "axios";
import { z } from "zod";
import { env } from "../../config/env";
import { UpstreamApiError } from "../../utils/apiError";
import type { ExtractedIncident, ResourceAllocationRecommendations } from "./incident.types";

const agencyRecommendationSchema = z
  .object({
    agency: z.string().min(1),
    reason: z.string().default("Dispatcher review required."),
    confidence: z.union([z.string(), z.number()]).optional(),
  })
  .passthrough();

const recommendationsSchema = z
  .object({
    mandatory_agencies: z.array(agencyRecommendationSchema).default([]),
    suggested_agencies: z.array(agencyRecommendationSchema).default([]),
    risk_notes: z.array(z.string()).default([]),
    dispatcher_approval_required: z.boolean().default(true),
  })
  .passthrough();

export async function recommendResourceAllocation(
  extractedIncident: ExtractedIncident
): Promise<ResourceAllocationRecommendations> {
  try {
    const response = await axios.post(
      `${env.FLASK_AI_URL.replace(/\/$/, "")}/agent/resource-allocation`,
      extractedIncident,
      {
        timeout: env.AI_SERVICE_TIMEOUT_MS,
        headers: { "Content-Type": "application/json" },
      }
    );

    const parsed = recommendationsSchema.safeParse(response.data);
    if (!parsed.success) {
      throw new UpstreamApiError("AI resource allocation response was invalid.", {
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    return ensureApprovalRequired(parsed.data);
  } catch (error) {
    if (error instanceof UpstreamApiError) throw error;
    const message = axios.isAxiosError(error) ? error.message : String(error);
    throw new UpstreamApiError("AI resource allocation service request failed.", { message });
  }
}

export function manualReviewRecommendations(reason: string): ResourceAllocationRecommendations {
  return {
    mandatory_agencies: [],
    suggested_agencies: [],
    risk_notes: [reason],
    dispatcher_approval_required: true,
  };
}

function ensureApprovalRequired(
  recommendations: ResourceAllocationRecommendations
): ResourceAllocationRecommendations {
  return {
    mandatory_agencies: recommendations.mandatory_agencies,
    suggested_agencies: recommendations.suggested_agencies,
    risk_notes: recommendations.risk_notes,
    dispatcher_approval_required: true,
  };
}
