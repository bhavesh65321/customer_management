"""baseline_schema

Revision ID: e135c148c311
Revises:
Create Date: 2026-05-06 22:38:05.662295

This is a BASELINE MARKER revision for an existing database.
The schema already exists — this revision records the current state so
future `alembic revision --autogenerate` commands produce clean diffs.
DO NOT add operations here. The DB was stamped at this revision with:
  alembic stamp head
"""
from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = 'e135c148c311'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Baseline marker — DB already contains all tables. No operations needed.
    pass


def downgrade() -> None:
    # Cannot downgrade a baseline — the DB was in this state from the start.
    pass
