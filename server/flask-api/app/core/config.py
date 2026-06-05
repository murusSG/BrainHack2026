"""Runtime configuration for the Flask API.

Loads environment variables (``.env.local`` first, then ``.env``) and exposes
a validated, immutable settings object. ``pydantic-settings`` is not a
dependency, so we read from ``os.environ`` and validate with a plain Pydantic
model.
"""

from __future__ import annotations

import os
from functools import lru_cache

from dotenv import load_dotenv
from pydantic import BaseModel, Field

# .env.local takes precedence; load_dotenv does not override already-set vars.
load_dotenv(".env.local")
load_dotenv()


class Settings(BaseModel):
    """Validated runtime settings."""

    env: str = Field(default="development")
    port: int = Field(default=8000)

    # Supabase — optional so the service can boot before the DB is wired.
    supabase_url: str | None = Field(default=None)
    supabase_service_role_key: str | None = Field(default=None)

    # Base URL of the Node API gateway (for service-to-service calls).
    node_api_url: str = Field(default="http://localhost:3000")

    # AI provider settings. Keys stay server-side and are never returned to clients.
    openai_api_key: str | None = Field(default=None)
    openrouter_api_key: str | None = Field(default=None)
    ai_provider: str = Field(default="openai")
    ai_model: str = Field(default="gpt-4.1-mini")
    extraction_confidence_threshold: float = Field(default=0.65)
    ai_request_timeout_seconds: int = Field(default=30)


@lru_cache
def get_settings() -> Settings:
    """Return cached settings built from the current environment."""
    return Settings(
        env=os.getenv("FLASK_ENV", "development"),
        port=int(os.getenv("PORT", "8000")),
        supabase_url=os.getenv("SUPABASE_URL"),
        supabase_service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
        node_api_url=os.getenv("NODE_API_URL", "http://localhost:3000"),
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        openrouter_api_key=os.getenv("OPENROUTER_API_KEY"),
        ai_provider=os.getenv("AI_PROVIDER", "openai"),
        ai_model=os.getenv("AI_MODEL", "gpt-4.1-mini"),
        extraction_confidence_threshold=float(os.getenv("EXTRACTION_CONFIDENCE_THRESHOLD", "0.65")),
        ai_request_timeout_seconds=int(os.getenv("AI_REQUEST_TIMEOUT_SECONDS", "30")),
    )
