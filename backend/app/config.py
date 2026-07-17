from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Empty by default so the API can start and show a useful error until the
    # developer adds their key. This keeps local frontend work friction-free.
    gemini_api_key: str = ""
    # SQLite makes the MVP runnable immediately. Postgres remains a drop-in
    # production option through DATABASE_URL.
    database_url: str = "sqlite:///./meeting_ai.db"
    whisper_model_size: str = "small"
    upload_dir: str = "./uploads"

    # Comma-separated list of allowed frontend origins. Defaults to local dev;
    # set CORS_ORIGINS in production to the real frontend domain(s).
    cors_origins: str = "http://localhost:3000"

    max_upload_mb: int = 200

    log_level: str = "INFO"

    rate_limit_enabled: bool = True
    rate_limit_upload_per_minute: int = 10
    rate_limit_ai_per_minute: int = 20

    default_page_size: int = 100
    max_page_size: int = 200

    # Empty by default: if unset, app.auth generates a random secret at
    # process startup (logged as a warning) so local dev works out of the
    # box, at the cost of invalidating tokens on every restart. Set this
    # explicitly in production so tokens survive redeploys.
    jwt_secret_key: str = ""
    jwt_access_token_expire_minutes: int = 15
    jwt_refresh_token_expire_days: int = 30
    # Short-lived signed tokens embedded in audio/PDF URLs, since <audio src>
    # and <a href> can't carry an Authorization header.
    media_token_expire_minutes: int = 120

    # Set to true in production once serving over HTTPS - the refresh
    # token cookie should never be sent over plain HTTP there.
    cookie_secure: bool = False

    # Google OAuth "Sign in with Google" client ID. Leave empty to disable
    # the feature entirely (the frontend hides the button when unset).
    google_client_id: str = ""

    class Config:
        env_file = ".env"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
