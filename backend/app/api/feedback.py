import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.feedback import Feedback
from app.models.user import User
from app.schemas.feedback import FeedbackCreate, FeedbackUpdate, FeedbackResponse
from app.utils.auth import get_workspace_user

router = APIRouter(prefix="/workspaces/{workspace_id}/feedback", tags=["feedback"])


def _to_response(fb: Feedback, user: User | None = None) -> FeedbackResponse:
    data = FeedbackResponse.model_validate(fb)
    if user:
        data.user_name = user.name
        data.user_email = user.email
    return data


@router.post("", response_model=FeedbackResponse, status_code=201)
async def create_feedback(
    workspace_id: uuid.UUID,
    data: FeedbackCreate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    if data.type not in ("bug", "feature"):
        raise HTTPException(status_code=400, detail="Type must be 'bug' or 'feature'")
    fb = Feedback(
        workspace_id=workspace_id,
        user_id=current_user.id,
        type=data.type,
        title=data.title,
        description=data.description,
    )
    db.add(fb)
    await db.commit()
    await db.refresh(fb)
    return _to_response(fb, current_user)


@router.get("", response_model=list[FeedbackResponse])
async def list_feedback(
    workspace_id: uuid.UUID,
    type: str | None = None,
    status: str | None = None,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Feedback).where(Feedback.workspace_id == workspace_id)
    if type:
        query = query.where(Feedback.type == type)
    if status:
        query = query.where(Feedback.status == status)
    query = query.order_by(Feedback.created_at.desc())
    result = await db.execute(query)
    items = result.scalars().all()

    user_ids = {fb.user_id for fb in items}
    users_result = await db.execute(select(User).where(User.id.in_(user_ids)))
    users_map = {u.id: u for u in users_result.scalars().all()}

    return [_to_response(fb, users_map.get(fb.user_id)) for fb in items]


@router.get("/{feedback_id}", response_model=FeedbackResponse)
async def get_feedback(
    workspace_id: uuid.UUID,
    feedback_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Feedback).where(Feedback.id == feedback_id, Feedback.workspace_id == workspace_id)
    )
    fb = result.scalar_one_or_none()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback not found")
    user_result = await db.execute(select(User).where(User.id == fb.user_id))
    user = user_result.scalar_one_or_none()
    return _to_response(fb, user)


@router.put("/{feedback_id}", response_model=FeedbackResponse)
async def update_feedback(
    workspace_id: uuid.UUID,
    feedback_id: uuid.UUID,
    data: FeedbackUpdate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Feedback).where(Feedback.id == feedback_id, Feedback.workspace_id == workspace_id)
    )
    fb = result.scalar_one_or_none()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(fb, field, value)
    await db.commit()
    await db.refresh(fb)
    user_result = await db.execute(select(User).where(User.id == fb.user_id))
    user = user_result.scalar_one_or_none()
    return _to_response(fb, user)


@router.delete("/{feedback_id}", status_code=204)
async def delete_feedback(
    workspace_id: uuid.UUID,
    feedback_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Feedback).where(Feedback.id == feedback_id, Feedback.workspace_id == workspace_id)
    )
    fb = result.scalar_one_or_none()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback not found")
    await db.delete(fb)
    await db.commit()
