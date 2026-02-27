"""
Seed script — populates the database with realistic sample data.

Usage:
    cd backend
    python -m seed
"""
import asyncio
import uuid
from datetime import date, timedelta

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.models import (
    Base, Workspace, User, Team, Client, Project, Segment, Tag,
    Task, Checklist, Comment, Milestone, team_members, task_assignees,
)
from app.utils.auth import hash_password


async def seed():
    engine = create_async_engine(settings.database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        # Check if already seeded
        result = await db.execute(text("SELECT count(*) FROM workspaces"))
        if result.scalar_one() > 0:
            print("Database already has data — skipping seed.")
            return

        print("Seeding database...")

        # Workspace
        ws = Workspace(name="Acme Corp")
        db.add(ws)
        await db.flush()

        # Users
        users_data = [
            ("Alice Johnson", "alice@example.com", "#4186E0", "AJ"),
            ("Bob Smith", "bob@example.com", "#E44332", "BS"),
            ("Charlie Brown", "charlie@example.com", "#5CBF4D", "CB"),
            ("Diana Prince", "diana@example.com", "#9B59B6", "DP"),
            ("Eve Davis", "eve@example.com", "#F0C239", "ED"),
        ]
        users = []
        for name, email, colour, initials in users_data:
            u = User(
                name=name, email=email, colour=colour, initials=initials,
                password_hash=hash_password("password123"),
                role="admin" if email == "alice@example.com" else "regular",
                workspace_id=ws.id,
            )
            db.add(u)
            users.append(u)
        await db.flush()

        # Teams
        team_all = Team(name="Everyone", workspace_id=ws.id)
        team_dev = Team(name="Development", workspace_id=ws.id)
        team_design = Team(name="Design", workspace_id=ws.id)
        db.add_all([team_all, team_dev, team_design])
        await db.flush()

        # Add members to teams
        for u in users:
            await db.execute(team_members.insert().values(team_id=team_all.id, user_id=u.id))
        for u in users[:3]:
            await db.execute(team_members.insert().values(team_id=team_dev.id, user_id=u.id))
        for u in users[3:]:
            await db.execute(team_members.insert().values(team_id=team_design.id, user_id=u.id))

        # Client
        client = Client(name="Big Corp", workspace_id=ws.id)
        db.add(client)
        await db.flush()

        # Projects
        projects_data = [
            ("Website Redesign", "#4186E0", client.id),
            ("Mobile App", "#E44332", client.id),
            ("API Platform", "#5CBF4D", None),
            ("Marketing Campaign", "#F0C239", None),
        ]
        projects = []
        for pname, colour, cid in projects_data:
            p = Project(
                name=pname, colour=colour, client_id=cid,
                workspace_id=ws.id, status="active",
            )
            db.add(p)
            projects.append(p)
        await db.flush()

        # Segments for Website Redesign
        segments = []
        for sname in ["Homepage", "Product Pages", "Checkout Flow"]:
            s = Segment(name=sname, project_id=projects[0].id)
            db.add(s)
            segments.append(s)
        await db.flush()

        # Tags
        tags_data = [
            ("Frontend", "#3B82F6"), ("Backend", "#10B981"),
            ("Design", "#8B5CF6"), ("Bug", "#EF4444"),
            ("Enhancement", "#F59E0B"), ("Documentation", "#6B7280"),
        ]
        tags = []
        for tname, tcolour in tags_data:
            t = Tag(name=tname, colour=tcolour, project_id=projects[0].id)
            db.add(t)
            tags.append(t)
        await db.flush()

        # Tasks — spread over next 4 weeks
        today = date.today()
        tasks_data = [
            ("Design homepage mockup", projects[0].id, segments[0].id, 0, 3, "done", users[3]),
            ("Implement responsive header", projects[0].id, segments[0].id, 2, 5, "in_progress", users[0]),
            ("Build product card component", projects[0].id, segments[1].id, 4, 8, "planned", users[1]),
            ("Checkout form validation", projects[0].id, segments[2].id, 7, 10, "planned", users[0]),
            ("Payment gateway integration", projects[0].id, segments[2].id, 10, 14, "planned", users[2]),
            ("Setup React Native project", projects[1].id, None, 0, 2, "done", users[1]),
            ("Auth flow screens", projects[1].id, None, 2, 6, "in_progress", users[3]),
            ("Push notification setup", projects[1].id, None, 5, 8, "planned", users[2]),
            ("API authentication middleware", projects[2].id, None, 0, 3, "done", users[2]),
            ("Rate limiting implementation", projects[2].id, None, 3, 5, "in_progress", users[0]),
            ("OpenAPI documentation", projects[2].id, None, 5, 7, "planned", users[1]),
            ("Social media calendar", projects[3].id, None, 1, 8, "in_progress", users[4]),
            ("Blog post drafts", projects[3].id, None, 3, 10, "planned", users[4]),
            ("Email campaign setup", projects[3].id, None, 8, 14, "planned", users[3]),
        ]
        task_objects = []
        for tname, pid, sid, d_from, d_to, status, assignee in tasks_data:
            task = Task(
                name=tname,
                project_id=pid,
                segment_id=sid,
                workspace_id=ws.id,
                date_from=today + timedelta(days=d_from),
                date_to=today + timedelta(days=d_to),
                status=status,
                colour=None,
                sort_order=len(task_objects),
            )
            db.add(task)
            await db.flush()
            await db.execute(task_assignees.insert().values(task_id=task.id, user_id=assignee.id))
            task_objects.append(task)

        # Checklists for some tasks
        for task in task_objects[:3]:
            for i, title in enumerate(["Research", "Implement", "Review", "Deploy"]):
                c = Checklist(
                    title=title, task_id=task.id,
                    is_completed=(i < 2 if task.status == "in_progress" else i < 4 if task.status == "done" else False),
                    sort_order=i,
                )
                db.add(c)

        # Comments
        for task in task_objects[:5]:
            comment = Comment(
                body=f"Started working on {task.name}. Looking good so far!",
                task_id=task.id,
                user_id=users[0].id,
            )
            db.add(comment)

        # Milestones
        milestones_data = [
            ("Sprint 1 Complete", today + timedelta(days=7), "#E44332", projects[0].id),
            ("Beta Release", today + timedelta(days=14), "#4186E0", projects[1].id),
            ("Launch Day", today + timedelta(days=21), "#5CBF4D", None),
        ]
        for mname, mdate, mcolour, mpid in milestones_data:
            m = Milestone(
                name=mname, date=mdate, colour=mcolour,
                project_id=mpid, workspace_id=ws.id,
            )
            db.add(m)

        await db.commit()
        print(f"Seeded: 1 workspace, {len(users)} users, {len(projects)} projects, {len(task_objects)} tasks")
        print(f"Login: alice@example.com / password123")


if __name__ == "__main__":
    asyncio.run(seed())
