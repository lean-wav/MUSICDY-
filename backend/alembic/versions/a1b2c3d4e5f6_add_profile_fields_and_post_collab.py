"""Add profile fields and post_colaboraciones table

Revision ID: a1b2c3d4e5f6
Revises: 86432b7302c5
Create Date: 2026-03-11

"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = '86432b7302c5'
branch_labels = None
depends_on = None


def upgrade():
    # ── New columns on usuarios ──────────────────────────────────────
    op.add_column('usuarios', sa.Column('banner_image', sa.String(), nullable=True))
    op.add_column('usuarios', sa.Column('website', sa.String(), nullable=True))
    op.add_column('usuarios', sa.Column('instagram', sa.String(), nullable=True))
    op.add_column('usuarios', sa.Column('youtube', sa.String(), nullable=True))
    op.add_column('usuarios', sa.Column('spotify', sa.String(), nullable=True))
    op.add_column('usuarios', sa.Column('tiktok', sa.String(), nullable=True))
    op.add_column('usuarios', sa.Column('genres', sa.JSON(), nullable=True, server_default='[]'))
    op.add_column('usuarios', sa.Column('subgenres', sa.JSON(), nullable=True, server_default='[]'))
    op.add_column('usuarios', sa.Column('verified_type', sa.String(), nullable=True, server_default='none'))
    op.add_column('usuarios', sa.Column('saved_visibility', sa.String(), nullable=True, server_default='public'))
    op.add_column('usuarios', sa.Column('pinned_posts', sa.JSON(), nullable=True, server_default='[]'))

    # ── New table: post_colaboraciones ───────────────────────────────
    op.create_table(
        'post_colaboraciones',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('publicacion_id', sa.Integer(), sa.ForeignKey('publicaciones.id'), nullable=False),
        sa.Column('usuario_id', sa.Integer(), sa.ForeignKey('usuarios.id'), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('NOW()')),
    )
    op.create_index('ix_post_colaboraciones_publicacion_id', 'post_colaboraciones', ['publicacion_id'])
    op.create_index('ix_post_colaboraciones_usuario_id', 'post_colaboraciones', ['usuario_id'])


def downgrade():
    op.drop_index('ix_post_colaboraciones_usuario_id', table_name='post_colaboraciones')
    op.drop_index('ix_post_colaboraciones_publicacion_id', table_name='post_colaboraciones')
    op.drop_table('post_colaboraciones')

    for col in ['banner_image', 'website', 'instagram', 'youtube', 'spotify',
                'tiktok', 'genres', 'subgenres', 'verified_type',
                'saved_visibility', 'pinned_posts']:
        op.drop_column('usuarios', col)
