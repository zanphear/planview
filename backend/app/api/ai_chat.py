import json
import time
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import async_session, get_db
from app.models.ai_chat import AIChatMessage, AIChatSession
from app.models.analysis_report import AnalysisReport
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.ai_chat import (
    AIStatusResponse,
    ChatRequest,
    QuickReportRequest,
    SessionCreate,
    SessionListItem,
    SessionResponse,
)
from app.schemas.analysis_report import ANALYSIS_TYPES
from app.services import ai_service
from app.utils.auth import get_workspace_user

router = APIRouter(prefix="/workspaces/{workspace_id}/ai", tags=["ai"])


async def _get_workspace_name(db: AsyncSession, workspace_id: uuid.UUID) -> str:
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    ws = result.scalar_one_or_none()
    return ws.name if ws else "Planview"


@router.get("/status", response_model=AIStatusResponse)
async def ai_status(workspace_id: uuid.UUID):
    return AIStatusResponse(enabled=ai_service.is_enabled())


@router.get("/sessions", response_model=list[SessionListItem])
async def list_sessions(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AIChatSession)
        .where(AIChatSession.workspace_id == workspace_id, AIChatSession.user_id == current_user.id)
        .order_by(AIChatSession.updated_at.desc())
    )
    return result.scalars().all()


@router.post("/sessions", response_model=SessionResponse, status_code=201)
async def create_session(
    workspace_id: uuid.UUID,
    data: SessionCreate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    session = AIChatSession(
        workspace_id=workspace_id,
        user_id=current_user.id,
        title=data.title,
    )
    db.add(session)
    await db.commit()
    result = await db.execute(
        select(AIChatSession)
        .where(AIChatSession.id == session.id)
        .options(selectinload(AIChatSession.messages))
    )
    return result.scalar_one()


@router.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_session(
    workspace_id: uuid.UUID,
    session_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AIChatSession)
        .where(AIChatSession.id == session_id, AIChatSession.user_id == current_user.id)
        .options(selectinload(AIChatSession.messages))
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return session


@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(
    workspace_id: uuid.UUID,
    session_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AIChatSession)
        .where(AIChatSession.id == session_id, AIChatSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    await db.delete(session)
    await db.commit()


@router.post("/sessions/{session_id}/chat")
async def chat(
    workspace_id: uuid.UUID,
    session_id: uuid.UUID,
    data: ChatRequest,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AIChatSession)
        .where(AIChatSession.id == session_id, AIChatSession.user_id == current_user.id)
        .options(selectinload(AIChatSession.messages))
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    user_msg = AIChatMessage(session_id=session_id, role="user", content=data.message)
    db.add(user_msg)
    await db.commit()

    history = [{"role": m.role, "content": m.content} for m in session.messages]
    history.append({"role": "user", "content": data.message})

    workspace_name = await _get_workspace_name(db, workspace_id)

    async def generate():
        collected = []
        async for chunk in ai_service.stream_chat(history, workspace_name):
            collected.append(chunk)
            yield f"data: {json.dumps({'content': chunk})}\n\n"
        yield "data: [DONE]\n\n"
        full_response = "".join(collected)
        async with async_session() as save_db:
            msg = AIChatMessage(session_id=session_id, role="assistant", content=full_response)
            save_db.add(msg)
            await save_db.commit()

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.post("/quick-report")
async def quick_report(
    workspace_id: uuid.UUID,
    data: QuickReportRequest,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    workspace_name = await _get_workspace_name(db, workspace_id)
    analysis_type = ai_service.QUICK_REPORT_TYPE_MAP.get(data.report_type, data.report_type)
    type_info = ANALYSIS_TYPES.get(analysis_type, {})
    title = f"{type_info.get('label', data.report_type)}, {date.today().strftime('%d %b %Y')}"

    async def generate():
        start = time.time()
        collected = []
        async for chunk in ai_service.run_quick_report(
            data.report_type, workspace_name, db, workspace_id
        ):
            collected.append(chunk)
            yield f"data: {json.dumps({'content': chunk})}\n\n"

        full_content = "".join(collected)
        elapsed = round(time.time() - start, 1)

        async with async_session() as save_db:
            report = AnalysisReport(
                workspace_id=workspace_id,
                user_id=current_user.id,
                report_type=analysis_type,
                title=title,
                content=full_content,
                status="completed",
                generation_time_seconds=elapsed,
            )
            save_db.add(report)
            await save_db.commit()
            await save_db.refresh(report)
            yield f"data: {json.dumps({'report_id': str(report.id)})}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
