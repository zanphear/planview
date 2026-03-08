"""Enhance development plans with milestones, checkpoints, career pathways

Revision ID: 014
Revises: 013
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "014"
down_revision = "013"


def upgrade() -> None:
    # --- Career Pathways table ---
    op.create_table(
        "career_pathways",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("workspace_id", UUID(as_uuid=True), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("levels", JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_career_pathways_workspace_id", "career_pathways", ["workspace_id"])

    # --- Development Milestones table ---
    op.create_table(
        "development_milestones",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("plan_id", UUID(as_uuid=True), sa.ForeignKey("development_plans.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("target_date", sa.Date, nullable=False),
        sa.Column("completed_date", sa.Date, nullable=True),
        sa.Column("status", sa.String(20), server_default="pending", nullable=False),
        sa.Column("year", sa.Integer, nullable=False),
        sa.Column("sort_order", sa.Integer, server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_development_milestones_plan_id", "development_milestones", ["plan_id"])

    # --- Development Checkpoints table ---
    op.create_table(
        "development_checkpoints",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("plan_id", UUID(as_uuid=True), sa.ForeignKey("development_plans.id", ondelete="CASCADE"), nullable=False),
        sa.Column("checkpoint_date", sa.Date, nullable=False),
        sa.Column("reviewer_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("overall_assessment", sa.String(20), nullable=False),
        sa.Column("actions", JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_development_checkpoints_plan_id", "development_checkpoints", ["plan_id"])

    # --- Add columns to development_plans ---
    op.add_column("development_plans", sa.Column("horizon_years", sa.Integer, nullable=True))
    op.add_column("development_plans", sa.Column("start_date", sa.Date, nullable=True))
    op.add_column("development_plans", sa.Column("end_date", sa.Date, nullable=True))
    op.add_column("development_plans", sa.Column("career_pathway_id", UUID(as_uuid=True), nullable=True))
    op.add_column("development_plans", sa.Column("overall_progress", sa.Integer, server_default="0", nullable=False))
    op.add_column("development_plans", sa.Column("total_budget", sa.Float, nullable=True))
    op.create_foreign_key(
        "fk_development_plans_career_pathway_id",
        "development_plans",
        "career_pathways",
        ["career_pathway_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # --- Add columns to development_goals ---
    op.add_column("development_goals", sa.Column("priority", sa.String(20), nullable=True))
    op.add_column("development_goals", sa.Column("progress", sa.Integer, server_default="0", nullable=False))
    op.add_column("development_goals", sa.Column("year", sa.Integer, nullable=True))
    op.add_column("development_goals", sa.Column("linked_objective_id", UUID(as_uuid=True), nullable=True))
    op.add_column("development_goals", sa.Column("actual_cost", sa.Float, nullable=True))
    op.add_column("development_goals", sa.Column("completed_date", sa.Date, nullable=True))
    op.create_foreign_key(
        "fk_development_goals_linked_objective_id",
        "development_goals",
        "objectives",
        ["linked_objective_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_development_goals_linked_objective_id", "development_goals", type_="foreignkey")
    op.drop_column("development_goals", "completed_date")
    op.drop_column("development_goals", "actual_cost")
    op.drop_column("development_goals", "linked_objective_id")
    op.drop_column("development_goals", "year")
    op.drop_column("development_goals", "progress")
    op.drop_column("development_goals", "priority")

    op.drop_constraint("fk_development_plans_career_pathway_id", "development_plans", type_="foreignkey")
    op.drop_column("development_plans", "total_budget")
    op.drop_column("development_plans", "overall_progress")
    op.drop_column("development_plans", "career_pathway_id")
    op.drop_column("development_plans", "end_date")
    op.drop_column("development_plans", "start_date")
    op.drop_column("development_plans", "horizon_years")

    op.drop_table("development_checkpoints")
    op.drop_table("development_milestones")
    op.drop_table("career_pathways")
