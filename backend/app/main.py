import asyncio
import logging
import time
import uuid as _uuid

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.router import api_router
from app.config import settings
from app.middleware.rate_limit import RateLimitMiddleware
from app.websocket.manager import manager

# Structured logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("planview")

app = FastAPI(title=settings.app_name, version=settings.app_version)


# Request ID + access logging middleware
class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(_uuid.uuid4()))
        start = time.time()
        response = await call_next(request)
        elapsed = round((time.time() - start) * 1000, 1)
        response.headers["X-Request-ID"] = request_id
        logger.info(
            "%s %s %s %sms [%s]",
            request.method, request.url.path, response.status_code, elapsed, request_id,
        )
        return response


# Middleware order: outermost evaluated first
app.add_middleware(RateLimitMiddleware, requests_per_minute=120)
app.add_middleware(RequestIDMiddleware)

# CORS
origins = [o.strip() for o in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)

app.include_router(api_router)


# Global exception handler — catch unhandled errors and return clean JSON
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


@app.get("/health")
async def health():
    return {"status": "ok", "version": settings.app_version}


@app.websocket("/ws/{workspace_id}")
async def websocket_endpoint(websocket: WebSocket, workspace_id: str):
    await manager.connect(websocket, workspace_id)
    try:
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=60.0)
                # Client sent a ping, respond with pong
                if data == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                # No message in 60s, send a ping to check the connection is alive
                try:
                    await websocket.send_text("ping")
                except Exception:
                    break
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(websocket, workspace_id)
