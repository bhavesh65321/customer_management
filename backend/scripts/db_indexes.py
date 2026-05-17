"""
OPT-01 — Database Query Optimisation: Add Missing Indexes

This script analyses the most common query patterns across routes and
documents the indexes that should be added. The actual indexes are
created via Alembic migration.

Hot query patterns identified:
  1. transactions WHERE store_id AND due_amount > 0  (reminders, outstanding)
  2. transactions WHERE customer_id                   (customer account)
  3. transactions WHERE created_at BETWEEN x AND y   (reports, daily sales)
  4. customers WHERE store_id AND is_active           (customer list)
  5. customers WHERE primary_phone                    (dup check in bulk import)
  6. girvi_loans WHERE store_id AND status            (active loans list)
  7. orders WHERE store_id AND status                 (order management)
  8. audit_logs WHERE store_id AND created_at         (activity history)
  9. loyalty_ledger WHERE customer_id AND store_id    (balance calc)
  10. metal_rates WHERE effective_from DESC            (current rates)
"""

# Index definitions — run this module to print the CREATE INDEX statements
# These are also applied via Alembic autogenerate when models define Index()

INDEXES = [
    # transactions — most-queried table
    "CREATE INDEX IF NOT EXISTS idx_txn_store_due ON transactions (store_id, due_amount);",
    "CREATE INDEX IF NOT EXISTS idx_txn_customer ON transactions (customer_id);",
    "CREATE INDEX IF NOT EXISTS idx_txn_created ON transactions (created_at);",
    "CREATE INDEX IF NOT EXISTS idx_txn_store_created ON transactions (store_id, created_at);",

    # customers
    "CREATE INDEX IF NOT EXISTS idx_cust_store_active ON customers (store_id, is_active);",
    "CREATE INDEX IF NOT EXISTS idx_cust_phone ON customers (primary_phone);",

    # girvi
    "CREATE INDEX IF NOT EXISTS idx_girvi_store_status ON girvi_loans (store_id, status);",

    # orders
    "CREATE INDEX IF NOT EXISTS idx_orders_store_status ON orders (store_id, status);",
    "CREATE INDEX IF NOT EXISTS idx_orders_expected ON orders (expected_date);",

    # audit_logs
    "CREATE INDEX IF NOT EXISTS idx_audit_store_created ON audit_logs (store_id, created_at);",

    # loyalty_ledger — composite already added by model, but explicit covering index:
    "CREATE INDEX IF NOT EXISTS idx_loyalty_cust_store ON loyalty_ledger (customer_id, store_id);",

    # metal_rates — current rates query sorts by effective_from DESC
    "CREATE INDEX IF NOT EXISTS idx_metalrate_metal_date ON metal_rates (metal_type, effective_from);",
]

if __name__ == "__main__":
    for idx in INDEXES:
        print(idx)
