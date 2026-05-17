"""merge_heads

Revision ID: 2cabbff59694
Revises: d6433dc450d4, 93f2a9dad5a8
Create Date: 2026-05-09 18:05:26.466145

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2cabbff59694'
down_revision: Union[str, None] = ('d6433dc450d4', '93f2a9dad5a8')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
