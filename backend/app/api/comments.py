import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.comment import Comment
from app.models.task import Task
from app.models.user import User
from app.schemas.comment import CommentCreate, CommentResponse, CommentUpdate
from app.services.notification_service import notify_comment_added
from app.utils.auth import get_current_user
from app.websocket.events import emit_event

router = APIRouter(
    prefix="/workspaces/{workspace_id}/tasks/{task_id}/comments",
    tags=["comments"],
)


@router.get("", response_model=list[CommentResponse])
async def list_comments(
    workspace_id: uuid.UUID,
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Comment)
        .where(Comment.task_id == task_id)
        .options(selectinload(Comment.user))
        .order_by(Comment.created_at)
    )
    return result.scalars().all()


@router.post("", response_model=CommentResponse, status_code=201)
async def create_comment(
    workspace_id: uuid.UUID,
    task_id: uuid.UUID,
    data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    comment = Comment(body=data.body, task_id=task_id, user_id=current_user.id)
    db.add(comment)
    await db.commit()

    # Re-fetch with user loaded
    result = await db.execute(
        select(Comment)
        .where(Comment.id == comment.id)
        .options(selectinload(Comment.user))
    )
    comment = result.scalar_one()

    # Broadcast WebSocket event
    await emit_event(str(workspace_id), "comment.created", {
        "task_id": str(task_id),
        "comment_id": str(comment.id),
        "user_name": current_user.name,
    })

    # Notify task assignees
    task_result = await db.execute(
        select(Task).where(Task.id == task_id).options(selectinload(Task.assignees))
    )
    task_obj = task_result.scalar_one_or_none()
    if task_obj:
        assignee_ids = [a.id for a in task_obj.assignees]
        await notify_comment_added(
            db,
            workspace_id=workspace_id,
            task_id=task_id,
            task_name=task_obj.name,
            commenter_id=current_user.id,
            commenter_name=current_user.name,
            notify_user_ids=assignee_ids,
        )
        await db.commit()

    return comment


@router.put("/{comment_id}", response_model=CommentResponse)
async def update_comment(
    workspace_id: uuid.UUID,
    task_id: uuid.UUID,
    comment_id: uuid.UUID,
    data: CommentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Comment)
        .where(Comment.id == comment_id, Comment.task_id == task_id)
        .options(selectinload(Comment.user))
    )
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Can only edit your own comments")

    comment.body = data.body
    await db.commit()
    await db.refresh(comment)
    return comment


@router.delete("/{comment_id}", status_code=204)
async def delete_comment(
    workspace_id: uuid.UUID,
    task_id: uuid.UUID,
    comment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Comment).where(Comment.id == comment_id, Comment.task_id == task_id)
    )
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Can only delete your own comments")

    await db.delete(comment)
    await db.commit()
