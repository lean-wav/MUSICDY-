"""Add missing post fields manual

Revision ID: 86432b7302c5
Revises: de7e25b53097
Create Date: 2026-03-09 00:31:09.116794

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '86432b7302c5'
down_revision: Union[str, None] = 'de7e25b53097'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Adding missing fields to 'publicaciones'
    op.add_column('publicaciones', sa.Column('archivo_original', sa.String(), nullable=True))
    op.add_column('publicaciones', sa.Column('archivo_preview_hq', sa.String(), nullable=True))
    op.add_column('publicaciones', sa.Column('archivo_preview_stream', sa.String(), nullable=True))
    op.add_column('publicaciones', sa.Column('cover_url', sa.String(), nullable=True))
    op.add_column('publicaciones', sa.Column('visual_loop_url', sa.String(), nullable=True))
    op.add_column('publicaciones', sa.Column('subtitulo', sa.String(), nullable=True))
    op.add_column('publicaciones', sa.Column('tags', sa.JSON(), nullable=True))
    op.add_column('publicaciones', sa.Column('is_private', sa.Boolean(), server_default='false', nullable=True))
    op.add_column('publicaciones', sa.Column('visibilidad', sa.String(), server_default='public', nullable=True))
    op.add_column('publicaciones', sa.Column('is_pinned', sa.Boolean(), server_default='false', nullable=True))
    op.add_column('publicaciones', sa.Column('fecha_programada', sa.DateTime(), nullable=True))
    op.add_column('publicaciones', sa.Column('permitir_comentarios', sa.Boolean(), server_default='true', nullable=True))
    op.add_column('publicaciones', sa.Column('permitir_reutilizacion', sa.Boolean(), server_default='true', nullable=True))
    op.add_column('publicaciones', sa.Column('permitir_remix', sa.Boolean(), server_default='true', nullable=True))
    op.add_column('publicaciones', sa.Column('permitir_colaboracion', sa.Boolean(), server_default='true', nullable=True))
    op.add_column('publicaciones', sa.Column('status', sa.String(), server_default='ready', nullable=True))
    op.add_column('publicaciones', sa.Column('plays', sa.Integer(), server_default='0', nullable=True))
    op.add_column('publicaciones', sa.Column('views', sa.Integer(), server_default='0', nullable=True))
    op.add_column('publicaciones', sa.Column('subgenero', sa.String(), nullable=True))
    op.add_column('publicaciones', sa.Column('mood', sa.JSON(), nullable=True))
    op.add_column('publicaciones', sa.Column('inspirado_en', sa.String(), nullable=True))
    op.add_column('publicaciones', sa.Column('idioma', sa.String(), nullable=True))
    op.add_column('publicaciones', sa.Column('creditos', sa.JSON(), nullable=True))
    op.add_column('publicaciones', sa.Column('isrc', sa.String(), nullable=True))
    op.add_column('publicaciones', sa.Column('permitir_descarga_gratuita', sa.Boolean(), server_default='false', nullable=True))
    op.add_column('publicaciones', sa.Column('incluir_stems', sa.Boolean(), server_default='false', nullable=True))
    op.add_column('publicaciones', sa.Column('incluir_trackouts', sa.Boolean(), server_default='false', nullable=True))
    op.add_column('publicaciones', sa.Column('licencias', sa.JSON(), nullable=True))
    op.add_column('publicaciones', sa.Column('allow_offers', sa.Boolean(), server_default='true', nullable=True))
    op.add_column('publicaciones', sa.Column('contract_url', sa.String(), nullable=True))


def downgrade() -> None:
    # Dropping missing fields from 'publicaciones'
    columns = [
        'archivo_original', 'archivo_preview_hq', 'archivo_preview_stream', 'cover_url', 
        'visual_loop_url', 'subtitulo', 'tags', 'is_private', 'visibilidad', 'is_pinned', 
        'fecha_programada', 'permitir_comentarios', 'permitir_reutilizacion', 'permitir_remix', 
        'permitir_colaboracion', 'status', 'plays', 'views', 'subgenero', 'mood', 'inspirado_en', 
        'idioma', 'creditos', 'isrc', 'permitir_descarga_gratuita', 'incluir_stems', 'incluir_trackouts', 
        'licencias', 'allow_offers', 'contract_url'
    ]
    for col in columns:
        op.drop_column('publicaciones', col)
