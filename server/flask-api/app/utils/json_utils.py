"""Helpers for extracting strict JSON from LLM responses."""

from __future__ import annotations

import json
import re
from typing import Any


def parse_json_object(text: str) -> dict[str, Any]:
    """Parse an object from raw model text, tolerating fenced JSON."""
    stripped = text.strip()
    try:
        parsed = json.loads(stripped)
    except json.JSONDecodeError:
        fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", stripped, flags=re.IGNORECASE)
        if fenced:
            parsed = json.loads(fenced.group(1).strip())
        else:
            first = stripped.find("{")
            last = stripped.rfind("}")
            if first < 0 or last <= first:
                raise
            parsed = json.loads(stripped[first : last + 1])

    if not isinstance(parsed, dict):
        raise ValueError("Model output was not a JSON object.")
    return parsed
