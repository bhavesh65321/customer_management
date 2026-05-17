"""
Apply additive schema changes for existing databases. SQLAlchemy create_all() does not
ALTER existing tables, so new columns must be added explicitly.
"""
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import OperationalError


def _run_alter(engine: Engine, sql: str) -> None:
    try:
        with engine.begin() as conn:
            conn.execute(text(sql))
    except OperationalError:
        pass


def ensure_jewellery_intelligence_schema(engine: Engine) -> None:
    dialect = engine.dialect.name
    insp = inspect(engine)

    def column_names(table: str) -> set:
        if not insp.has_table(table):
            return set()
        return {c["name"] for c in insp.get_columns(table)}

    if insp.has_table("orders"):
        cols = column_names("orders")
        if "karigar_id" not in cols:
            if dialect == "mysql":
                _run_alter(engine, "ALTER TABLE orders ADD COLUMN karigar_id INT NULL")
            elif dialect == "sqlite":
                _run_alter(engine, "ALTER TABLE orders ADD COLUMN karigar_id INTEGER NULL")
            elif dialect == "postgresql":
                _run_alter(engine, "ALTER TABLE orders ADD COLUMN IF NOT EXISTS karigar_id INTEGER NULL")
        if "workflow_step" not in cols:
            if dialect == "mysql":
                _run_alter(engine, "ALTER TABLE orders ADD COLUMN workflow_step VARCHAR(80) NULL")
            elif dialect == "sqlite":
                _run_alter(engine, "ALTER TABLE orders ADD COLUMN workflow_step VARCHAR(80) NULL")
            elif dialect == "postgresql":
                _run_alter(engine, "ALTER TABLE orders ADD COLUMN IF NOT EXISTS workflow_step VARCHAR(80) NULL")

    if insp.has_table("inventory_pieces"):
        cols = column_names("inventory_pieces")
        mysql_cols = [
            ("stone_weight_carat", "FLOAT NULL"),
            ("stone_type", "VARCHAR(100) NULL"),
            ("wastage_pct", "FLOAT NULL"),
            ("location_bin", "VARCHAR(80) NULL"),
            ("design_sku", "VARCHAR(100) NULL"),
            ("status", "VARCHAR(30) NOT NULL DEFAULT 'in_stock'"),
            ("notes", "TEXT NULL"),
        ]
        sqlite_cols = [
            ("stone_weight_carat", "REAL NULL"),
            ("stone_type", "VARCHAR(100) NULL"),
            ("wastage_pct", "REAL NULL"),
            ("location_bin", "VARCHAR(80) NULL"),
            ("design_sku", "VARCHAR(100) NULL"),
            ("status", "VARCHAR(30) DEFAULT 'in_stock'"),
            ("notes", "TEXT NULL"),
        ]
        pg_cols = [
            ("stone_weight_carat", "DOUBLE PRECISION NULL"),
            ("stone_type", "VARCHAR(100) NULL"),
            ("wastage_pct", "DOUBLE PRECISION NULL"),
            ("location_bin", "VARCHAR(80) NULL"),
            ("design_sku", "VARCHAR(100) NULL"),
            ("status", "VARCHAR(30) NOT NULL DEFAULT 'in_stock'"),
            ("notes", "TEXT NULL"),
        ]
        spec = mysql_cols if dialect == "mysql" else sqlite_cols if dialect == "sqlite" else pg_cols
        for name, coldef in spec:
            if name not in cols:
                if dialect == "postgresql":
                    _run_alter(
                        engine,
                        f"ALTER TABLE inventory_pieces ADD COLUMN IF NOT EXISTS {name} {coldef}",
                    )
                else:
                    _run_alter(engine, f"ALTER TABLE inventory_pieces ADD COLUMN {name} {coldef}")


def ensure_user_schema(engine: Engine) -> None:
    """Add is_active column to users table if missing (existing installs)."""
    dialect = engine.dialect.name
    insp = inspect(engine)

    def column_names(table: str) -> set:
        if not insp.has_table(table):
            return set()
        return {c["name"] for c in insp.get_columns(table)}

    if insp.has_table("users"):
        cols = column_names("users")
        if "is_active" not in cols:
            if dialect == "mysql":
                _run_alter(engine, "ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1")
            elif dialect == "sqlite":
                _run_alter(engine, "ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1")
            elif dialect == "postgresql":
                _run_alter(engine, "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE")


def ensure_store_schema(engine: Engine) -> None:
    """Add missing columns to stores table (logo_url, owner_name, owner_email)."""
    dialect = engine.dialect.name
    insp = inspect(engine)

    def column_names(table: str) -> set:
        if not insp.has_table(table):
            return set()
        return {c["name"] for c in insp.get_columns(table)}

    if insp.has_table("stores"):
        cols = column_names("stores")
        new_cols = [
            ("logo_url",    "VARCHAR(500) NULL"),
            ("owner_name",  "VARCHAR(150) NULL"),
            ("owner_email", "VARCHAR(150) NULL"),
        ]
        for col_name, col_def in new_cols:
            if col_name not in cols:
                if dialect == "postgresql":
                    _run_alter(engine, f"ALTER TABLE stores ADD COLUMN IF NOT EXISTS {col_name} {col_def}")
                else:
                    _run_alter(engine, f"ALTER TABLE stores ADD COLUMN {col_name} {col_def}")


def ensure_audit_log_schema(engine: Engine) -> None:
    dialect = engine.dialect.name
    insp = inspect(engine)

    def column_names(table: str) -> set:
        if not insp.has_table(table):
            return set()
        return {c["name"] for c in insp.get_columns(table)}

    if not insp.has_table("audit_log"):
        return
    cols = column_names("audit_log")
    if "store_id" not in cols:
        if dialect == "mysql":
            _run_alter(engine, "ALTER TABLE audit_log ADD COLUMN store_id INT NULL")
        elif dialect == "sqlite":
            _run_alter(engine, "ALTER TABLE audit_log ADD COLUMN store_id INTEGER NULL")
        elif dialect == "postgresql":
            _run_alter(engine, "ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS store_id INTEGER NULL")
    if "actor_name" not in cols:
        if dialect == "mysql":
            _run_alter(engine, "ALTER TABLE audit_log ADD COLUMN actor_name VARCHAR(200) NULL")
        elif dialect == "sqlite":
            _run_alter(engine, "ALTER TABLE audit_log ADD COLUMN actor_name VARCHAR(200) NULL")
        elif dialect == "postgresql":
            _run_alter(engine, "ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS actor_name VARCHAR(200) NULL")
    if "message" not in cols:
        if dialect == "mysql":
            _run_alter(engine, "ALTER TABLE audit_log ADD COLUMN message TEXT NULL")
        elif dialect == "sqlite":
            _run_alter(engine, "ALTER TABLE audit_log ADD COLUMN message TEXT NULL")
        elif dialect == "postgresql":
            _run_alter(engine, "ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS message TEXT NULL")


def ensure_gst_schema(engine: Engine) -> None:
    """
    Add GST-related columns to `stores` and `transactions` tables.
    Safe to run multiple times — skips columns that already exist.
    """
    insp = inspect(engine)
    dialect = engine.dialect.name

    def existing_cols(table: str) -> set:
        if not insp.has_table(table):
            return set()
        return {c["name"] for c in insp.get_columns(table)}

    # ── stores ──────────────────────────────────────────────────────────────
    if insp.has_table("stores"):
        cols = existing_cols("stores")
        store_new = {
            "state_code":           "VARCHAR(3)  NULL",
            "invoice_prefix":       "VARCHAR(6)  NULL",
            "invoice_seq_current":  "INT         DEFAULT 0",
            "default_hsn_gold":     "VARCHAR(10) DEFAULT '7113'",
            "default_hsn_silver":   "VARCHAR(10) DEFAULT '7114'",
            "default_hsn_making":   "VARCHAR(10) DEFAULT '9988'",
            "default_hsn_diamond":  "VARCHAR(10) DEFAULT '7102'",
            "owner_name":           "VARCHAR(150) NULL",
            "owner_email":          "VARCHAR(150) NULL",
            "license_expiry":       "DATE NULL",
        }
        for col, defn in store_new.items():
            if col not in cols:
                if dialect == "postgresql":
                    _run_alter(engine, f"ALTER TABLE stores ADD COLUMN IF NOT EXISTS {col} {defn}")
                else:
                    _run_alter(engine, f"ALTER TABLE stores ADD COLUMN {col} {defn}")

    # ── transactions ─────────────────────────────────────────────────────────
    if insp.has_table("transactions"):
        cols = existing_cols("transactions")
        txn_new = {
            "gst_computed":     "BOOLEAN     DEFAULT FALSE",
            "hsn_code":         "VARCHAR(10) NULL",
            "making_hsn_code":  "VARCHAR(10) NULL",
            "tax_rate":         "FLOAT       DEFAULT 3.0",
            "making_tax_rate":  "FLOAT       DEFAULT 5.0",
            "taxable_value":    "FLOAT       DEFAULT 0.0",
            "making_charges":   "FLOAT       DEFAULT 0.0",
            "cgst_amount":      "FLOAT       DEFAULT 0.0",
            "sgst_amount":      "FLOAT       DEFAULT 0.0",
            "igst_amount":      "FLOAT       DEFAULT 0.0",
            "making_cgst":      "FLOAT       DEFAULT 0.0",
            "making_sgst":      "FLOAT       DEFAULT 0.0",
            "making_igst":      "FLOAT       DEFAULT 0.0",
            "is_interstate":    "BOOLEAN     DEFAULT FALSE",
            "customer_gstin":   "VARCHAR(15) NULL",
            "invoice_prefix":   "VARCHAR(6)  NULL",
            "invoice_sequence": "INT         NULL",
            "invoice_number":   "VARCHAR(30) NULL",
        }
        for col, defn in txn_new.items():
            if col not in cols:
                if dialect == "postgresql":
                    _run_alter(engine, f"ALTER TABLE transactions ADD COLUMN IF NOT EXISTS {col} {defn}")
                else:
                    _run_alter(engine, f"ALTER TABLE transactions ADD COLUMN {col} {defn}")

        # unique index on invoice_number (best-effort)
        try:
            with engine.begin() as conn:
                if dialect == "mysql":
                    conn.execute(text(
                        "ALTER TABLE transactions ADD UNIQUE INDEX "
                        "idx_txn_invoice_number (invoice_number)"
                    ))
                elif dialect == "postgresql":
                    conn.execute(text(
                        "CREATE UNIQUE INDEX IF NOT EXISTS idx_txn_invoice_number "
                        "ON transactions (invoice_number) WHERE invoice_number IS NOT NULL"
                    ))
        except Exception:
            pass  # index already exists


def ensure_2fa_schema(engine: Engine) -> None:
    """Add two_fa_enabled column to users + create otp_tokens table."""
    dialect = engine.dialect.name
    insp = inspect(engine)

    # ── users.two_fa_enabled ───────────────────────────────────────────────
    if insp.has_table("users"):
        cols = {c["name"] for c in insp.get_columns("users")}
        if "two_fa_enabled" not in cols:
            if dialect == "mysql":
                _run_alter(engine, "ALTER TABLE users ADD COLUMN two_fa_enabled TINYINT(1) NOT NULL DEFAULT 0")
            elif dialect in ("sqlite", "postgresql"):
                _run_alter(engine, "ALTER TABLE users ADD COLUMN two_fa_enabled BOOLEAN NOT NULL DEFAULT 0")

    # ── otp_tokens table ──────────────────────────────────────────────────
    if not insp.has_table("otp_tokens"):
        with engine.begin() as conn:
            if dialect == "mysql":
                conn.execute(text("""
                    CREATE TABLE otp_tokens (
                        id         INT AUTO_INCREMENT PRIMARY KEY,
                        user_id    INT NOT NULL,
                        otp_code   VARCHAR(10) NOT NULL,
                        temp_token VARCHAR(512) NOT NULL,
                        expires_at DATETIME NOT NULL,
                        used_at    DATETIME NULL,
                        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        INDEX idx_otp_user (user_id),
                        INDEX idx_otp_temp (temp_token(64)),
                        CONSTRAINT fk_otp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                """))
            else:
                conn.execute(text("""
                    CREATE TABLE otp_tokens (
                        id         INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        otp_code   VARCHAR(10) NOT NULL,
                        temp_token VARCHAR(512) NOT NULL,
                        expires_at DATETIME NOT NULL,
                        used_at    DATETIME NULL,
                        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                    )
                """))
