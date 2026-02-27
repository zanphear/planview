from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://planview:planview_secret@planview-db:5432/planview"

    # Redis
    redis_url: str = "redis://planview-redis:6379/0"

    # Auth
    jwt_secret_key: str = "change-me-to-a-random-secret"
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

    # App
    app_name: str = "Planview"
    app_version: str = "1.0.0"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
