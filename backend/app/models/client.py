from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.workspace import Workspace


class Client(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "clients"

    name: Mapped[str] = mapped_column(String(255), nullable=False)

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )

    workspace: Mapped[Workspace] = relationship()
    projects: Mapped[list[Project]] = relationship(back_populates="client", cascade="all, delete-orphan")
