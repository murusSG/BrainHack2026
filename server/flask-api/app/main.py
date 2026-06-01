"""Flask entrypoint.

Run via the Flask CLI (from ``server/flask-api`` with the venv active)::

    flask --app app.main run --debug --port 8000

Or directly::

    python -m app.main
"""

from __future__ import annotations

from app import create_app
from app.core import get_settings

app = create_app()


if __name__ == "__main__":
    settings = get_settings()
    app.run(host="0.0.0.0", port=settings.port, debug=settings.env == "development")
