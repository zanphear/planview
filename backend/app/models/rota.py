from __future__ import annotations

import uuid
from datetime import date, time
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, ForeignKey, String, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.workspace import Workspace


class Rota(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "rotas"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    rota_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="callout",
    )  # callout | weekday | 24hour
    start_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    end_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    include_weekends: Mapped[bool] = mapped_column(Boolean, default=False)
    colour: Mapped[str] = mapped_column(String(7), default="#8A00E5")
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True,
    )

    entries: Mapped[list[RotaEntry]] = relationship(
        back_populates="rota", cascade="all, delete-orphan", lazy="selectin",
    )
    workspace: Mapped[Workspace] = relationship()


class RotaEntry(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "rota_entries"

    rota_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rotas.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False,
    )
    date_from: Mapped[date] = mapped_column(Date, nullable=False)
    date_to: Mapped[date] = mapped_column(Date, nullable=False)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)

    rota: Mapped[Rota] = relationship(back_populates="entries")
    user: Mapped[User] = relationship()
