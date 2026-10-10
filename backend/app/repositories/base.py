"""Repository layer base (ADR 0005).

All DB access for an aggregate lives in its repository; routers and services never
run `select`/`add`/`delete` directly. `WorkspaceRepository` bakes in the tenant
scope so every read and write is filtered by `workspace_id` by construction
(forbidden-2). Repositories take the `AsyncSession` via `Depends` and never commit;
the unit of work (commit) is owned by the service or route boundary.
"""

import uuid
from typing import Generic, TypeVar

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

ModelT = TypeVar("ModelT")


class WorkspaceRepository(Generic[ModelT]):
    """Base for workspace-scoped aggregates. Subclasses set `model`."""

    model: type[ModelT]

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get(self, workspace_id: uuid.UUID, obj_id: uuid.UUID) -> ModelT | None:
        result = await self.db.execute(
            select(self.model).where(
                self.model.id == obj_id,  # type: ignore[attr-defined]
                self.model.workspace_id == workspace_id,  # type: ignore[attr-defined]
            )
        )
        return result.scalar_one_or_none()

    async def list(self, workspace_id: uuid.UUID) -> list[ModelT]:
        result = await self.db.execute(
            select(self.model).where(
                self.model.workspace_id == workspace_id  # type: ignore[attr-defined]
            )
        )
        return list(result.scalars().all())

    def add(self, obj: ModelT) -> ModelT:
        self.db.add(obj)
        return obj

    async def delete(self, obj: ModelT) -> None:
        await self.db.delete(obj)
