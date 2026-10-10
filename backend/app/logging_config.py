"""Structured JSON logging with a request-scoped correlation id.

The fleet standard (09-backend-api-and-observability): structlog JSON events, one
request_id bound once in middleware via contextvars (survives `await`), events not
sentences. `request_id_var` is the single source of the id; it is bound by
`RequestIDMiddleware` and read by both the access log and the problem+json error
handlers so a user-reported error can be grepped straight to its request.
"""

import logging
from contextvars import ContextVar

import structlog

# Bound once per request in middleware; defaults to "-" outside a request (startup, jobs).
request_id_var: ContextVar[str] = ContextVar("request_id", default="-")


def _add_request_id(_logger, _method, event_dict):
    event_dict.setdefault("request_id", request_id_var.get())
    return event_dict


def setup_logging(level: int = logging.INFO) -> None:
    """Configure structlog to emit JSON to stdout. Idempotent."""
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            _add_request_id,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(level),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )
    # Route stdlib logging (uvicorn, sqlalchemy) through the same JSON sink.
    logging.basicConfig(format="%(message)s", level=level, force=True)


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    return structlog.get_logger(name)
