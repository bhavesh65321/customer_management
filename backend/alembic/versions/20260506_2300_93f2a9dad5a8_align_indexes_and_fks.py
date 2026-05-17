"""align_indexes_and_fks

Revision ID: 93f2a9dad5a8
Revises: e135c148c311
Create Date: 2026-05-06 23:00:00.000000

Manually crafted alignment migration. Skips FK-backed indexes on stock_items
and stock_movements (ix_stock_items_store_id, ix_stock_movements_item_id) which
MySQL prevents dropping while the FK constraint exists — these are cosmetic name
differences only and the indexes work correctly as-is.

Changes applied:
  - stores: add ix_stores_contact_phone, ix_stores_customer_code (unique)
  - transactions: rename idx_txn_invoice_number → ix_transactions_invoice_number
  - stock_movements: add FK created_by → users.id
  - workflow_templates: add ix_workflow_templates_id, rename ix_wt_store → ix_workflow_templates_store_id, add FK store_id → stores.id
  - workflow_template_steps: add ix_workflow_template_steps_id, rename ix_wts_template → ix_workflow_template_steps_template_id, add FK template_id → workflow_templates.id, add FK karigar_id → karigars.id
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '93f2a9dad5a8'
down_revision: Union[str, None] = 'e135c148c311'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── stores ──────────────────────────────────────────────────────────────
    op.create_index('ix_stores_contact_phone', 'stores', ['contact_phone'], unique=False)
    op.create_index('ix_stores_customer_code', 'stores', ['customer_code'], unique=True)

    # ── transactions: rename unique index ───────────────────────────────────
    op.drop_index('idx_txn_invoice_number', table_name='transactions')
    op.create_index('ix_transactions_invoice_number', 'transactions', ['invoice_number'], unique=True)

    # ── stock_movements: add FK on created_by ───────────────────────────────
    op.create_foreign_key(None, 'stock_movements', 'users', ['created_by'], ['id'])

    # ── workflow_templates ──────────────────────────────────────────────────
    # Create new index BEFORE dropping old so MySQL can use it for the FK.
    op.create_index('ix_workflow_templates_store_id', 'workflow_templates', ['store_id'], unique=False)
    op.drop_index('ix_wt_store', table_name='workflow_templates')
    op.create_index('ix_workflow_templates_id', 'workflow_templates', ['id'], unique=False)
    op.create_foreign_key(None, 'workflow_templates', 'stores', ['store_id'], ['id'])

    # ── workflow_template_steps ─────────────────────────────────────────────
    # Create new template_id index BEFORE dropping old so the FK can use it.
    op.create_index('ix_workflow_template_steps_template_id', 'workflow_template_steps', ['template_id'], unique=False)
    op.drop_index('ix_wts_template', table_name='workflow_template_steps')
    op.create_index('ix_workflow_template_steps_id', 'workflow_template_steps', ['id'], unique=False)
    op.create_foreign_key(None, 'workflow_template_steps', 'workflow_templates', ['template_id'], ['id'])
    op.create_foreign_key(None, 'workflow_template_steps', 'karigars', ['karigar_id'], ['id'])


def downgrade() -> None:
    # ── workflow_template_steps ─────────────────────────────────────────────
    op.drop_constraint(None, 'workflow_template_steps', type_='foreignkey')  # karigar_id FK
    op.drop_constraint(None, 'workflow_template_steps', type_='foreignkey')  # template_id FK
    op.drop_index('ix_workflow_template_steps_id', table_name='workflow_template_steps')
    op.create_index('ix_wts_template', 'workflow_template_steps', ['template_id'], unique=False)
    op.drop_index('ix_workflow_template_steps_template_id', table_name='workflow_template_steps')

    # ── workflow_templates ──────────────────────────────────────────────────
    op.drop_constraint(None, 'workflow_templates', type_='foreignkey')
    op.drop_index('ix_workflow_templates_id', table_name='workflow_templates')
    op.create_index('ix_wt_store', 'workflow_templates', ['store_id'], unique=False)
    op.drop_index('ix_workflow_templates_store_id', table_name='workflow_templates')

    # ── stock_movements ─────────────────────────────────────────────────────
    op.drop_constraint(None, 'stock_movements', type_='foreignkey')  # created_by FK

    # ── transactions ────────────────────────────────────────────────────────
    op.drop_index('ix_transactions_invoice_number', table_name='transactions')
    op.create_index('idx_txn_invoice_number', 'transactions', ['invoice_number'], unique=True)

    # ── stores ──────────────────────────────────────────────────────────────
    op.drop_index('ix_stores_customer_code', table_name='stores')
    op.drop_index('ix_stores_contact_phone', table_name='stores')
