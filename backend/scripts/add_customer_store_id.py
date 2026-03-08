"""
Add store_id to customers table for company scoping.
Run from backend dir: python -m scripts.add_customer_store_id
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from config.database import engine

def run():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE customers ADD COLUMN store_id INT NULL"))
            conn.commit()
            print("Added column: store_id")
        except Exception as e:
            if "1060" in str(e) or "Duplicate column" in str(e):
                print("Column store_id already exists, skipping")
            else:
                raise

if __name__ == "__main__":
    run()
