import logging
import sys

from pydantic_settings import BaseSettings

_logger = logging.getLogger("planview.config")

_INSECURE_JWT_SECRET = "change-me-to-a-random-secret"


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://planview:planview_secret@planview-db:5432/planview"

    # Redis
    redis_url: str = "redis://planview-redis:6379/0"

    # Auth
    jwt_secret_key: str = _INSECURE_JWT_SECRET
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7

    # Server
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    cors_origins: str = "http://localhost:3000,http://localhost:5173"

    # File storage
    upload_dir: str = "/app/uploads"
    max_upload_size_mb: int = 50

    # Holidays
    holidays_country: str = "GB"

    # Email / SMTP (optional)
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "noreply@planview.local"

    # AI
    ai_model_url: str = ""
    ai_model_name: str = "Qwen3-Coder-Next-MXFP4_MOE_F16.gguf"

    # OIDC
    auth_mode: str = "password"  # password, hybrid, oidc_only
    oidc_issuer_url: str = ""
    oidc_client_id: str = ""
    oidc_client_secret: str = ""
    oidc_scopes: str = "openid email profile"
    oidc_auto_provision: bool = True
    oidc_default_role: str = "regular"

    # App
    app_name: str = "Planview"
    app_version: str = "1.0.0"

    # Security
    enable_docs: bool = False

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()

if settings.jwt_secret_key == _INSECURE_JWT_SECRET:
    _logger.critical(
        "JWT_SECRET_KEY is set to the default insecure value. "
        "Generate a real secret: python3 -c \"import secrets; print(secrets.token_urlsafe(64))\" "
        "and set JWT_SECRET_KEY in your environment."
    )
    sys.exit(1)
