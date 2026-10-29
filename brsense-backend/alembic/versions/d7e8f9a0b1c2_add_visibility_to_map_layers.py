"""add visibility state to map_layers

Revision ID: d7e8f9a0b1c2
Revises: c1a2b3d4e5f6
Create Date: 2026-10-07 16:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd7e8f9a0b1c2'
down_revision: Union[str, Sequence[str], None] = 'c1a2b3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Adiciona estado persistido de exibição das camadas KML.

    Registros existentes recebem is_active = true e nenhuma feature oculta.
    """
    op.add_column(
        'map_layers',
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
    )
    op.add_column(
        'map_layers',
        sa.Column('hidden_feature_indices', sa.Text(), nullable=False, server_default=sa.text("'[]'")),
    )


def downgrade() -> None:
    """Remove as colunas de estado de exibição."""
    op.drop_column('map_layers', 'hidden_feature_indices')
    op.drop_column('map_layers', 'is_active')
