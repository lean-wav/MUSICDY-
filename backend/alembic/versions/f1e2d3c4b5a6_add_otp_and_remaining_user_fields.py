"""Add OTP fields and remaining user columns

Revision ID: f1e2d3c4b5a6
Revises: a1b2c3d4e5f6
Create Date: 2026-03-26

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'f1e2d3c4b5a6'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def _add_column_if_not_exists(table, column):
    """Helper to add column using raw SQL IF NOT EXISTS for Postgres compatibility."""
    col_type = column.type.compile(dialect=op.get_bind().dialect)
    nullable = "NULL" if column.nullable else "NOT NULL"
    default = ""
    if column.server_default is not None:
        default_val = str(column.server_default.arg) if hasattr(column.server_default, 'arg') else str(column.server_default)
        default = f" DEFAULT {default_val}"
    op.execute(
        f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column.name} {col_type}{default} {nullable}"
    )


def upgrade():
    conn = op.get_bind()
    dialect = conn.dialect.name

    # --- Columns missing from usuarios table ---
    columns_to_add = [
        # OTP verification (new functionality)
        ("otp_code", "VARCHAR", True, None),
        ("otp_expires_at", "TIMESTAMP", True, None),

        # Financial & payout fields
        ("wallet_balance", "FLOAT", True, "0.0"),
        ("paypal_email", "VARCHAR", True, None),
        ("usdt_address", "VARCHAR", True, None),

        # Social / identity
        ("gender", "VARCHAR", True, None),
        ("accent_color", "VARCHAR", True, None),

        # Auth tokens
        ("verification_token", "VARCHAR", True, None),
        ("reset_password_token", "VARCHAR", True, None),
        ("reset_password_expire", "TIMESTAMP", True, None),

        # Counters (may already exist in some envs)
        ("followers_count", "INTEGER", True, "0"),
        ("following_count", "INTEGER", True, "0"),
    ]

    if dialect == "postgresql":
        for col_name, col_type, nullable, default in columns_to_add:
            null_clause = "NULL" if nullable else "NOT NULL"
            default_clause = f"DEFAULT {default}" if default is not None else ""
            op.execute(
                f"ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS "
                f"{col_name} {col_type} {default_clause} {null_clause}"
            )
    else:
        # SQLite fallback (for local dev) — can't do IF NOT EXISTS, wrap in try/except
        for col_name, col_type, nullable, default in columns_to_add:
            try:
                null_clause = True if nullable else False
                server_default = str(default) if default is not None else None
                if col_type == "VARCHAR":
                    col = sa.Column(col_name, sa.String(), nullable=null_clause, server_default=server_default)
                elif col_type == "FLOAT":
                    col = sa.Column(col_name, sa.Float(), nullable=null_clause, server_default=server_default)
                elif col_type == "INTEGER":
                    col = sa.Column(col_name, sa.Integer(), nullable=null_clause, server_default=server_default)
                elif col_type == "TIMESTAMP":
                    col = sa.Column(col_name, sa.DateTime(), nullable=null_clause)
                op.add_column('usuarios', col)
            except Exception:
                pass  # Column already exists in SQLite dev DB

    # --- Index for verification token (if not exists) ---
    if dialect == "postgresql":
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_usuarios_verification_token "
            "ON usuarios (verification_token)"
        )
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_usuarios_reset_password_token "
            "ON usuarios (reset_password_token)"
        )


def downgrade():
    cols = [
        "otp_code", "otp_expires_at", "wallet_balance", "paypal_email",
        "usdt_address", "gender", "accent_color", "verification_token",
        "reset_password_token", "reset_password_expire"
    ]
    for col in cols:
        try:
            op.drop_column('usuarios', col)
        except Exception:
            pass
