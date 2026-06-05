"""Health-check blueprint."""

from __future__ import annotations

from datetime import datetime, timezone

from flask import Blueprint, jsonify

health_bp = Blueprint("health", __name__)


@health_bp.get("/health")
def health() -> tuple:
    """Liveness probe — confirms the service is up."""
    return (
        jsonify(
            status="ok",
            service="flask-ai",
            timestamp=datetime.now(timezone.utc).isoformat(),
        ),
        200,
    )
