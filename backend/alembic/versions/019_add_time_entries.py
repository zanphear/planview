"""Add time_entries table for discrete time logging

Revision ID: 019
Revises: 018
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "019"
down_revision = "018"


def upgrade() -> None:
    op.create_table(
        "time_entries",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("workspace_id", UUID(as_uuid=True), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("task_id", UUID(as_uuid=True), sa.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("minutes", sa.Integer, nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("logged_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_time_entries_workspace", "time_entries", ["workspace_id"])
    op.create_index("ix_time_entries_task", "time_entries", ["task_id"])
    op.create_index("ix_time_entries_user", "time_entries", ["user_id"])
    op.create_index("ix_time_entries_logged_at", "time_entries", ["workspace_id", "logged_at"])


def downgrade() -> None:
    op.drop_index("ix_time_entries_logged_at", table_name="time_entries")
    op.drop_index("ix_time_entries_user", table_name="time_entries")
    op.drop_index("ix_time_entries_task", table_name="time_entries")
    op.drop_index("ix_time_entries_workspace", table_name="time_entries")
    op.drop_table("time_entries")
