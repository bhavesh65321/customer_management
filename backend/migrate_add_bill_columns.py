"""
One-time migration: add bill_type and bill_photo_url to transactions table,
and create payments table if missing. Run from backend directory:
  python migrate_add_bill_columns.py
"""
import sys
from sqlalchemy import text

from config.database import engine


def run():
    with engine.connect() as conn:
        for sql, name in [
            ("ALTER TABLE transactions ADD COLUMN bill_type VARCHAR(50) NULL", "bill_type"),
            ("ALTER TABLE transactions ADD COLUMN bill_photo_url VARCHAR(500) NULL", "bill_photo_url"),
        ]:
            try:
                conn.execute(text(sql))
                conn.commit()
                print(f"Added column {name} to transactions.")
            except Exception as e:
                conn.rollback()
                if "Duplicate column" in str(e) or "1060" in str(e):
                    print(f"Column {name} already exists. Skipping.")
                else:
                    print(f"Error adding {name}:", e, file=sys.stderr)
                    sys.exit(1)

        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS payments (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    transaction_id INT NOT NULL,
                    store_id INT NULL,
                    amount FLOAT NOT NULL,
                    payment_mode VARCHAR(50) NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (transaction_id) REFERENCES transactions(id),
                    FOREIGN KEY (store_id) REFERENCES stores(id)
                )
            """))
            conn.commit()
            print("Payments table OK.")
        except Exception as e:
            conn.rollback()
            if "already exists" in str(e).lower():
                print("Payments table already exists.")
            else:
                print("Payments table:", e, file=sys.stderr)


if __name__ == "__main__":
    run()
