import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.onboarding import (
    OnboardingTemplate, OnboardingTemplateItem,
    OnboardingChecklist, OnboardingChecklistItem,
)
from app.models.user import User
from app.schemas.onboarding import (
    OnboardingTemplateCreate, OnboardingTemplateResponse,
    OnboardingChecklistCreate, OnboardingChecklistResponse,
)
from app.utils.auth import get_workspace_user

router = APIRouter(prefix="/workspaces/{workspace_id}/onboarding", tags=["onboarding"])


# --- Templates ---

@router.get("/templates", response_model=list[OnboardingTemplateResponse])
async def list_templates(
    workspace_id: uuid.UUID,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(OnboardingTemplate)
        .where(OnboardingTemplate.workspace_id == workspace_id)
        .options(selectinload(OnboardingTemplate.items))
        .order_by(OnboardingTemplate.name)
        .limit(limit).offset(offset)
    )
    return result.scalars().all()


@router.post("/templates", response_model=OnboardingTemplateResponse, status_code=201)
async def create_template(
    workspace_id: uuid.UUID,
    data: OnboardingTemplateCreate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    template = OnboardingTemplate(
        workspace_id=workspace_id,
        name=data.name,
        template_type=data.template_type,
        description=data.description,
    )
    db.add(template)
    await db.flush()

    for i, item_data in enumerate(data.items):
        item = OnboardingTemplateItem(
            template_id=template.id,
            title=item_data.title,
            description=item_data.description,
            sort_order=item_data.sort_order or i,
            default_assignee_role=item_data.default_assignee_role,
        )
        db.add(item)

    await db.commit()
    result = await db.execute(
        select(OnboardingTemplate)
        .where(OnboardingTemplate.id == template.id)
        .options(selectinload(OnboardingTemplate.items))
    )
    return result.scalar_one()


@router.delete("/templates/{template_id}", status_code=204)
async def delete_template(
    workspace_id: uuid.UUID,
    template_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(OnboardingTemplate).where(OnboardingTemplate.id == template_id, OnboardingTemplate.workspace_id == workspace_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    await db.delete(template)
    await db.commit()


# --- Checklists ---

@router.get("/checklists", response_model=list[OnboardingChecklistResponse])
async def list_checklists(
    workspace_id: uuid.UUID,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(OnboardingChecklist)
        .where(OnboardingChecklist.workspace_id == workspace_id)
        .options(selectinload(OnboardingChecklist.checklist_items))
        .order_by(OnboardingChecklist.created_at.desc())
        .limit(limit).offset(offset)
    )
    return result.scalars().all()


@router.post("/checklists", response_model=OnboardingChecklistResponse, status_code=201)
async def create_checklist(
    workspace_id: uuid.UUID,
    data: OnboardingChecklistCreate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    checklist = OnboardingChecklist(
        workspace_id=workspace_id,
        user_id=data.user_id,
        template_id=data.template_id,
        checklist_type=data.checklist_type,
        status="in_progress",
    )
    db.add(checklist)
    await db.flush()

    # If template provided, copy items from template
    if data.template_id:
        result = await db.execute(
            select(OnboardingTemplateItem)
            .where(OnboardingTemplateItem.template_id == data.template_id)
            .order_by(OnboardingTemplateItem.sort_order)
        )
        for tmpl_item in result.scalars().all():
            item = OnboardingChecklistItem(
                checklist_id=checklist.id,
                title=tmpl_item.title,
                description=tmpl_item.description,
                sort_order=tmpl_item.sort_order,
                completed=False,
            )
            db.add(item)

    await db.commit()
    result = await db.execute(
        select(OnboardingChecklist)
        .where(OnboardingChecklist.id == checklist.id)
        .options(selectinload(OnboardingChecklist.checklist_items))
    )
    return result.scalar_one()


@router.put("/checklists/{checklist_id}/items/{item_id}", response_model=OnboardingChecklistResponse)
async def toggle_checklist_item(
    workspace_id: uuid.UUID,
    checklist_id: uuid.UUID,
    item_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(OnboardingChecklistItem).where(OnboardingChecklistItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found")
    item.completed = not item.completed
    await db.commit()

    # Return full checklist
    result = await db.execute(
        select(OnboardingChecklist)
        .where(OnboardingChecklist.id == checklist_id)
        .options(selectinload(OnboardingChecklist.checklist_items))
    )
    checklist = result.scalar_one()

    # Auto-complete checklist if all items done
    all_done = all(i.completed for i in checklist.checklist_items)
    if all_done and checklist.status != "completed":
        checklist.status = "completed"
        await db.commit()
        await db.refresh(checklist)

    return checklist
