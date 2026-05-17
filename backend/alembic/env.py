"""
Alembic environment configuration.

- Reads DATABASE_URL from environment variable (via .env file).
- Imports all SQLAlchemy models so autogenerate can detect every table.
- Supports both offline (SQL script) and online (live DB) migration modes.
"""

import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# ── Make sure `backend/` is on sys.path so imports resolve correctly ──────
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ── Load .env so DATABASE_URL is available as an env var ──────────────────
try:
    from dotenv import load_dotenv
    _env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    load_dotenv(_env_path)
except ImportError:
    pass  # python-dotenv not installed — DATABASE_URL must be set in shell env

# ── Import Base + ALL models so autogenerate sees every table ─────────────
# Every model must be imported here. Missing models → alembic tries to DROP them.
from config.database import Base  # noqa: E402
import models  # noqa: F401 — registers all 27 tables on Base.metadata

# ── Alembic Config object ──────────────────────────────────────────────────
config = context.config

# ── Override sqlalchemy.url from environment (never hardcode in .ini) ─────
_db_url = os.environ.get("DATABASE_URL")
if not _db_url:
    # Fallback: read directly from config/database.py for local dev.
    # Remove this fallback once SEC-02 (.env setup) is complete.
    from config.database import DATABASE_URL as _db_url  # type: ignore

# Alembic's config parser uses % as an interpolation character.
# Escape any literal % characters so they are not misinterpreted.
_db_url_escaped = _db_url.replace("%", "%%")
config.set_main_option("sqlalchemy.url", _db_url_escaped)

# ── Set up Python logging from alembic.ini ────────────────────────────────
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ── Target metadata: the schema autogenerate compares against ─────────────
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """
    Offline mode: generate a .sql script without a live DB connection.
    Usage: alembic upgrade head --sql > migration.sql
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=False,  # MySQL server defaults are noisy; disable to avoid false positives
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Online mode: apply migrations directly to the live database.
    Called by: alembic upgrade head
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=False,  # MySQL server defaults are noisy; disable to avoid false positives
        )

        with context.begin_transaction():
            context.run_migrations()


# ── Entry point ────────────────────────────────────────────────────────────
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
