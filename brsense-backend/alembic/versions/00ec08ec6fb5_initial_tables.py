"""Initial tables complete

Revision ID: 00ec08ec6fb5
Revises: 
Create Date: 2025-12-11 10:20:05.860500

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '00ec08ec6fb5'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    
    # 1. Tabela DEVICE (A "mãe" de todas)
    op.create_table('device',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('esn', sa.String(length=32), nullable=False),
        sa.Column('name', sa.String(length=64), nullable=True),
        sa.Column('location', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_device'))
    )
    op.create_index(op.f('ix_device_esn'), 'device', ['esn'], unique=True)

    # 2. Tabela MESSAGE (Depende de Device)
    op.create_table('message',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('device_id', sa.Integer(), nullable=False),
        sa.Column('message_id', sa.String(length=64), nullable=False),
        sa.Column('raw_payload', sa.Text(), nullable=True),
        sa.Column('received_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['device_id'], ['device.id'], name=op.f('fk_message_device_id_device')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_message'))
    )
    op.create_index(op.f('ix_message_device_id'), 'message', ['device_id'], unique=False)

    # 3. Tabela READING (Depende de Device e Message)
    op.create_table('reading',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('device_id', sa.Integer(), nullable=False),
        sa.Column('message_id', sa.Integer(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('depth_cm', sa.Float(), nullable=False),
        sa.Column('moisture_pct', sa.Float(), nullable=True),
        sa.Column('temperature_c', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['device_id'], ['device.id'], name=op.f('fk_reading_device_id_device')),
        sa.ForeignKeyConstraint(['message_id'], ['message.id'], name=op.f('fk_reading_message_id_message')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_reading'))
    )
    op.create_index(op.f('ix_reading_device_id'), 'reading', ['device_id'], unique=False)
    op.create_index(op.f('ix_reading_timestamp'), 'reading', ['timestamp'], unique=False)

    # 4. Tabelas Novas (Que o seu arquivo original já tinha)
    op.create_table('request_log',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('client_ip', sa.String(length=50), nullable=True),
        sa.Column('raw_body', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('log_message', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_request_log'))
    )
    op.create_index(op.f('ix_request_log_id'), 'request_log', ['id'], unique=False)
    
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('login', sa.String(length=120), nullable=False),
        sa.Column('password', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_users'))
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_login'), 'users', ['login'], unique=True)
    
    op.create_table('device_config',
        sa.Column('device_id', sa.Integer(), nullable=False),
        sa.Column('mode', sa.String(length=16), nullable=False),
        sa.Column('fc_vwc_pct', sa.Float(), nullable=True),
        sa.Column('pwp_vwc_pct', sa.Float(), nullable=True),
        sa.Column('expected_interval_min', sa.Integer(), nullable=True),
        sa.Column('farm_id', sa.String(length=64), nullable=True),
        sa.Column('lat', sa.Float(), nullable=True),
        sa.Column('lon', sa.Float(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['device_id'], ['device.id'], name=op.f('fk_device_config_device_id_device'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('device_id', name=op.f('pk_device_config'))
    )
    op.create_index(op.f('ix_device_config_device_id'), 'device_config', ['device_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_device_config_device_id'), table_name='device_config')
    op.drop_table('device_config')
    op.drop_index(op.f('ix_users_login'), table_name='users')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_table('users')
    op.drop_index(op.f('ix_request_log_id'), table_name='request_log')
    op.drop_table('request_log')
    
    op.drop_index(op.f('ix_reading_timestamp'), table_name='reading')
    op.drop_index(op.f('ix_reading_device_id'), table_name='reading')
    op.drop_table('reading')
    
    op.drop_index(op.f('ix_message_device_id'), table_name='message')
    op.drop_table('message')
    
    op.drop_index(op.f('ix_device_esn'), table_name='device')
    op.drop_table('device')