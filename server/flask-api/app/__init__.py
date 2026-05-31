"""Flask application factory.

Build the app with ``create_app()``. The entrypoint lives in ``app/main.py``.
"""

from __future__ import annotations

from flask import Flask

from .api import health_bp
from .core import get_settings


def create_app() -> Flask:
    """Construct and configure the Flask application."""
    app = Flask(__name__)

    settings = get_settings()
    app.config["SETTINGS"] = settings

    # API blueprints are mounted under /api/v1 to mirror the Node API.
    app.register_blueprint(health_bp, url_prefix="/api/v1")

    return app
