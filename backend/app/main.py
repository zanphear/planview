import asyncio
import time
import uuid as _uuid

from fastapi import FastAPI, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.router import api_router
from app.config import settings
from app.errors import register_error_handlers
from app.logging_config import get_logger, request_id_var, setup_logging
from app.middleware.rate_limit import RateLimitMiddleware
from app.utils.auth import decode_token
from app.websocket.manager import manager

# Structured JSON logging + request-scoped correlation id (see app/logging_config.py)
setup_logging()
logger = get_logger("planview")

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    docs_url="/docs" if settings.enable_docs else None,
    redoc_url="/redoc" if settings.enable_docs else None,
    openapi_url="/openapi.json" if settings.enable_docs else None,
)


# Request ID + access logging middleware. The id is bound into a contextvar so it
# survives `await` and reaches every log line and error body for this request.
class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(_uuid.uuid4()))
        token = request_id_var.set(request_id)
        start = time.time()
        try:
            response = await call_next(request)
            elapsed = round((time.time() - start) * 1000, 1)
            logger.info(
                "request_completed",
                method=request.method,
                path=request.url.path,
                status=response.status_code,
                duration_ms=elapsed,
            )
            response.headers["X-Request-ID"] = request_id
            return response
        finally:
            request_id_var.reset(token)


# Middleware order: outermost evaluated first
app.add_middleware(RateLimitMiddleware, requests_per_minute=120)
app.add_middleware(RequestIDMiddleware)

# CORS
origins = [o.strip() for o in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)

app.include_router(api_router)

# RFC 9457 problem+json handlers (HTTPException, validation, catch-all 500).
register_error_handlers(app)


@app.get("/health")
async def health():
    return {"status": "ok", "version": settings.app_version}


@app.websocket("/ws/{workspace_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    workspace_id: str,
    token: str = Query(default=""),
):
    # Validate JWT before accepting the connection
    if not token:
        await websocket.close(code=4001, reason="Missing token")
        return
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            await websocket.close(code=4001, reason="Invalid token type")
            return
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001, reason="Invalid token")
            return
    except Exception:
        await websocket.close(code=4001, reason="Invalid or expired token")
        return

    await manager.connect(websocket, workspace_id)
    try:
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=60.0)
                if data == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                try:
                    await websocket.send_text("ping")
                except Exception:
                    break
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(websocket, workspace_id)
