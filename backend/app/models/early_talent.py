from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.user import User


class EarlyTalentProgramme(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "early_talent_programmes"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    programme_type: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_date: Mapped[str] = mapped_column(Date, nullable=False)
    end_date: Mapped[str | None] = mapped_column(Date, nullable=True)
    duration_months: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)
    max_cohort_size: Mapped[int | None] = mapped_column(Integer, nullable=True)

    cohorts: Mapped[list[EarlyTalentCohort]] = relationship(
        back_populates="programme", cascade="all, delete-orphan", lazy="selectin"
    )
    participants: Mapped[list[EarlyTalentParticipant]] = relationship(
        back_populates="programme", cascade="all, delete-orphan", lazy="selectin"
    )
    rotations: Mapped[list[EarlyTalentRotation]] = relationship(
        back_populates="programme", cascade="all, delete-orphan", lazy="selectin"
    )


class EarlyTalentCohort(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "early_talent_cohorts"

    programme_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("early_talent_programmes.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    intake_date: Mapped[str] = mapped_column(Date, nullable=False)
    expected_end_date: Mapped[str | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="forming", nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    programme: Mapped[EarlyTalentProgramme] = relationship(back_populates="cohorts")
    participants: Mapped[list[EarlyTalentParticipant]] = relationship(
        back_populates="cohort", lazy="selectin"
    )


class EarlyTalentParticipant(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "early_talent_participants"

    programme_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("early_talent_programmes.id", ondelete="CASCADE"), nullable=False
    )
    cohort_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("early_talent_cohorts.id", ondelete="SET NULL"), nullable=True
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    mentor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    buddy_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    development_plan_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("development_plans.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(20), default="enrolled", nullable=False)
    qualification_target: Mapped[str | None] = mapped_column(String(500), nullable=True)
    university: Mapped[str | None] = mapped_column(String(255), nullable=True)
    qualification_level: Mapped[str | None] = mapped_column(String(50), nullable=True)
    qualification_progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    start_date: Mapped[str | None] = mapped_column(Date, nullable=True)
    expected_end_date: Mapped[str | None] = mapped_column(Date, nullable=True)
    actual_end_date: Mapped[str | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    programme: Mapped[EarlyTalentProgramme] = relationship(back_populates="participants")
    cohort: Mapped[EarlyTalentCohort | None] = relationship(back_populates="participants")
    user: Mapped[User] = relationship(foreign_keys=[user_id])
    mentor: Mapped[User | None] = relationship(foreign_keys=[mentor_id])
    buddy: Mapped[User | None] = relationship(foreign_keys=[buddy_id])
    milestones: Mapped[list[EarlyTalentMilestone]] = relationship(
        back_populates="participant", cascade="all, delete-orphan", lazy="selectin"
    )
    rotation_assignments: Mapped[list[EarlyTalentRotationAssignment]] = relationship(
        back_populates="participant", cascade="all, delete-orphan", lazy="selectin"
    )


class EarlyTalentRotation(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "early_talent_rotations"

    programme_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("early_talent_programmes.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[str | None] = mapped_column(String(255), nullable=True)
    duration_weeks: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    required_competencies: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    programme: Mapped[EarlyTalentProgramme] = relationship(back_populates="rotations")


class EarlyTalentRotationAssignment(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "early_talent_rotation_assignments"

    participant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("early_talent_participants.id", ondelete="CASCADE"), nullable=False
    )
    rotation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("early_talent_rotations.id", ondelete="CASCADE"), nullable=False
    )
    supervisor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    start_date: Mapped[str] = mapped_column(Date, nullable=False)
    end_date: Mapped[str | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="scheduled", nullable=False)
    assessment: Mapped[str | None] = mapped_column(Text, nullable=True)
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)

    participant: Mapped[EarlyTalentParticipant] = relationship(back_populates="rotation_assignments")
    rotation: Mapped[EarlyTalentRotation] = relationship()
    supervisor: Mapped[User | None] = relationship(foreign_keys=[supervisor_id])


class EarlyTalentMilestone(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "early_talent_milestones"

    participant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("early_talent_participants.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    milestone_type: Mapped[str] = mapped_column(String(50), nullable=False)
    target_date: Mapped[str | None] = mapped_column(Date, nullable=True)
    completed_date: Mapped[str | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    evidence: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    participant: Mapped[EarlyTalentParticipant] = relationship(back_populates="milestones")
