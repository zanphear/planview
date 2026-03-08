"""Add lookup_values table for configurable reference data

Revision ID: 017
Revises: 016
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "017"
down_revision = "016"


DEFAULTS = {
    "department": [
        ("engineering", "Engineering"),
        ("design", "Design"),
        ("marketing", "Marketing"),
        ("product", "Product"),
        ("hr", "HR"),
        ("finance", "Finance"),
        ("operations", "Operations"),
        ("sales", "Sales"),
    ],
    "job_title": [
        ("software_engineer", "Software Engineer"),
        ("senior_engineer", "Senior Engineer"),
        ("lead_engineer", "Lead Engineer"),
        ("engineering_manager", "Engineering Manager"),
        ("product_manager", "Product Manager"),
        ("designer", "Designer"),
        ("analyst", "Analyst"),
        ("devops_engineer", "DevOps Engineer"),
    ],
    "location": [
        ("london", "London"),
        ("manchester", "Manchester"),
        ("bristol", "Bristol"),
        ("edinburgh", "Edinburgh"),
        ("birmingham", "Birmingham"),
        ("remote", "Remote"),
    ],
    "competency_category": [
        ("technical", "Technical"),
        ("safety", "Safety"),
        ("leadership", "Leadership"),
        ("communication", "Communication"),
        ("compliance", "Compliance"),
        ("domain_knowledge", "Domain Knowledge"),
    ],
    "leave_type": [
        ("annual", "Annual", "#3b82f6"),
        ("sick", "Sick", "#ef4444"),
        ("compassionate", "Compassionate", "#8b5cf6"),
        ("toil", "TOIL", "#14b8a6"),
        ("training", "Training", "#f59e0b"),
        ("unpaid", "Unpaid", "#64748b"),
        ("other", "Other", "#6b7280"),
    ],
    "compliance_item_type": [
        ("certificate", "Certificate", "#3b82f6"),
        ("visa", "Visa", "#8b5cf6"),
        ("contract", "Contract", "#14b8a6"),
        ("licence", "Licence", "#f59e0b"),
        ("training", "Training", "#22c55e"),
        ("dbs_check", "DBS Check", "#ef4444"),
        ("right_to_work", "Right to Work", "#ec4899"),
    ],
    "candidate_source": [
        ("linkedin", "LinkedIn", "#0a66c2"),
        ("referral", "Referral", "#22c55e"),
        ("website", "Website", "#3b82f6"),
        ("agency", "Agency", "#f59e0b"),
        ("job_board", "Job Board", "#8b5cf6"),
        ("internal", "Internal", "#14b8a6"),
        ("other", "Other", "#6b7280"),
    ],
    "event_outcome": [
        ("pass", "Pass", "#22c55e"),
        ("fail", "Fail", "#ef4444"),
        ("maybe", "Maybe", "#f59e0b"),
        ("deferred", "Deferred", "#8b5cf6"),
        ("no_show", "No Show", "#64748b"),
    ],
    "onboarding_assignee_role": [
        ("manager", "Manager"),
        ("it", "IT"),
        ("hr", "HR"),
        ("new_starter", "New Starter"),
        ("buddy", "Buddy"),
        ("facilities", "Facilities"),
    ],
    "kudos_category": [
        ("teamwork", "Teamwork", "#3b82f6"),
        ("innovation", "Innovation", "#8b5cf6"),
        ("leadership", "Leadership", "#f59e0b"),
        ("above_and_beyond", "Going Above & Beyond", "#22c55e"),
        ("customer_focus", "Customer Focus", "#14b8a6"),
    ],
}


def upgrade() -> None:
    op.create_table(
        "lookup_values",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("workspace_id", UUID(as_uuid=True), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("value", sa.String(100), nullable=False),
        sa.Column("label", sa.String(255), nullable=True),
        sa.Column("colour", sa.String(20), nullable=True),
        sa.Column("display_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("workspace_id", "category", "value", name="uq_lookup_ws_cat_val"),
    )
    op.create_index("ix_lookup_values_ws_cat", "lookup_values", ["workspace_id", "category"])

    # Seed defaults for all existing workspaces
    conn = op.get_bind()
    workspaces = conn.execute(sa.text("SELECT id FROM workspaces")).fetchall()
    for (ws_id,) in workspaces:
        for category, items in DEFAULTS.items():
            for i, item in enumerate(items):
                value = item[0]
                label = item[1]
                colour = item[2] if len(item) > 2 else None
                if colour:
                    conn.execute(
                        sa.text(
                            "INSERT INTO lookup_values (workspace_id, category, value, label, colour, display_order) "
                            "VALUES (:ws, :cat, :val, :lbl, :col, :ord) ON CONFLICT DO NOTHING"
                        ),
                        {"ws": ws_id, "cat": category, "val": value, "lbl": label, "col": colour, "ord": i},
                    )
                else:
                    conn.execute(
                        sa.text(
                            "INSERT INTO lookup_values (workspace_id, category, value, label, display_order) "
                            "VALUES (:ws, :cat, :val, :lbl, :ord) ON CONFLICT DO NOTHING"
                        ),
                        {"ws": ws_id, "cat": category, "val": value, "lbl": label, "ord": i},
                    )


def downgrade() -> None:
    op.drop_index("ix_lookup_values_ws_cat", table_name="lookup_values")
    op.drop_table("lookup_values")
