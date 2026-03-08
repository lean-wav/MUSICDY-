"""add_missing_user_fields

Revision ID: de7e25b53097
Revises: 747e1714bf0e
Create Date: 2026-03-08 18:56:38.424805

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'de7e25b53097'
down_revision: Union[str, None] = '747e1714bf0e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Adding all missing columns to the usuarios table that exist in models.py
    op.add_column('usuarios', sa.Column('mp_account_id', sa.String(), nullable=True))
    op.add_column('usuarios', sa.Column('country', sa.String(), server_default="US"))
    op.add_column('usuarios', sa.Column('profile_views', sa.Integer(), server_default="0"))
    op.add_column('usuarios', sa.Column('phone', sa.String(), nullable=True))
    op.add_column('usuarios', sa.Column('birthdate', sa.DateTime(), nullable=True))
    op.add_column('usuarios', sa.Column('is_private', sa.Boolean(), server_default='false'))
    
    op.add_column('usuarios', sa.Column('provider', sa.String(), server_default="email"))
    op.add_column('usuarios', sa.Column('provider_id', sa.String(), nullable=True))
    op.create_index(op.f('ix_usuarios_provider_id'), 'usuarios', ['provider_id'], unique=False)
    
    op.add_column('usuarios', sa.Column('is_verified', sa.Boolean(), server_default='false'))
    op.add_column('usuarios', sa.Column('account_status', sa.String(), server_default="active"))
    op.add_column('usuarios', sa.Column('tipo_usuario', sa.String(), server_default="General"))
    op.add_column('usuarios', sa.Column('settings', sa.JSON(), nullable=True))
    op.add_column('usuarios', sa.Column('nombre_artistico', sa.String(), nullable=True))
    op.add_column('usuarios', sa.Column('sales_count', sa.Integer(), server_default="0"))
    op.add_column('usuarios', sa.Column('total_plays', sa.Integer(), server_default="0"))

def downgrade() -> None:
    op.drop_column('usuarios', 'total_plays')
    op.drop_column('usuarios', 'sales_count')
    op.drop_column('usuarios', 'nombre_artistico')
    op.drop_column('usuarios', 'settings')
    op.drop_column('usuarios', 'tipo_usuario')
    op.drop_column('usuarios', 'account_status')
    op.drop_column('usuarios', 'is_verified')
    op.drop_index(op.f('ix_usuarios_provider_id'), table_name='usuarios')
    op.drop_column('usuarios', 'provider_id')
    op.drop_column('usuarios', 'provider')
    op.drop_column('usuarios', 'is_private')
    op.drop_column('usuarios', 'birthdate')
    op.drop_column('usuarios', 'phone')
    op.drop_column('usuarios', 'profile_views')
    op.drop_column('usuarios', 'country')
    op.drop_column('usuarios', 'mp_account_id')
