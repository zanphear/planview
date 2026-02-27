# Planview

A self-hosted visual planning & scheduling tool modelled on Toggl Plan. Drag-and-drop timeline-based project planning with team swimlanes, Kanban boards, and real-time collaboration.

## Features

- **Timeline Views** — Horizontal Gantt-style timelines with week/month/quarter/year zoom
- **Team Swimlanes** — See workload per person across all projects
- **Project Swimlanes** — Segment-based rows within a project timeline
- **Kanban Board** — Drag-and-drop task cards between status columns
- **Task Detail Panel** — Slide-out panel with status, dates, assignees, colour, description, checklists, comments, attachments
- **Real-time Updates** — WebSocket-powered live updates across users
- **Notifications** — In-app notification bell with toast alerts
- **Comments** — Threaded comments on tasks with edit/delete
- **File Attachments** — Upload and download files on tasks
- **Milestones** — Vertical deadline markers spanning timelines
- **Quick Search** — Cmd+K global search across tasks, projects, teams
- **Export** — CSV, JSON, and ICS (calendar) export
- **Shared Timelines** — Public read-only timeline links
- **Time Off** — Track time off per team member
- **Settings** — Profile, workspace, notification preferences

## Quick Start

```bash
# Clone and start
git clone https://github.com/zanphear/planview.git
cd planview
cp .env.example .env
docker compose up -d

# Run migrations
docker compose exec planview-web alembic upgrade head

# Seed sample data (optional)
docker compose exec planview-web python -m seed

# Open in browser
open http://localhost:8080
```

Default login after seeding: `alice@example.com` / `password123`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI + Python 3.12 |
| ORM | SQLAlchemy 2.0 (async) |
| Database | PostgreSQL 16 |
| Cache/Pubsub | Redis 7 |
| Frontend | React 19 + TypeScript + Vite 6 |
| State | Zustand 5 |
| DnD | @dnd-kit 6 |
| CSS | Tailwind CSS 4 |
| Auth | JWT (PyJWT + bcrypt) |
| Reverse Proxy | Nginx |
| Container | Docker Compose |

## Development

```bash
# Start dev environment (hot-reload)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Or run services locally:
cd backend && pip install -e . && uvicorn app.main:app --reload
cd frontend && npm install && npm run dev
```

## Project Structure

```
planview/
├── backend/           # FastAPI application
│   ├── app/
│   │   ├── api/       # Route handlers (72 routes)
│   │   ├── models/    # SQLAlchemy models (18 tables)
│   │   ├── schemas/   # Pydantic validation
│   │   ├── services/  # Business logic
│   │   ├── websocket/ # Real-time events
│   │   └── utils/     # Auth, helpers
│   ├── alembic/       # Database migrations
│   └── seed.py        # Sample data seeder
├── frontend/          # React SPA
│   └── src/
│       ├── api/       # API client layer
│       ├── components/# UI components
│       ├── hooks/     # Custom hooks (WebSocket, keyboard shortcuts)
│       ├── pages/     # Route pages
│       ├── stores/    # Zustand state management
│       └── utils/     # Date helpers, constants
├── nginx/             # Reverse proxy config
├── scripts/           # Backup/restore scripts
└── docker-compose.yml # Production deployment
```

## Backup & Restore

```bash
# Backup
./scripts/backup.sh ./backups

# Restore
./scripts/restore.sh ./backups/planview_20260227_120000.sql.gz
```

## Deployment (Dockge)

Copy `dockge/compose.yaml` to your Dockge stacks directory:

```bash
cp dockge/compose.yaml /files/appdata/config/dockge/stacks/planview/compose.yaml
```

Update the image tags and environment variables as needed.

## API

The API is available at `/api/v1/` with the following resources:

- `POST /api/v1/auth/register` — Register + create workspace
- `POST /api/v1/auth/login` — Login
- `GET /api/v1/workspaces` — List workspaces
- `GET /api/v1/workspaces/:id/tasks` — List tasks (filterable)
- `GET /api/v1/workspaces/:id/timeline` — Optimised timeline query
- `GET /api/v1/workspaces/:id/export/tasks.csv` — Export tasks
- `GET /api/v1/shared/:token/tasks` — Public shared timeline
- Full OpenAPI docs at `/docs` when running

## Licence

MIT
