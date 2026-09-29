"""battery solar integer to float

Revision ID: c1a2b3d4e5f6
Revises: b35938355865
Create Date: 2026-09-29 10:32:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1a2b3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'b35938355865'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Converte battery_status e solar_status de Integer para Float (Double Precision)."""
    op.alter_column(
        'reading',
        'battery_status',
        existing_type=sa.Integer(),
        type_=sa.Float(),
        existing_nullable=True,
        postgresql_using='battery_status::double precision',
    )
    op.alter_column(
        'reading',
        'solar_status',
        existing_type=sa.Integer(),
        type_=sa.Float(),
        existing_nullable=True,
        postgresql_using='solar_status::double precision',
    )


def downgrade() -> None:
    """Reverte Float para Integer (perde precisão decimal)."""
    op.alter_column(
        'reading',
        'battery_status',
        existing_type=sa.Float(),
        type_=sa.Integer(),
        existing_nullable=True,
        postgresql_using='battery_status::integer',
    )
    op.alter_column(
        'reading',
        'solar_status',
        existing_type=sa.Float(),
        type_=sa.Integer(),
        existing_nullable=True,
        postgresql_using='solar_status::integer',
    )
