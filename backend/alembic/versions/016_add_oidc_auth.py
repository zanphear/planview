"""Add OIDC authentication columns to users

Revision ID: 016
Revises: 015
"""
from alembic import op
import sqlalchemy as sa

revision = "016"
down_revision = "015"


def upgrade() -> None:
    op.add_column("users", sa.Column("oidc_sub", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("oidc_issuer", sa.String(500), nullable=True))
    op.add_column(
        "users",
        sa.Column("auth_provider", sa.String(20), server_default="password", nullable=False),
    )
    op.create_index(
        "ix_users_oidc_sub",
        "users",
        ["oidc_sub"],
        unique=True,
        postgresql_where=sa.text("oidc_sub IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_users_oidc_sub", table_name="users")
    op.drop_column("users", "auth_provider")
    op.drop_column("users", "oidc_issuer")
    op.drop_column("users", "oidc_sub")
