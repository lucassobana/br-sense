"""add farm table and relationships

Revision ID: 72e63bd0b1e6
Revises: 00ec08ec6fb5
Create Date: 2025-12-12 18:02:08.275486

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision: str = '72e63bd0b1e6'
down_revision: Union[str, Sequence[str], None] = '00ec08ec6fb5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    # 1. Cria tabela FARM apenas se ela não existir
    if 'farm' not in tables:
        op.create_table('farm',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('name', sa.String(length=100), nullable=False),
            sa.Column('location', sa.String(length=128), nullable=True),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_farm_user_id_users')),
            sa.PrimaryKeyConstraint('id', name=op.f('pk_farm'))
        )
        op.create_index(op.f('ix_farm_id'), 'farm', ['id'], unique=False)
    
    # 2. LIMPEZA SEGURA DE ÍNDICES E CONSTRAINTS ANTIGOS
    op.execute('DROP INDEX IF EXISTS ix_message_device_id')
    op.execute('ALTER TABLE reading DROP CONSTRAINT IF EXISTS fk_reading_message_id_message')
    op.execute('DROP TABLE IF EXISTS message CASCADE')
    
    # 3. Atualiza tabela DEVICE
    # Verifica se a coluna farm_id já existe antes de adicionar
    columns_device = [c['name'] for c in inspector.get_columns('device')]
    if 'farm_id' not in columns_device:
        op.add_column('device', sa.Column('farm_id', sa.Integer(), nullable=True))
    
    # Alterações de coluna são seguras de rodar repetidamente em Postgres (geralmente), 
    # mas o ideal seria verificar. Vamos manter direto pois ALTER COLUMN é menos propenso a falha fatal se o tipo for o mesmo.
    op.alter_column('device', 'location',
               existing_type=sa.VARCHAR(length=64),
               type_=sa.String(length=128),
               existing_nullable=True)
    op.alter_column('device', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=False)
    op.alter_column('device', 'updated_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=False)

    # CORREÇÃO PRINCIPAL: Garante que o índice não existe antes de criar
    op.execute('DROP INDEX IF EXISTS ix_device_id')
    op.create_index(op.f('ix_device_id'), 'device', ['id'], unique=False)
    
    # Adiciona FK apenas se não existir (Opcional, mas seguro)
    # op.create_foreign_key falha se existir. O ideal é nomear e dropar antes ou ignorar erro.
    # Vamos tentar dropar a constraint antiga se existir pelo nome, depois criar.
    op.execute('ALTER TABLE device DROP CONSTRAINT IF EXISTS fk_device_farm_id_farm')
    op.create_foreign_key(op.f('fk_device_farm_id_farm'), 'device', 'farm', ['farm_id'], ['id'])
    
    # 4. Atualiza tabela READING
    op.alter_column('reading', 'depth_cm',
               existing_type=sa.DOUBLE_PRECISION(precision=53),
               nullable=True)
    
    op.execute('DROP INDEX IF EXISTS ix_reading_device_id')
    op.execute('DROP INDEX IF EXISTS ix_reading_timestamp')
    
    # CORREÇÃO PARA READING ID
    op.execute('DROP INDEX IF EXISTS ix_reading_id')
    op.create_index(op.f('ix_reading_id'), 'reading', ['id'], unique=False)
    
    # Tenta remover a coluna message_id apenas se ela existir
    columns_reading = [c['name'] for c in inspector.get_columns('reading')]
    if 'message_id' in columns_reading:
        op.drop_column('reading', 'message_id')


def downgrade() -> None:
    """Downgrade schema."""
    # O downgrade pode falhar se o estado estiver inconsistente, 
    # mas geralmente focamos em corrigir o upgrade.
    op.add_column('reading', sa.Column('message_id', sa.INTEGER(), autoincrement=False, nullable=True))
    op.create_foreign_key(op.f('fk_reading_message_id_message'), 'reading', 'message', ['message_id'], ['id'])
    op.drop_index(op.f('ix_reading_id'), table_name='reading')
    op.create_index(op.f('ix_reading_timestamp'), 'reading', ['timestamp'], unique=False)
    op.create_index(op.f('ix_reading_device_id'), 'reading', ['device_id'], unique=False)
    op.alter_column('reading', 'depth_cm',
               existing_type=sa.DOUBLE_PRECISION(precision=53),
               nullable=False)
    op.drop_constraint(op.f('fk_device_farm_id_farm'), 'device', type_='foreignkey')
    op.drop_index(op.f('ix_device_id'), table_name='device')
    op.alter_column('device', 'updated_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=True)
    op.alter_column('device', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=True)
    op.alter_column('device', 'location',
               existing_type=sa.String(length=128),
               type_=sa.VARCHAR(length=64),
               existing_nullable=True)
    op.drop_column('device', 'farm_id')
    op.create_table('message',
    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
    sa.Column('device_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('message_id', sa.VARCHAR(length=64), autoincrement=False, nullable=False),
    sa.Column('raw_payload', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('received_at', postgresql.TIMESTAMP(), autoincrement=False, nullable=False),
    sa.ForeignKeyConstraint(['device_id'], ['device.id'], name=op.f('fk_message_device_id_device')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_message'))
    )
    op.create_index(op.f('ix_message_device_id'), 'message', ['device_id'], unique=False)
    op.drop_index(op.f('ix_farm_id'), table_name='farm')
    op.drop_table('farm')