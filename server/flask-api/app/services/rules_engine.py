"""Deterministic agency rules for resource allocation."""

from __future__ import annotations

VALID_AGENCIES = {"SCDF", "SPF", "MOH", "NEA", "LTA", "PUB", "BCA", "SP Group", "HDB"}

AGENCY_RULES: dict[str, list[str]] = {
    "fire": ["SCDF", "SPF"],
    "building fire": ["SCDF", "SPF", "MOH"],
    "chemical spill": ["SCDF", "NEA", "SPF"],
    "road accident": ["SCDF", "SPF", "LTA", "MOH"],
    "disease outbreak": ["MOH", "NEA"],
    "flood": ["PUB", "SCDF", "SPF"],
    "power outage": ["SP Group", "SCDF"],
    "structural collapse": ["SCDF", "BCA", "SPF", "MOH"],
}

AGENCY_REASONS: dict[str, str] = {
    "SCDF": "Primary rescue, fire, medical, or hazard response.",
    "SPF": "Scene security, cordon, access control, and public safety support.",
    "MOH": "Medical triage, hospital coordination, or public-health support.",
    "NEA": "Environmental hazard or disease-vector assessment.",
    "LTA": "Traffic diversion, road access, and transport disruption management.",
    "PUB": "Drainage, flooding, and water infrastructure response.",
    "BCA": "Structural safety assessment and building integrity support.",
    "SP Group": "Power supply assessment and electrical infrastructure response.",
    "HDB": "Residential estate coordination and block-level facilities support.",
}


def mandatory_agencies_for_incident(incident_type: str) -> list[dict[str, str]]:
    normalized = incident_type.lower().strip()
    agencies = AGENCY_RULES.get(normalized)
    if agencies is None:
        for rule, rule_agencies in AGENCY_RULES.items():
            if rule in normalized:
                agencies = rule_agencies
                break
    agencies = agencies or []
    return [{"agency": agency, "reason": AGENCY_REASONS[agency]} for agency in agencies if agency in VALID_AGENCIES]
