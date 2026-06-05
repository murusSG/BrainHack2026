"""AI extraction endpoints."""

from __future__ import annotations

from flask import Blueprint, jsonify, request

from app.services.extraction_service import extract_incident_report

extraction_bp = Blueprint("extraction", __name__)


@extraction_bp.post("/agent/extract-report")
def extract_report() -> tuple:
    payload = request.get_json(silent=True) or {}
    if not str(payload.get("report_text", "")).strip():
        return jsonify(error={"code": "BAD_REQUEST", "message": "report_text is required."}), 400

    return jsonify(extract_incident_report(payload)), 200
