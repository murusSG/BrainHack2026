"""AI resource allocation endpoints."""

from __future__ import annotations

from flask import Blueprint, jsonify, request

from app.services.resource_allocation_service import allocate_resources

resource_allocation_bp = Blueprint("resource_allocation", __name__)


@resource_allocation_bp.post("/agent/resource-allocation")
def resource_allocation() -> tuple:
    payload = request.get_json(silent=True) or {}
    return jsonify(allocate_resources(payload)), 200
