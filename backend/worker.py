"""Cloudflare Python Worker entrypoint for the Proofline API.

The FastAPI application remains dependency-injected and testable locally. Cloudflare's
ASGI adapter supplies the Worker fetch handler; durable bindings are intentionally kept
behind the existing store interfaces until a D1/R2/Queue project is configured.
"""

from backend.app.main import app

try:
    from workers import asgi
except ModuleNotFoundError as error:
    # ``workers-py`` is normally imported inside the Cloudflare runtime, where the
    # `js` host module exists. Keep local Python inspection/imports useful without
    # pretending that CPython can execute a Worker fetch handler.
    if error.name != "js":
        raise
    Default = None
else:
    Default = asgi.fetch(app)
