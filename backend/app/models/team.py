from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.workspace import Workspace

team_members = Table(
    "team_members",
    Base.metadata,
    Column("team_id", UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("sort_order", Integer, server_default="0"),
)


class Team(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "teams"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_favourite: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )

    workspace: Mapped[Workspace] = relationship(back_populates="teams")
    members: Mapped[list[User]] = relationship(secondary=team_members, lazy="selectin")
