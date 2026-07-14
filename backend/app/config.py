from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Empty by default so the API can start and show a useful error until the
    # developer adds their key. This keeps local frontend work friction-free.
    anthropic_api_key: str = ""
    # SQLite makes the MVP runnable immediately. Postgres remains a drop-in
    # production option through DATABASE_URL.
    database_url: str = "sqlite:///./meeting_ai.db"
    whisper_model_size: str = "small"
    upload_dir: str = "./uploads"

    class Config:
        env_file = ".env"


settings = Settings()
