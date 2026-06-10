"""add location to reading

Revision ID: 0fd3bfb7f6de
Revises: 5d2d396f52ea
Create Date: 2026-06-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0fd3bfb7f6de'
down_revision: Union[str, Sequence[str], None] = '5d2d396f52ea'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('reading', sa.Column('latitude', sa.Float(), nullable=True))
    op.add_column('reading', sa.Column('longitude', sa.Float(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('reading', 'longitude')
    op.drop_column('reading', 'latitude')
