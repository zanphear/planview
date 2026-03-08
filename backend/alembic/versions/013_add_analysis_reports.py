"""Add analysis reports

Revision ID: 013
Revises: 012
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "013"
down_revision = "012"


def upgrade() -> None:
    op.create_table(
        "analysis_reports",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("workspace_id", UUID(as_uuid=True), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("report_type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("content", sa.Text, nullable=True),
        sa.Column("parameters", JSONB, nullable=True),
        sa.Column("status", sa.String(20), server_default="generating", nullable=False),
        sa.Column("generation_time_seconds", sa.Float, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_analysis_reports_workspace_id", "analysis_reports", ["workspace_id"])
    op.create_index("ix_analysis_reports_user_id", "analysis_reports", ["user_id"])
    op.create_index("ix_analysis_reports_report_type", "analysis_reports", ["report_type"])


def downgrade() -> None:
    op.drop_table("analysis_reports")
