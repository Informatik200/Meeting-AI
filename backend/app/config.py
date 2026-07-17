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

    class Config:
        env_file = ".env"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
