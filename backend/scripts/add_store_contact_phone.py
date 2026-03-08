"""
Add contact_phone to stores and backfill customer_code for existing rows.
Run from backend dir: python -m scripts.add_store_contact_phone
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from config.database import engine

def run():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE stores ADD COLUMN contact_phone VARCHAR(20) NULL"))
            conn.commit()
            print("Added column: contact_phone")
        except Exception as e:
            if "1060" in str(e) or "Duplicate column" in str(e):
                print("Column contact_phone already exists, skipping")
            else:
                raise
        try:
            result = conn.execute(text(
                "UPDATE stores SET customer_code = CONCAT('CUST-', id) WHERE customer_code IS NULL OR customer_code = ''"
            ))
            conn.commit()
            print(f"Backfilled customer_code for existing stores (rowcount: {result.rowcount})")
        except Exception as e:
            print(f"Backfill note: {e}")
            conn.rollback()

if __name__ == "__main__":
    run()
