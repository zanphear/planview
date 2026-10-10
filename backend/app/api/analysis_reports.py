import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.analysis_report import AnalysisReport
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.analysis_report import (
    ANALYSIS_TYPES,
    AnalysisReportListItem,
    AnalysisReportResponse,
    AnalysisTypeResponse,
    GenerateReportRequest,
)
from app.schemas.workspace import DEFAULT_MODULES
from app.services.report_queue import enqueue_report
from app.utils.auth import get_workspace_user

router = APIRouter(prefix="/workspaces/{workspace_id}/analysis", tags=["analysis"])


def _get_enabled_types(enabled_modules: dict[str, bool] | None) -> list[AnalysisTypeResponse]:
    modules = enabled_modules or {}
    types = []
    for key, info in ANALYSIS_TYPES.items():
        required = info.get("modules", [])
        if required and not all(modules.get(m, DEFAULT_MODULES.get(m, False)) for m in required):
            continue
        types.append(AnalysisTypeResponse(key=key, label=info["label"], description=info["description"], icon=info["icon"]))
    return types


@router.get("/types", response_model=list[AnalysisTypeResponse])
async def list_types(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    ws = result.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return _get_enabled_types(ws.enabled_modules)


@router.post("/generate", response_model=AnalysisReportResponse, status_code=202)
async def generate_report(
    workspace_id: uuid.UUID,
    data: GenerateReportRequest,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    if data.report_type not in ANALYSIS_TYPES:
        raise HTTPException(status_code=400, detail=f"Unknown report type: {data.report_type}")

    if not settings.ai_model_url:
        raise HTTPException(status_code=400, detail="AI is not configured. Set AI_MODEL_URL in your environment.")

    type_info = ANALYSIS_TYPES[data.report_type]
    title = f"{type_info['label']}, {date.today().strftime('%d %b %Y')}"

    report = AnalysisReport(
        workspace_id=workspace_id,
        user_id=current_user.id,
        report_type=data.report_type,
        title=title,
        status="queued",
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    enqueue_report(report.id, workspace_id, data.report_type)
    return report


@router.get("/reports", response_model=list[AnalysisReportListItem])
async def list_reports(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AnalysisReport)
        .where(AnalysisReport.workspace_id == workspace_id, AnalysisReport.user_id == current_user.id)
        .order_by(AnalysisReport.created_at.desc())
    )
    return result.scalars().all()


@router.get("/reports/{report_id}", response_model=AnalysisReportResponse)
async def get_report(
    workspace_id: uuid.UUID,
    report_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AnalysisReport)
        .where(AnalysisReport.id == report_id, AnalysisReport.user_id == current_user.id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.delete("/reports/{report_id}", status_code=204)
async def delete_report(
    workspace_id: uuid.UUID,
    report_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AnalysisReport)
        .where(AnalysisReport.id == report_id, AnalysisReport.user_id == current_user.id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    await db.delete(report)
    await db.commit()
