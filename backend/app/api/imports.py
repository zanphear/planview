import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.services.import_service import import_tasks_csv, import_tasks_json, import_asana_csv
from app.utils.auth import get_current_user

router = APIRouter(
    prefix="/workspaces/{workspace_id}/import",
    tags=["import"],
)


@router.post("/tasks")
async def import_tasks(
    workspace_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    content = (await file.read()).decode("utf-8")

    if file.filename.endswith(".csv"):
        # Detect Asana CSV by checking for Asana-specific headers
        first_line = content.split("\n")[0] if content else ""
        if "Section/Column" in first_line or "Task ID" in first_line:
            tasks = await import_asana_csv(db, workspace_id, content)
            return {"imported": len(tasks), "message": f"Imported {len(tasks)} tasks from Asana"}
        tasks = await import_tasks_csv(db, workspace_id, content)
    elif file.filename.endswith(".json"):
        tasks = await import_tasks_json(db, workspace_id, content)
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type. Use .csv or .json")

    return {"imported": len(tasks), "message": f"Successfully imported {len(tasks)} tasks"}
