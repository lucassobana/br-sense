# api/app/settings.py
from __future__ import annotations
import os
import secrets
from functools import lru_cache
from typing import Literal, Optional

from pydantic import AnyUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class PostgresDsn(AnyUrl):
    allowed_schemes = {"postgres", "postgresql", "postgresql+psycopg2"}
    user_required = True


class Settings(BaseSettings):
    """
    Single source of truth for config.
    We honor ENV_FILE if set; otherwise default to .env
    """
    model_config = SettingsConfigDict(
        env_file=os.getenv("ENV_FILE", ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ---- App ----
    APP_NAME: str = "SoilProbe API"
    ENV: Literal["local", "dev", "prod", "test"] = "local"
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"

    # ---- Security ----
    SECRET_KEY: str = Field(default_factory=lambda: secrets.token_urlsafe(32))

    # Optional shared token if Globalstar → API needs a header guard
    UPLINK_SHARED_TOKEN: Optional[str] = None  # set in .env: UPLINK_SHARED_TOKEN="xyz"
    CLIENT_SECRET_BACKEND: Optional[str] = None  # set in .env: CLIENT_SECRET_BACKEND="xyz"

    # ---- CORS ----
    CORS_ALLOW_ORIGINS: list[str] = ["*"]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: list[str] = ["*"]
    CORS_ALLOW_HEADERS: list[str] = ["*"]

    # ---- Database ----
    DATABASE_URL: PostgresDsn | str = "postgresql+psycopg2://postgres:admin@localhost:5432/satellite_db"

    # Alembic expects this key if you want to template it into alembic.ini
    ALEMBIC_DB_URL: Optional[str] = None

    # ---- Parsing / Ingest knobs ----
    MAX_UPLINK_BYTES: int = 64 * 1024  # 64 KB envelope cap
    ALLOW_STALE_TIMESTAMPS: bool = True
    
    KEYCLOAK_URL: str = "https://brsense-auth.fly.dev"
    KEYCLOAK_REALM: str = "br-sense"
    KEYCLOAK_CLIENT_ID: str = "soil-frontend"

    # ---- Irrigation Alerts (v1) ----
    ALERTS_ENABLED: bool = True
    EXPECTED_INTERVAL_MIN: int = 60  # Expected reading interval in minutes
    STALE_FACTOR: int = 3  # STALE = no data > EXPECTED_INTERVAL_MIN * STALE_FACTOR
    OFFLINE_HOURS: int = 24  # OFFLINE = no data > OFFLINE_HOURS

    # Fallback (texture-agnostic) moisture bands (loam-ish) - absolute percentages
    MOISTURE_RED_MAX: float = 18.0  # RED if VWC <= this
    MOISTURE_AMBER_MAX: float = 24.0  # AMBER if VWC <= this (and > RED_MAX)
    MOISTURE_GREEN_MAX: float = 36.0  # GREEN if VWC <= this (and > AMBER_MAX)
    MOISTURE_BLUE_MIN: float = 40.0  # BLUE if VWC >= this

    # Rate-of-change spike detection
    ROC_SPIKE_PCT: float = 8.0  # Flag if VWC changes > this % in ROC_WINDOW_MIN
    ROC_WINDOW_MIN: int = 10  # Window for rate-of-change check

    # Temperature bounds (sanity check)
    TEMP_MIN_C: float = 0.0
    TEMP_MAX_C: float = 50.0


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()

settings = get_settings()