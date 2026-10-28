"""Cloudflare Python Worker entrypoint for the Proofline API.

The FastAPI application remains dependency-injected and testable locally. Cloudflare's
ASGI adapter supplies the Worker fetch handler; durable bindings are intentionally kept
behind the existing store interfaces until a D1/R2/Queue project is configured.
"""

import os

try:
    from app.main import app
    from app.config import get_settings
except ModuleNotFoundError:
    from backend.app.main import app
    from backend.app.config import get_settings


try:
    from workers import WorkerEntrypoint, asgi
except ModuleNotFoundError as error:
    if error.name != "js":
        raise
    Default = None
else:
    class Default(WorkerEntrypoint):
        async def fetch(self, request):
            for key in (
                "PROOFLINE_ENV",
                "PROOFLINE_DEV_AUTH",
                "PROOFLINE_ALLOWED_ORIGINS",
                "PROOFLINE_JWT_SECRET",
            ):
                val = getattr(self.env, key, None)
                if val is not None:
                    os.environ[key] = str(val)
            app.state.settings = get_settings()
            app.state.d1 = getattr(self.env, "PROOFLINE_DB", getattr(self.env, "DB", None))
            if (request.headers.get("upgrade") or "").lower() == "websocket":
                return await asgi.websocket(app, request, self.env)
            return await asgi.fetch(app, request, self.env, self.ctx)

