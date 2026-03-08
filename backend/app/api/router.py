import os

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.config import settings
from app.api import (
    activity, ai_chat, analysis_reports, attachments, auth, candidates, clients,
    comments, competencies, compliance_api, custom_fields, dependencies,
    development_api, early_talent, export, feedback, imports, leave_api, lookups, time_entries,
    meetings, milestones, notifications, objectives, onboarding_api, people,
    people_stats, projects, reviews_api, rotas, sharing, stats, tags, tasks,
    teams, templates, time_off, timeline, users, webhooks, wellbeing_api,
    workspaces,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(workspaces.router)
api_router.include_router(users.router)
api_router.include_router(teams.router)
api_router.include_router(clients.router)
api_router.include_router(projects.router)
api_router.include_router(tasks.router)
api_router.include_router(milestones.router)
api_router.include_router(timeline.router)
api_router.include_router(comments.router)
api_router.include_router(notifications.router)
api_router.include_router(attachments.router)
api_router.include_router(export.router)
api_router.include_router(imports.router)
api_router.include_router(sharing.router)
api_router.include_router(time_off.router)
api_router.include_router(tags.router)
api_router.include_router(stats.router)
api_router.include_router(activity.router)
api_router.include_router(dependencies.router)
api_router.include_router(custom_fields.router)
api_router.include_router(templates.router)
api_router.include_router(webhooks.router)
api_router.include_router(rotas.router)
api_router.include_router(people.router)
api_router.include_router(meetings.router)
api_router.include_router(objectives.router)
api_router.include_router(compliance_api.router)
api_router.include_router(competencies.router)
api_router.include_router(leave_api.router)
api_router.include_router(candidates.router)
api_router.include_router(development_api.router)
api_router.include_router(reviews_api.router)
api_router.include_router(wellbeing_api.router)
api_router.include_router(onboarding_api.router)
api_router.include_router(people_stats.router)
api_router.include_router(ai_chat.router)
api_router.include_router(analysis_reports.router)
api_router.include_router(early_talent.router)
api_router.include_router(lookups.router)
api_router.include_router(feedback.router)
api_router.include_router(time_entries.router)


@api_router.get("/avatars/{filename}", tags=["avatars"])
async def serve_avatar(filename: str):
    safe_name = os.path.basename(filename)
    if safe_name != filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    avatar_dir = os.path.realpath(os.path.join(settings.upload_dir, "avatars"))
    file_path = os.path.realpath(os.path.join(avatar_dir, safe_name))
    if not file_path.startswith(avatar_dir):
        raise HTTPException(status_code=400, detail="Invalid filename")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Avatar not found")
    return FileResponse(file_path)
