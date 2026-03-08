import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database import get_db
from app.models.person import PersonProfile, PersonDocument
from app.models.user import User
from app.schemas.person import (
    PersonProfileCreate,
    PersonProfileUpdate,
    PersonProfileResponse,
    PersonInsightsUpdate,
    PersonInsightsResponse,
    PersonDocumentResponse,
    OrgChartNode,
)
from app.utils.auth import get_workspace_user

router = APIRouter(prefix="/workspaces/{workspace_id}/people", tags=["people"])

VALID_CONTRACT_TYPES = {"permanent", "fixed_term", "contractor", "agency"}
VALID_DOCUMENT_TYPES = {"cv", "contract", "certification", "visa", "other"}


def _profile_to_response(profile: PersonProfile) -> PersonProfileResponse:
    data = PersonProfileResponse.model_validate(profile)
    if profile.user:
        data.user_name = profile.user.name
        data.user_email = profile.user.email
        data.user_initials = profile.user.initials
        data.user_colour = profile.user.colour
        data.user_avatar_url = profile.user.avatar_url
    if profile.manager:
        data.manager_name = profile.manager.name
    return data


async def _get_profile(db: AsyncSession, workspace_id: uuid.UUID, user_id: uuid.UUID) -> PersonProfile:
    result = await db.execute(
        select(PersonProfile)
        .where(PersonProfile.user_id == user_id, PersonProfile.workspace_id == workspace_id)
        .options(
            selectinload(PersonProfile.user),
            selectinload(PersonProfile.manager),
            selectinload(PersonProfile.documents),
        )
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Person profile not found")
    return profile


async def _is_manager_of(db: AsyncSession, workspace_id: uuid.UUID, manager_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    """Check if manager_id is the direct manager of user_id."""
    result = await db.execute(
        select(PersonProfile.manager_id)
        .where(PersonProfile.user_id == user_id, PersonProfile.workspace_id == workspace_id)
    )
    row = result.scalar_one_or_none()
    return row == manager_id


# --- Profile CRUD ---

@router.get("", response_model=list[PersonProfileResponse])
async def list_people(
    workspace_id: uuid.UUID,
    department: str | None = Query(None),
    manager_id: uuid.UUID | None = Query(None),
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(PersonProfile)
        .where(PersonProfile.workspace_id == workspace_id)
        .options(
            selectinload(PersonProfile.user),
            selectinload(PersonProfile.manager),
            selectinload(PersonProfile.documents),
        )
        .order_by(PersonProfile.created_at)
    )
    if department:
        query = query.where(PersonProfile.department == department)
    if manager_id:
        query = query.where(PersonProfile.manager_id == manager_id)

    result = await db.execute(query)
    profiles = result.scalars().all()
    return [_profile_to_response(p) for p in profiles]


# --- Org Chart (must be before /{user_id} routes) ---

@router.get("/org-chart", response_model=list[OrgChartNode])
async def get_org_chart(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PersonProfile)
        .where(PersonProfile.workspace_id == workspace_id)
        .options(selectinload(PersonProfile.user))
    )
    profiles = result.scalars().all()

    # Build lookup
    nodes: dict[uuid.UUID, OrgChartNode] = {}
    for p in profiles:
        nodes[p.user_id] = OrgChartNode(
            user_id=p.user_id,
            name=p.user.name if p.user else "Unknown",
            job_title=p.job_title,
            department=p.department,
            avatar_url=p.user.avatar_url if p.user else None,
            initials=p.user.initials if p.user else None,
            colour=p.user.colour if p.user else "#4186E0",
        )

    # Build tree
    roots: list[OrgChartNode] = []
    for p in profiles:
        node = nodes[p.user_id]
        if p.manager_id and p.manager_id in nodes:
            nodes[p.manager_id].children.append(node)
        else:
            roots.append(node)

    return roots


@router.post("/{user_id}", response_model=PersonProfileResponse, status_code=201)
async def create_profile(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    data: PersonProfileCreate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    # Check user exists in this workspace
    user_result = await db.execute(
        select(User).where(User.id == user_id, User.workspace_id == workspace_id)
    )
    if not user_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="User not found in workspace")

    # Check profile doesn't already exist
    existing = await db.execute(
        select(PersonProfile).where(PersonProfile.user_id == user_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Profile already exists for this user")

    if data.contract_type and data.contract_type not in VALID_CONTRACT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid contract type. Must be one of: {', '.join(VALID_CONTRACT_TYPES)}")

    profile = PersonProfile(
        user_id=user_id,
        workspace_id=workspace_id,
        **data.model_dump(exclude_unset=True),
    )
    db.add(profile)
    await db.commit()

    return _profile_to_response(await _get_profile(db, workspace_id, user_id))


@router.get("/{user_id}", response_model=PersonProfileResponse)
async def get_profile(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    profile = await _get_profile(db, workspace_id, user_id)
    return _profile_to_response(profile)


@router.put("/{user_id}", response_model=PersonProfileResponse)
async def update_profile(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    data: PersonProfileUpdate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    profile = await _get_profile(db, workspace_id, user_id)

    updates = data.model_dump(exclude_unset=True)
    if "contract_type" in updates and updates["contract_type"] and updates["contract_type"] not in VALID_CONTRACT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid contract type. Must be one of: {', '.join(VALID_CONTRACT_TYPES)}")

    for field, value in updates.items():
        setattr(profile, field, value)

    await db.commit()
    return _profile_to_response(await _get_profile(db, workspace_id, user_id))


# --- Personal Insights (manager-only) ---

@router.get("/{user_id}/insights", response_model=PersonInsightsResponse)
async def get_insights(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    # Only the person's manager or admins/owners can view insights
    is_mgr = await _is_manager_of(db, workspace_id, current_user.id, user_id)
    if not is_mgr and current_user.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Only the person's manager or admins can view personal insights")

    profile = await _get_profile(db, workspace_id, user_id)
    return PersonInsightsResponse.model_validate(profile)


@router.put("/{user_id}/insights", response_model=PersonInsightsResponse)
async def update_insights(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    data: PersonInsightsUpdate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    is_mgr = await _is_manager_of(db, workspace_id, current_user.id, user_id)
    if not is_mgr and current_user.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Only the person's manager or admins can edit personal insights")

    profile = await _get_profile(db, workspace_id, user_id)
    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(profile, field, value)

    await db.commit()
    return PersonInsightsResponse.model_validate(await _get_profile(db, workspace_id, user_id))


# --- Avatar Upload ---

@router.post("/{user_id}/avatar", response_model=PersonProfileResponse)
async def upload_avatar(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    # Only the user themselves, their manager, or admins can upload
    if current_user.id != user_id and current_user.role not in ("owner", "admin"):
        is_mgr = await _is_manager_of(db, workspace_id, current_user.id, user_id)
        if not is_mgr:
            raise HTTPException(status_code=403, detail="Not authorised to upload avatar for this user")

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
        raise HTTPException(status_code=400, detail="Avatar must be JPG, PNG, or WebP")

    content = await file.read()
    max_bytes = 5 * 1024 * 1024  # 5MB
    if len(content) > max_bytes:
        raise HTTPException(status_code=413, detail="Avatar file exceeds 5MB limit")

    avatar_dir = os.path.join(settings.upload_dir, "avatars")
    os.makedirs(avatar_dir, exist_ok=True)
    stored_name = f"{user_id}{ext}"
    file_path = os.path.join(avatar_dir, stored_name)

    with open(file_path, "wb") as f:
        f.write(content)

    # Update user's avatar_url
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if user:
        user.avatar_url = f"/api/v1/workspaces/{workspace_id}/people/{user_id}/avatar/image"
        await db.commit()

    # Ensure profile exists
    profile = await _get_profile(db, workspace_id, user_id)
    return _profile_to_response(profile)


@router.get("/{user_id}/avatar/image")
async def get_avatar_image(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    avatar_dir = os.path.join(settings.upload_dir, "avatars")
    for ext in [".jpg", ".jpeg", ".png", ".webp"]:
        path = os.path.join(avatar_dir, f"{user_id}{ext}")
        if os.path.exists(path):
            mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}
            return FileResponse(path, media_type=mime_map.get(ext, "image/jpeg"))
    raise HTTPException(status_code=404, detail="Avatar not found")


# --- Person Documents ---

@router.get("/{user_id}/documents", response_model=list[PersonDocumentResponse])
async def list_documents(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    document_type: str | None = Query(None),
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    profile = await _get_profile(db, workspace_id, user_id)
    query = (
        select(PersonDocument)
        .where(PersonDocument.profile_id == profile.id)
        .order_by(PersonDocument.created_at.desc())
    )
    if document_type:
        query = query.where(PersonDocument.document_type == document_type)
    result = await db.execute(query)
    return result.scalars().all()


ALLOWED_DOC_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".gif", ".webp",
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".txt", ".csv", ".md",
    ".zip", ".tar", ".gz",
}


@router.post("/{user_id}/documents", response_model=PersonDocumentResponse, status_code=201)
async def upload_document(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    document_type: str = Query(..., description="cv, contract, certification, visa, other"),
    file: UploadFile = File(...),
    expiry_date: str | None = Query(None),
    notes: str | None = Query(None),
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    if document_type not in VALID_DOCUMENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid document type. Must be one of: {', '.join(VALID_DOCUMENT_TYPES)}")

    profile = await _get_profile(db, workspace_id, user_id)

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext and ext not in ALLOWED_DOC_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type {ext} is not supported")

    content = await file.read()
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(status_code=413, detail=f"File exceeds {settings.max_upload_size_mb}MB limit")

    doc_dir = os.path.join(settings.upload_dir, "people", str(user_id))
    os.makedirs(doc_dir, exist_ok=True)
    file_id = str(uuid.uuid4())
    stored_name = f"{file_id}{ext}"
    file_path = os.path.join(doc_dir, stored_name)

    with open(file_path, "wb") as f:
        f.write(content)

    from datetime import date as date_type
    parsed_expiry = None
    if expiry_date:
        try:
            parsed_expiry = date_type.fromisoformat(expiry_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid expiry_date format. Use YYYY-MM-DD")

    doc = PersonDocument(
        profile_id=profile.id,
        workspace_id=workspace_id,
        document_type=document_type,
        filename=file.filename or "untitled",
        file_path=file_path,
        file_size=len(content),
        mime_type=file.content_type or "application/octet-stream",
        expiry_date=parsed_expiry,
        uploaded_by=current_user.id,
        notes=notes,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


@router.get("/{user_id}/documents/{doc_id}/download")
async def download_document(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    doc_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PersonDocument).where(
            PersonDocument.id == doc_id,
            PersonDocument.workspace_id == workspace_id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(
        doc.file_path,
        filename=doc.filename,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{doc.filename}"'},
    )


@router.delete("/{user_id}/documents/{doc_id}", status_code=204)
async def delete_document(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    doc_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PersonDocument).where(PersonDocument.id == doc_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)

    await db.delete(doc)
    await db.commit()
