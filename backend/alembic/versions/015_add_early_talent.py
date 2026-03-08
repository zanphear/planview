"""Add early talent programme tables

Revision ID: 015
Revises: 014
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "015"
down_revision = "014"


def upgrade() -> None:
    op.create_table(
        "early_talent_programmes",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("workspace_id", UUID(as_uuid=True), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("programme_type", sa.String(50), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("end_date", sa.Date, nullable=True),
        sa.Column("duration_months", sa.Integer, nullable=True),
        sa.Column("status", sa.String(20), server_default="draft", nullable=False),
        sa.Column("max_cohort_size", sa.Integer, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_early_talent_programmes_workspace_id", "early_talent_programmes", ["workspace_id"])

    op.create_table(
        "early_talent_cohorts",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("programme_id", UUID(as_uuid=True), sa.ForeignKey("early_talent_programmes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("intake_date", sa.Date, nullable=False),
        sa.Column("expected_end_date", sa.Date, nullable=True),
        sa.Column("status", sa.String(20), server_default="forming", nullable=False),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_early_talent_cohorts_programme_id", "early_talent_cohorts", ["programme_id"])

    op.create_table(
        "early_talent_participants",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("programme_id", UUID(as_uuid=True), sa.ForeignKey("early_talent_programmes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("cohort_id", UUID(as_uuid=True), sa.ForeignKey("early_talent_cohorts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("workspace_id", UUID(as_uuid=True), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("mentor_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("buddy_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("development_plan_id", UUID(as_uuid=True), sa.ForeignKey("development_plans.id", ondelete="SET NULL"), nullable=True),
        sa.Column("status", sa.String(20), server_default="enrolled", nullable=False),
        sa.Column("qualification_target", sa.String(500), nullable=True),
        sa.Column("university", sa.String(255), nullable=True),
        sa.Column("qualification_level", sa.String(50), nullable=True),
        sa.Column("qualification_progress", sa.Integer, server_default="0", nullable=False),
        sa.Column("start_date", sa.Date, nullable=True),
        sa.Column("expected_end_date", sa.Date, nullable=True),
        sa.Column("actual_end_date", sa.Date, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_early_talent_participants_programme_id", "early_talent_participants", ["programme_id"])
    op.create_index("ix_early_talent_participants_workspace_id", "early_talent_participants", ["workspace_id"])

    op.create_table(
        "early_talent_rotations",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("programme_id", UUID(as_uuid=True), sa.ForeignKey("early_talent_programmes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("department", sa.String(255), nullable=True),
        sa.Column("duration_weeks", sa.Integer, nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("sort_order", sa.Integer, server_default="0", nullable=False),
        sa.Column("required_competencies", JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_early_talent_rotations_programme_id", "early_talent_rotations", ["programme_id"])

    op.create_table(
        "early_talent_rotation_assignments",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("participant_id", UUID(as_uuid=True), sa.ForeignKey("early_talent_participants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("rotation_id", UUID(as_uuid=True), sa.ForeignKey("early_talent_rotations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("supervisor_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("end_date", sa.Date, nullable=True),
        sa.Column("status", sa.String(20), server_default="scheduled", nullable=False),
        sa.Column("assessment", sa.Text, nullable=True),
        sa.Column("rating", sa.Integer, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_early_talent_rotation_assignments_participant_id", "early_talent_rotation_assignments", ["participant_id"])

    op.create_table(
        "early_talent_milestones",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("participant_id", UUID(as_uuid=True), sa.ForeignKey("early_talent_participants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("milestone_type", sa.String(50), nullable=False),
        sa.Column("target_date", sa.Date, nullable=True),
        sa.Column("completed_date", sa.Date, nullable=True),
        sa.Column("status", sa.String(20), server_default="pending", nullable=False),
        sa.Column("evidence", sa.Text, nullable=True),
        sa.Column("sort_order", sa.Integer, server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_early_talent_milestones_participant_id", "early_talent_milestones", ["participant_id"])


def downgrade() -> None:
    op.drop_table("early_talent_milestones")
    op.drop_table("early_talent_rotation_assignments")
    op.drop_table("early_talent_rotations")
    op.drop_table("early_talent_participants")
    op.drop_table("early_talent_cohorts")
    op.drop_table("early_talent_programmes")
