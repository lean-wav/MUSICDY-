"""Add missing publicaciones counter and extra columns (safe IF NOT EXISTS)

Revision ID: c1d2e3f4a5b6
Revises: f1e2d3c4b5a6
Create Date: 2026-03-26 19:50:00.000000
"""
from typing import Sequence, Union
from alembic import op

revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, None] = 'f1e2d3c4b5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add all missing columns to publicaciones using IF NOT EXISTS to be safe."""
    import sqlalchemy as sa

    statements = [
        # Counter columns (most likely missing)
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS comments_count INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS saves_count INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS plays INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS views INTEGER NOT NULL DEFAULT 0",

        # Content / metadata columns
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS archivo_original VARCHAR",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS archivo_preview_hq VARCHAR",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS archivo_preview_stream VARCHAR",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS cover_url VARCHAR",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS visual_loop_url VARCHAR",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS subtitulo VARCHAR",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS descripcion TEXT",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS hashtags TEXT",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS tags JSON",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS visibilidad VARCHAR NOT NULL DEFAULT 'public'",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS fecha_programada TIMESTAMP",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS permitir_comentarios BOOLEAN NOT NULL DEFAULT true",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS permitir_reutilizacion BOOLEAN NOT NULL DEFAULT true",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS permitir_remix BOOLEAN NOT NULL DEFAULT true",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS permitir_colaboracion BOOLEAN NOT NULL DEFAULT true",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS status VARCHAR NOT NULL DEFAULT 'ready'",

        # Music metadata
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS bpm INTEGER",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS escala VARCHAR",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS subgenero VARCHAR",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS mood JSON",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS inspirado_en VARCHAR",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS idioma VARCHAR",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS creditos JSON",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS isrc VARCHAR",

        # Commerce / licensing columns
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS free_use BOOLEAN NOT NULL DEFAULT false",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS permitir_descarga_gratuita BOOLEAN NOT NULL DEFAULT false",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS incluir_stems BOOLEAN NOT NULL DEFAULT false",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS incluir_trackouts BOOLEAN NOT NULL DEFAULT false",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS contacto VARCHAR",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS es_autor BOOLEAN NOT NULL DEFAULT true",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS licencias JSON",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS allow_offers BOOLEAN NOT NULL DEFAULT true",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS contract_url VARCHAR",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS link_externo VARCHAR",

        # Origin / attribution
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS artista_original VARCHAR",
        "ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS plataforma_origen VARCHAR",
    ]

    conn = op.get_bind()
    for stmt in statements:
        conn.execute(sa.text(stmt))



def downgrade() -> None:
    pass  # intentionally left blank — columns are additive
