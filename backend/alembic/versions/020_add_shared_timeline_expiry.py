"""Add expires_at column to shared_timelines

Revision ID: 020
Revises: 019
"""
from alembic import op
import sqlalchemy as sa

revision = "020"
down_revision = "019"


def upgrade() -> None:
    op.add_column("shared_timelines", sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("shared_timelines", "expires_at")
