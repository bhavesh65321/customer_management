"""
One-off migration: add worker/staff columns to users table.
Run from backend dir: python -m scripts.add_worker_columns
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from config.database import engine

COLUMNS = [
    ("designation", "VARCHAR(100) NULL"),
    ("phone", "VARCHAR(20) NULL"),
    ("address", "VARCHAR(500) NULL"),
    ("monthly_pay", "FLOAT NULL"),
    ("join_date", "DATE NULL"),
]

def run():
    with engine.connect() as conn:
        for name, spec in COLUMNS:
            try:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {name} {spec}"))
                conn.commit()
                print(f"Added column: {name}")
            except Exception as e:
                if "1060" in str(e) or "Duplicate column" in str(e):
                    print(f"Column {name} already exists, skipping")
                else:
                    raise

if __name__ == "__main__":
    run()
