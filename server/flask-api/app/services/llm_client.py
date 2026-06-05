"""Server-side AI provider client for OpenAI and OpenRouter."""

from __future__ import annotations

from typing import Any

import requests

from app.core import get_settings
from app.utils.json_utils import parse_json_object


class LlmClientError(RuntimeError):
    """Raised when the configured LLM cannot return usable JSON."""


def complete_json(system_prompt: str, user_payload: dict[str, Any]) -> dict[str, Any]:
    """Call the configured provider and return a JSON object."""
    settings = get_settings()
    provider = settings.ai_provider.lower().strip()

    if provider == "openrouter":
        return _complete_openrouter(system_prompt, user_payload)
    if provider == "openai":
        return _complete_openai(system_prompt, user_payload)

    raise LlmClientError(f"Unsupported AI_PROVIDER: {settings.ai_provider}")


def _complete_openai(system_prompt: str, user_payload: dict[str, Any]) -> dict[str, Any]:
    settings = get_settings()
    if not settings.openai_api_key:
        raise LlmClientError("OPENAI_API_KEY is not configured.")

    response = requests.post(
        "https://api.openai.com/v1/responses",
        headers={
            "Authorization": f"Bearer {settings.openai_api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": settings.ai_model,
            "instructions": system_prompt,
            "input": [{"role": "user", "content": _json_payload(user_payload)}],
            "text": {"format": {"type": "json_object"}},
            "stream": False,
        },
        timeout=settings.ai_request_timeout_seconds,
    )
    if response.status_code >= 400:
        raise LlmClientError(f"OpenAI request failed with HTTP {response.status_code}.")

    return parse_json_object(_extract_openai_text(response.json()))


def _complete_openrouter(system_prompt: str, user_payload: dict[str, Any]) -> dict[str, Any]:
    settings = get_settings()
    if not settings.openrouter_api_key:
        raise LlmClientError("OPENROUTER_API_KEY is not configured.")

    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {settings.openrouter_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost",
            "X-Title": "MURUS SG",
        },
        json={
            "model": settings.ai_model,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": _json_payload(user_payload)},
            ],
        },
        timeout=settings.ai_request_timeout_seconds,
    )
    if response.status_code >= 400:
        raise LlmClientError(f"OpenRouter request failed with HTTP {response.status_code}.")

    data = response.json()
    choices = data.get("choices") if isinstance(data, dict) else None
    if not choices:
        raise LlmClientError("OpenRouter response did not include choices.")
    content = choices[0].get("message", {}).get("content")
    if not isinstance(content, str):
        raise LlmClientError("OpenRouter response did not include message content.")
    return parse_json_object(content)


def _extract_openai_text(data: dict[str, Any]) -> str:
    output_text = data.get("output_text")
    if isinstance(output_text, str):
        return output_text

    for item in data.get("output", []):
        for content in item.get("content", []):
            if content.get("type") in {"output_text", "text"} and isinstance(content.get("text"), str):
                return content["text"]

    raise LlmClientError("OpenAI response did not include output text.")


def _json_payload(value: dict[str, Any]) -> str:
    import json

    return json.dumps(value, ensure_ascii=True)
