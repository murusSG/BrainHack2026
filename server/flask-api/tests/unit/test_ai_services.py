from app.services.extraction_service import extract_incident_report
from app.services.resource_allocation_service import allocate_resources
from app.services.rules_engine import mandatory_agencies_for_incident
from app import create_app


def test_app_registers_health_and_agent_routes():
    app = create_app()
    routes = {rule.rule for rule in app.url_map.iter_rules()}

    assert "/health" in routes
    assert "/api/v1/health" in routes
    assert "/agent/extract-report" in routes
    assert "/agent/resource-allocation" in routes


def test_heuristic_extraction_for_clear_building_fire_report():
    extracted = extract_incident_report(
        {
            "report_text": (
                "I saw thick black smoke coming from Block 123 Tampines Street 11. "
                "Someone said elderly residents may be trapped."
            )
        }
    )

    assert extracted["incident_type"] == "building fire"
    assert extracted["location_text"] == "Block 123 Tampines Street 11"
    assert extracted["possible_casualties"] is True
    assert extracted["confidence"] >= 0.65


def test_building_fire_rules_include_required_agencies():
    agencies = [item["agency"] for item in mandatory_agencies_for_incident("building fire")]

    assert agencies == ["SCDF", "SPF", "MOH"]


def test_resource_allocation_falls_back_to_mandatory_rules():
    allocation = allocate_resources(
        {
            "incident_type": "building fire",
            "severity": "high",
            "possible_casualties": True,
            "confidence": 0.82,
        }
    )

    assert [item["agency"] for item in allocation["mandatory_agencies"]] == ["SCDF", "SPF", "MOH"]
    assert allocation["suggested_agencies"] == []
    assert allocation["dispatcher_approval_required"] is True
