from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.project import Project


class Tag(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "tags"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    colour: Mapped[str] = mapped_column(String(7), server_default=text("'#8E8E8E'"), nullable=False)

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )

    project: Mapped[Project] = relationship(back_populates="tags")
