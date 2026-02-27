"""Add task dependencies, custom fields, task templates, webhooks, and 2FA.

Revision ID: 008
Revises: 007
"""
from alembic import op
from sqlalchemy import text

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    # Task dependencies
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS task_dependencies (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            blocker_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
            blocked_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
            dependency_type VARCHAR(20) NOT NULL DEFAULT 'finish_to_start',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE(blocker_id, blocked_id)
        )
    """))
    conn.execute(text(
        "CREATE INDEX IF NOT EXISTS ix_taskdep_blocker ON task_dependencies(blocker_id)"
    ))
    conn.execute(text(
        "CREATE INDEX IF NOT EXISTS ix_taskdep_blocked ON task_dependencies(blocked_id)"
    ))

    # Custom fields
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS custom_fields (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            field_type VARCHAR(20) NOT NULL DEFAULT 'text',
            options TEXT,
            sort_order INTEGER NOT NULL DEFAULT 0,
            workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS custom_field_values (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            value TEXT,
            field_id UUID NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
            task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE(field_id, task_id)
        )
    """))

    # Task templates
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS task_templates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            description TEXT,
            colour VARCHAR(7),
            status VARCHAR(50) NOT NULL DEFAULT 'todo',
            time_estimate_minutes INTEGER,
            checklist_items JSONB,
            tag_names JSONB,
            workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """))

    # Webhooks
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS webhooks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            url VARCHAR(2000) NOT NULL,
            secret VARCHAR(255),
            events JSONB,
            is_active BOOLEAN NOT NULL DEFAULT true,
            workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS webhook_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            event VARCHAR(100) NOT NULL,
            payload JSONB,
            response_status INTEGER,
            response_body TEXT,
            success BOOLEAN NOT NULL DEFAULT false,
            webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """))

    # 2FA on users
    conn.execute(text(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(255)"
    ))
    conn.execute(text(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false"
    ))


def downgrade() -> None:
    op.drop_column("users", "totp_enabled")
    op.drop_column("users", "totp_secret")
    op.drop_table("webhook_logs")
    op.drop_table("webhooks")
    op.drop_table("task_templates")
    op.drop_table("custom_field_values")
    op.drop_table("custom_fields")
    op.drop_table("task_dependencies")
