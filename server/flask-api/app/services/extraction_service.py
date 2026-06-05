"""Incident report extraction service."""

from __future__ import annotations

import re
from typing import Any

from app.core import get_settings
from app.services.llm_client import LlmClientError, complete_json

SYSTEM_PROMPT = """
You extract structured public-safety incident fields for MURUS SG.
Return JSON only. Extract only facts supported by the report text.
Do not invent locations, casualties, hazards, agencies, or official actions.
If incident type, severity, or location is uncertain, mark it unknown or add the field to missing_fields.
Never dispatch or contact agencies.
""".strip()

DEFAULT_RESPONSE = {
    "incident_type": "unknown",
    "location_text": "",
    "severity": "unknown",
    "description": "",
    "possible_casualties": False,
    "hazards": [],
    "confidence": 0.2,
    "missing_fields": ["incident_type", "location"],
}


def extract_incident_report(payload: dict[str, Any]) -> dict[str, Any]:
    report_text = str(payload.get("report_text", "")).strip()
    if not report_text:
        return {**DEFAULT_RESPONSE, "description": "", "confidence": 0.0}

    try:
        llm_response = complete_json(
            SYSTEM_PROMPT,
            {
                "task": "Extract one structured incident JSON object from the public report.",
                "output_shape": DEFAULT_RESPONSE,
                "report": {
                    "report_text": report_text,
                    "reported_at": payload.get("reported_at"),
                    "source": payload.get("source"),
                    "reporter_location_present": bool(payload.get("reporter_location")),
                },
            },
        )
        extracted = normalise_extraction(llm_response, report_text)
        rescued = heuristic_extraction(report_text)
        if _has_actionable_fields(rescued) and not _has_actionable_fields(extracted):
            return rescued
        return extracted
    except (LlmClientError, ValueError, TypeError):
        return heuristic_extraction(report_text)


def normalise_extraction(value: dict[str, Any], report_text: str) -> dict[str, Any]:
    incident_type = _text(value.get("incident_type")) or "unknown"
    location_text = _text(value.get("location_text"))
    severity = _text(value.get("severity")) or "unknown"
    description = _text(value.get("description")) or report_text[:260]
    hazards = [_text(item) for item in value.get("hazards", []) if _text(item)]
    missing_fields = [_text(item) for item in value.get("missing_fields", []) if _text(item)]
    confidence = _clamp_float(value.get("confidence"), 0.0, 1.0, 0.2)

    if incident_type == "unknown" and "incident_type" not in missing_fields:
        missing_fields.append("incident_type")
    if not location_text and "location" not in missing_fields:
        missing_fields.append("location")
    missing_fields = [
        field
        for field in missing_fields
        if not (
            (field == "incident_type" and incident_type != "unknown")
            or (field == "location" and location_text)
        )
    ]

    return {
        "incident_type": incident_type,
        "location_text": location_text,
        "severity": severity,
        "description": description,
        "possible_casualties": bool(value.get("possible_casualties", False)),
        "hazards": hazards,
        "confidence": confidence,
        "missing_fields": missing_fields,
    }


def heuristic_extraction(report_text: str) -> dict[str, Any]:
    lower = report_text.lower()
    incident_type = _heuristic_incident_type(lower)
    location_text = _heuristic_location(report_text)
    severity = _heuristic_severity(lower, incident_type)
    possible_casualties = any(
        word in lower for word in ["trapped", "injured", "casualty", "unconscious", "elderly"]
    )
    hazards = _heuristic_hazards(lower, incident_type, possible_casualties)
    missing_fields: list[str] = []
    if incident_type == "unknown":
        missing_fields.append("incident_type")
    if not location_text:
        missing_fields.append("location")

    confidence = 0.78 if incident_type != "unknown" and location_text else 0.35
    if possible_casualties:
        confidence = min(0.82, confidence + 0.08)

    return {
        "incident_type": incident_type,
        "location_text": location_text,
        "severity": severity,
        "description": _summarise(report_text),
        "possible_casualties": possible_casualties,
        "hazards": hazards,
        "confidence": confidence,
        "missing_fields": missing_fields,
    }


def is_low_confidence(extracted: dict[str, Any]) -> bool:
    settings = get_settings()
    confidence = _clamp_float(extracted.get("confidence"), 0.0, 1.0, 0.0)
    return confidence < settings.extraction_confidence_threshold


def _has_actionable_fields(extracted: dict[str, Any]) -> bool:
    return bool(_text(extracted.get("location_text"))) and _text(extracted.get("incident_type")) != "unknown"


def _heuristic_incident_type(lower: str) -> str:
    if "building fire" in lower:
        return "building fire"
    if "fire" in lower or "black smoke" in lower or "smoke" in lower:
        return "building fire" if "block" in lower or "building" in lower else "fire"
    if "chemical" in lower or "spill" in lower:
        return "chemical spill"
    if "accident" in lower or "collision" in lower or "crash" in lower:
        return "road accident"
    if "flood" in lower or "flooding" in lower:
        return "flood"
    if "outbreak" in lower or "disease" in lower or "fever" in lower:
        return "disease outbreak"
    if "power outage" in lower or "blackout" in lower:
        return "power outage"
    if "collapse" in lower:
        return "structural collapse"
    return "unknown"


def _heuristic_location(report_text: str) -> str:
    patterns = [
        r"\b(?:at|near|from|in)\s+([0-9][A-Za-z0-9\s#/-]*?(?:Road|Rd|Street|St|Avenue|Ave|Drive|Dr|Lane|Ln|Close|Crescent|Way|Place|Pl)(?:,\s*Singapore)?)\b",
        r"(Block\s+\d+[A-Za-z]?\s+[A-Za-z0-9\s]+?(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Lane|Ln)\s*\d*)",
        r"((?:Tampines|Jurong|Woodlands|Orchard|Bedok|Yishun|Kallang|Toa Payoh)[A-Za-z0-9\s]*(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Lane|Ln)?\s*\d*)",
        r"\b(?:at|near|from|in)\s+([A-Za-z0-9][A-Za-z0-9\s#'/-]{2,80}?)(?:[.,;]|$)",
    ]
    for pattern in patterns:
        match = re.search(pattern, report_text, flags=re.IGNORECASE)
        if match:
            return re.sub(r"\s+", " ", match.group(1)).strip(" .,:;")
    return ""


def _heuristic_severity(lower: str, incident_type: str) -> str:
    if any(word in lower for word in ["trapped", "explosion", "unconscious", "collapsed"]):
        return "high"
    if incident_type in {"building fire", "chemical spill", "structural collapse"}:
        return "high"
    if incident_type in {"road accident", "flood", "power outage"}:
        return "medium"
    return "unknown"


def _heuristic_hazards(lower: str, incident_type: str, possible_casualties: bool) -> list[str]:
    hazards: list[str] = []
    if "smoke" in lower or "fire" in incident_type:
        hazards.append("smoke inhalation")
    if possible_casualties:
        hazards.append("possible trapped or injured persons")
    if "chemical" in lower:
        hazards.append("chemical exposure")
    if "flood" in lower:
        hazards.append("flood water")
    return hazards


def _summarise(report_text: str) -> str:
    text = re.sub(r"\s+", " ", report_text).strip()
    return text[:260]


def _text(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def _clamp_float(value: Any, minimum: float, maximum: float, fallback: float) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return fallback
    return max(minimum, min(maximum, parsed))
