"""Add performance indexes.

Revision ID: 006
Revises: 005
"""
from alembic import op
from sqlalchemy import text

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    indexes = [
        "CREATE INDEX IF NOT EXISTS ix_task_workspace_status ON tasks (workspace_id, status)",
        "CREATE INDEX IF NOT EXISTS ix_task_parent_id ON tasks (parent_id)",
        "CREATE INDEX IF NOT EXISTS ix_task_sort_order ON tasks (project_id, sort_order)",
        "CREATE INDEX IF NOT EXISTS ix_task_recurring ON tasks (workspace_id) WHERE is_recurring = true",
        "CREATE INDEX IF NOT EXISTS ix_user_workspace ON users (workspace_id)",
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_user_email ON users (email)",
        "CREATE INDEX IF NOT EXISTS ix_comment_task_created ON comments (task_id, created_at)",
        "CREATE INDEX IF NOT EXISTS ix_notification_user_unread ON notifications (user_id, workspace_id, is_read, created_at)",
        "CREATE INDEX IF NOT EXISTS ix_activity_workspace_created ON activities (workspace_id, created_at)",
        "CREATE INDEX IF NOT EXISTS ix_checklist_task_sort ON checklists (task_id, sort_order)",
        "CREATE INDEX IF NOT EXISTS ix_attachment_task ON attachments (task_id)",
        "CREATE INDEX IF NOT EXISTS ix_project_workspace ON projects (workspace_id)",
        "CREATE INDEX IF NOT EXISTS ix_tag_project ON tags (project_id)",
        "CREATE INDEX IF NOT EXISTS ix_segment_project ON segments (project_id)",
    ]
    for sql in indexes:
        conn.execute(text(sql))


def downgrade() -> None:
    indexes = [
        "ix_segment_project", "ix_tag_project", "ix_project_workspace",
        "ix_attachment_task", "ix_checklist_task_sort", "ix_activity_workspace_created",
        "ix_notification_user_unread", "ix_comment_task_created",
        "ix_user_email", "ix_user_workspace",
        "ix_task_recurring", "ix_task_sort_order", "ix_task_parent_id",
        "ix_task_workspace_status",
    ]
    for name in indexes:
        op.drop_index(name)
