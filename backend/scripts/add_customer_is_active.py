"""
Add is_active to customers table. Run from backend dir: python -m scripts.add_customer_is_active
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from config.database import engine

def run():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE customers ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1"))
            conn.commit()
            print("Added column: is_active")
        except Exception as e:
            if "1060" in str(e) or "Duplicate column" in str(e):
                print("Column is_active already exists, skipping")
            else:
                raise

if __name__ == "__main__":
    run()
