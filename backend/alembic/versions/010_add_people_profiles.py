"""Add people profiles and person documents

Revision ID: 010
Revises: 009
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "010"
down_revision = "009"


def upgrade() -> None:
    op.create_table(
        "person_profiles",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("workspace_id", UUID(as_uuid=True), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        # Professional info
        sa.Column("job_title", sa.String(255), nullable=True),
        sa.Column("department", sa.String(255), nullable=True),
        sa.Column("manager_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("contract_type", sa.String(50), nullable=True),
        sa.Column("contract_start", sa.Date, nullable=True),
        sa.Column("contract_end", sa.Date, nullable=True),
        sa.Column("probation_end", sa.Date, nullable=True),
        sa.Column("location", sa.String(255), nullable=True),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("employee_id", sa.String(100), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        # Personal insights (manager-only)
        sa.Column("date_of_birth", sa.Date, nullable=True),
        sa.Column("partner_name", sa.String(255), nullable=True),
        sa.Column("number_of_kids", sa.Integer, nullable=True),
        sa.Column("kids_details", sa.Text, nullable=True),
        sa.Column("interests", sa.Text, nullable=True),
        sa.Column("dietary_requirements", sa.String(255), nullable=True),
        sa.Column("emergency_contact", sa.String(500), nullable=True),
        sa.Column("personal_notes", sa.Text, nullable=True),
        # Timestamps
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_person_profiles_workspace_id", "person_profiles", ["workspace_id"])
    op.create_index("ix_person_profiles_manager_id", "person_profiles", ["manager_id"])
    op.create_index("ix_person_profiles_department", "person_profiles", ["department"])

    op.create_table(
        "person_documents",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("profile_id", UUID(as_uuid=True), sa.ForeignKey("person_profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("workspace_id", UUID(as_uuid=True), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("document_type", sa.String(50), nullable=False),
        sa.Column("filename", sa.String(500), nullable=False),
        sa.Column("file_path", sa.String(1000), nullable=False),
        sa.Column("file_size", sa.Integer, nullable=False),
        sa.Column("mime_type", sa.String(255), nullable=False),
        sa.Column("expiry_date", sa.Date, nullable=True),
        sa.Column("uploaded_by", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("notes", sa.Text, nullable=True),
        # Timestamps
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_person_documents_profile_id", "person_documents", ["profile_id"])
    op.create_index("ix_person_documents_workspace_id", "person_documents", ["workspace_id"])
    op.create_index("ix_person_documents_expiry_date", "person_documents", ["expiry_date"])
    op.create_index("ix_person_documents_document_type", "person_documents", ["document_type"])


def downgrade() -> None:
    op.drop_table("person_documents")
    op.drop_table("person_profiles")
