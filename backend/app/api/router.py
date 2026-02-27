from fastapi import APIRouter

from app.api import (
    activity, attachments, auth, clients, comments, export, imports, milestones,
    notifications, projects, sharing, stats, tags, tasks, teams, time_off,
    timeline, users, workspaces,
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
