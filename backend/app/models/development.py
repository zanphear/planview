from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Date, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.user import User


class CareerPathway(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "career_pathways"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    levels: Mapped[list | None] = mapped_column(JSONB, nullable=True)


class DevelopmentPlan(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "development_plans"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    review_period_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("review_periods.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)  # draft, active, completed, archived
    career_aspiration: Mapped[str | None] = mapped_column(Text, nullable=True)
    horizon_years: Mapped[int | None] = mapped_column(Integer, nullable=True)
    start_date: Mapped[str | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[str | None] = mapped_column(Date, nullable=True)
    career_pathway_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("career_pathways.id", ondelete="SET NULL"), nullable=True
    )
    overall_progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_budget: Mapped[float | None] = mapped_column(Float, nullable=True)

    user: Mapped[User] = relationship(foreign_keys=[user_id])
    career_pathway: Mapped[CareerPathway | None] = relationship(foreign_keys=[career_pathway_id])
    goals: Mapped[list[DevelopmentGoal]] = relationship(
        back_populates="plan", cascade="all, delete-orphan", lazy="selectin"
    )
    milestones: Mapped[list[DevelopmentMilestone]] = relationship(
        back_populates="plan", cascade="all, delete-orphan", lazy="selectin"
    )
    checkpoints: Mapped[list[DevelopmentCheckpoint]] = relationship(
        back_populates="plan", cascade="all, delete-orphan", lazy="selectin"
    )


class DevelopmentGoal(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "development_goals"

    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("development_plans.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    goal_type: Mapped[str | None] = mapped_column(String(50), nullable=True)  # training, qualification, experience, mentoring, project
    linked_competency_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("competencies.id", ondelete="SET NULL"), nullable=True
    )
    target_date: Mapped[str | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="not_started", nullable=False)  # not_started, in_progress, completed
    evidence: Mapped[str | None] = mapped_column(Text, nullable=True)
    cost_estimate: Mapped[float | None] = mapped_column(Float, nullable=True)
    priority: Mapped[str | None] = mapped_column(String(20), nullable=True)  # low, medium, high, critical
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    linked_objective_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("objectives.id", ondelete="SET NULL"), nullable=True
    )
    actual_cost: Mapped[float | None] = mapped_column(Float, nullable=True)
    completed_date: Mapped[str | None] = mapped_column(Date, nullable=True)

    plan: Mapped[DevelopmentPlan] = relationship(back_populates="goals")


class DevelopmentMilestone(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "development_milestones"

    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("development_plans.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_date: Mapped[str] = mapped_column(Date, nullable=False)
    completed_date: Mapped[str | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)  # pending, in_progress, completed, missed
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    plan: Mapped[DevelopmentPlan] = relationship(back_populates="milestones")


class DevelopmentCheckpoint(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "development_checkpoints"

    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("development_plans.id", ondelete="CASCADE"), nullable=False
    )
    checkpoint_date: Mapped[str] = mapped_column(Date, nullable=False)
    reviewer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    overall_assessment: Mapped[str] = mapped_column(String(20), nullable=False)  # on_track, at_risk, off_track, exceeding
    actions: Mapped[list | None] = mapped_column(JSONB, nullable=True)

    plan: Mapped[DevelopmentPlan] = relationship(back_populates="checkpoints")
    reviewer: Mapped[User | None] = relationship(foreign_keys=[reviewer_id])
