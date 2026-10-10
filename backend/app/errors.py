"""RFC 9457 problem+json error responses.

Every error leaves the API as `application/problem+json` carrying the request_id in
`instance`, so the client can quote it and we can grep the logs. The catch-all never
leaks a traceback or raw exception string (forbidden-16). The existing `detail` field
is preserved verbatim so existing frontend error handling keeps working.
"""

from http import HTTPStatus

from fastapi import Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.logging_config import get_logger, request_id_var

log = get_logger("planview.errors")
PROBLEM_CONTENT_TYPE = "application/problem+json"


def _title_for(status: int) -> str:
    try:
        return HTTPStatus(status).phrase
    except ValueError:
        return "Error"


def problem_response(status: int, detail, *, headers=None, **extra) -> JSONResponse:
    body = {
        "type": "about:blank",
        "title": _title_for(status),
        "status": status,
        "detail": detail,
        "instance": request_id_var.get(),
    }
    body.update(extra)
    return JSONResponse(
        status_code=status,
        content=jsonable_encoder(body),
        media_type=PROBLEM_CONTENT_TYPE,
        headers=headers,
    )


async def http_exception_handler(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
    return problem_response(exc.status_code, exc.detail, headers=getattr(exc, "headers", None))


async def validation_exception_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
    # Keep `detail` as the FastAPI-shaped error list for frontend compatibility.
    return problem_response(422, exc.errors())


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    log.error(
        "unhandled_exception",
        method=request.method,
        path=request.url.path,
        exc_info=exc,
    )
    return problem_response(500, "Internal server error")


def register_error_handlers(app) -> None:
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
