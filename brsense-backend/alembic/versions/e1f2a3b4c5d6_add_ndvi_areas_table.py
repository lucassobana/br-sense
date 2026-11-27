"""add ndvi_areas table linked to device

Revision ID: e1f2a3b4c5d6
Revises: d7e8f9a0b1c2
Create Date: 2026-11-11 16:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e1f2a3b4c5d6'
down_revision: Union[str, Sequence[str], None] = 'd7e8f9a0b1c2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'ndvi_areas' not in inspector.get_table_names():
        op.create_table(
            'ndvi_areas',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('device_id', sa.Integer(), nullable=False),
            sa.Column('farm_id', sa.Integer(), nullable=True),
            sa.Column('name', sa.String(length=150), nullable=False),
            sa.Column('area_type', sa.String(length=32), nullable=False, server_default='pivo'),
            sa.Column('crop', sa.String(length=120), nullable=False, server_default='Monitoramento Satelital'),
            sa.Column('hectares', sa.Float(), nullable=False),
            sa.Column('source', sa.String(length=32), nullable=False, server_default='desenho'),
            sa.Column('geometry_json', sa.Text(), nullable=False),
            sa.Column('circle_json', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['device_id'], ['device.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['farm_id'], ['farm.id'], ondelete='SET NULL'),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_ndvi_areas_id'), 'ndvi_areas', ['id'], unique=False)
        op.create_index(op.f('ix_ndvi_areas_device_id'), 'ndvi_areas', ['device_id'], unique=False)
        op.create_index(op.f('ix_ndvi_areas_farm_id'), 'ndvi_areas', ['farm_id'], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'ndvi_areas' in inspector.get_table_names():
        op.drop_index(op.f('ix_ndvi_areas_farm_id'), table_name='ndvi_areas')
        op.drop_index(op.f('ix_ndvi_areas_device_id'), table_name='ndvi_areas')
        op.drop_index(op.f('ix_ndvi_areas_id'), table_name='ndvi_areas')
        op.drop_table('ndvi_areas')

