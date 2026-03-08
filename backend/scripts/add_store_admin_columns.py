"""
Add columns to stores table for product-customer (admin) management.
Run from backend dir: python -m scripts.add_store_admin_columns
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from config.database import engine

COLUMNS = [
    ("customer_code", "VARCHAR(50) NULL"),
    ("join_date", "DATE NULL"),
    ("address", "VARCHAR(500) NULL"),
    ("location", "VARCHAR(255) NULL"),
    ("is_active", "TINYINT(1) NOT NULL DEFAULT 1"),
    ("license_type", "VARCHAR(20) NULL"),
]

def run():
    with engine.connect() as conn:
        for name, spec in COLUMNS:
            try:
                conn.execute(text(f"ALTER TABLE stores ADD COLUMN {name} {spec}"))
                conn.commit()
                print(f"Added column: {name}")
            except Exception as e:
                if "1060" in str(e) or "Duplicate column" in str(e):
                    print(f"Column {name} already exists, skipping")
                else:
                    raise

if __name__ == "__main__":
    run()
