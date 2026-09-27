"""add map_layers table

Revision ID: b35938355865
Revises: 2d42cdf172e0
Create Date: 2026-09-26 18:28:46.099772

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b35938355865'
down_revision: Union[str, Sequence[str], None] = '2d42cdf172e0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('map_layers',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('farm_id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=150), nullable=False),
    sa.Column('original_filename', sa.String(length=255), nullable=True),
    sa.Column('geojson', sa.Text(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['farm_id'], ['farm.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_map_layers_farm_id'), 'map_layers', ['farm_id'], unique=False)
    op.create_index(op.f('ix_map_layers_id'), 'map_layers', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_map_layers_id'), table_name='map_layers')
    op.drop_index(op.f('ix_map_layers_farm_id'), table_name='map_layers')
    op.drop_table('map_layers')
