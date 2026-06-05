"""Hybrid rules plus LLM resource-allocation recommendations."""

from __future__ import annotations

from typing import Any

from app.services.llm_client import LlmClientError, complete_json
from app.services.rules_engine import VALID_AGENCIES, mandatory_agencies_for_incident

SYSTEM_PROMPT = """
You support MURUS SG dispatchers with resource-allocation recommendations.
Rules are authoritative for mandatory agencies. You may suggest additional valid agencies and risk notes.
Do not contact agencies. Dispatcher approval is always required.
Return JSON only with suggested_agencies, risk_notes, and dispatcher_approval_required.
Do not invent facts beyond the supplied incident fields.
""".strip()


def allocate_resources(extracted_incident: dict[str, Any]) -> dict[str, Any]:
    mandatory = mandatory_agencies_for_incident(str(extracted_incident.get("incident_type", "")))

    try:
        llm_response = complete_json(
            SYSTEM_PROMPT,
            {
                "task": "Suggest additional agencies and risk notes for dispatcher review.",
                "valid_agencies": sorted(VALID_AGENCIES),
                "mandatory_agencies_from_rules": mandatory,
                "incident": extracted_incident,
                "output_shape": {
                    "suggested_agencies": [{"agency": "MOH", "reason": "string", "confidence": "high"}],
                    "risk_notes": ["string"],
                    "dispatcher_approval_required": True,
                },
            },
        )
        suggested = _normalise_suggested(llm_response.get("suggested_agencies", []), mandatory)
        risk_notes = _normalise_strings(llm_response.get("risk_notes", []))[:8]
    except (LlmClientError, ValueError, TypeError):
        suggested = []
        risk_notes = fallback_risk_notes(extracted_incident)

    return {
        "mandatory_agencies": mandatory,
        "suggested_agencies": suggested,
        "risk_notes": risk_notes,
        "dispatcher_approval_required": True,
    }


def fallback_risk_notes(extracted_incident: dict[str, Any]) -> list[str]:
    notes: list[str] = []
    if extracted_incident.get("possible_casualties"):
        notes.append("Possible casualties or trapped persons require urgent dispatcher review.")
    if extracted_incident.get("confidence", 1) < 0.7:
        notes.append("Extraction confidence is limited; verify before approving notifications.")
    return notes


def _normalise_suggested(value: Any, mandatory: list[dict[str, str]]) -> list[dict[str, Any]]:
    mandatory_names = {item["agency"] for item in mandatory}
    suggestions: list[dict[str, Any]] = []
    if not isinstance(value, list):
        return suggestions

    for item in value:
        if not isinstance(item, dict):
            continue
        agency = item.get("agency")
        if agency not in VALID_AGENCIES or agency in mandatory_names:
            continue
        reason = item.get("reason") if isinstance(item.get("reason"), str) else "Dispatcher review required."
        confidence = item.get("confidence") if isinstance(item.get("confidence"), (str, int, float)) else "medium"
        suggestions.append({"agency": agency, "reason": reason, "confidence": confidence})

    return suggestions[:5]


def _normalise_strings(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [item.strip() for item in value if isinstance(item, str) and item.strip()]
