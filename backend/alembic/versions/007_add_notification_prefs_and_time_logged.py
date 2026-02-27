"""Add notification_prefs to users and time_logged_minutes to tasks.

Revision ID: 007
Revises: 006
"""
from alembic import op
from sqlalchemy import text

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(text(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_prefs JSONB"
    ))
    conn.execute(text(
        "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS time_logged_minutes INTEGER NOT NULL DEFAULT 0"
    ))


def downgrade() -> None:
    op.drop_column("tasks", "time_logged_minutes")
    op.drop_column("users", "notification_prefs")
