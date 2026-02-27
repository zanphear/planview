"""add parent_id to tasks for subtask support

Revision ID: 005
Revises: 004
Create Date: 2026-02-27
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tasks", sa.Column("parent_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key("fk_task_parent", "tasks", "tasks", ["parent_id"], ["id"], ondelete="CASCADE")
    op.create_index("ix_task_parent_id", "tasks", ["parent_id"])


def downgrade() -> None:
    op.drop_index("ix_task_parent_id", table_name="tasks")
    op.drop_constraint("fk_task_parent", "tasks", type_="foreignkey")
    op.drop_column("tasks", "parent_id")
