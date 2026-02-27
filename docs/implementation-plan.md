# Planview — Implementation Plan & Repo Structure

**Repository:** github.com/zanphear/planview
**Docker Image:** wgf007/planview

---

## Repository Structure

```
planview/
├── README.md
├── LICENSE
├── docker-compose.yml              # Full-stack deployment
├── docker-compose.dev.yml          # Dev overrides (hot-reload, debug)
├── .env.example                    # Environment variable template
├── Makefile                        # Common commands (up, down, migrate, seed, test)
│
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml              # Python deps (FastAPI, SQLAlchemy, etc.)
│   ├── alembic.ini                 # DB migration config
│   ├── alembic/
│   │   └── versions/               # Migration scripts
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI app entry point
│   │   ├── config.py               # Settings (env-based via pydantic-settings)
│   │   ├── database.py             # SQLAlchemy engine, session factory
│   │   │
│   │   ├── models/                 # SQLAlchemy ORM models
│   │   │   ├── __init__.py
│   │   │   ├── workspace.py
│   │   │   ├── user.py
│   │   │   ├── team.py
│   │   │   ├── client.py
│   │   │   ├── project.py
│   │   │   ├── segment.py
│   │   │   ├── tag.py
│   │   │   ├── task.py
│   │   │   ├── checklist.py
│   │   │   ├── comment.py
│   │   │   ├── attachment.py
│   │   │   └── milestone.py
│   │   │
│   │   ├── schemas/                # Pydantic request/response schemas
│   │   │   ├── __init__.py
│   │   │   ├── workspace.py
│   │   │   ├── user.py
│   │   │   ├── team.py
│   │   │   ├── project.py
│   │   │   ├── task.py
│   │   │   └── milestone.py
│   │   │
│   │   ├── api/                    # API route handlers
│   │   │   ├── __init__.py
│   │   │   ├── router.py           # Top-level router aggregation
│   │   │   ├── auth.py             # Login, token refresh, OAuth
│   │   │   ├── users.py
│   │   │   ├── workspaces.py
│   │   │   ├── teams.py
│   │   │   ├── projects.py
│   │   │   ├── tasks.py
│   │   │   ├── milestones.py
│   │   │   ├── comments.py
│   │   │   ├── attachments.py
│   │   │   └── sharing.py          # Public timeline link generation
│   │   │
│   │   ├── services/               # Business logic layer
│   │   │   ├── __init__.py
│   │   │   ├── task_service.py     # Task CRUD, recurring expansion, bulk ops
│   │   │   ├── timeline_service.py # Timeline query optimisation
│   │   │   ├── notification_service.py
│   │   │   ├── export_service.py   # CSV, JSON, ICS export
│   │   │   ├── import_service.py   # CSV, JSON, ICS import
│   │   │   └── sharing_service.py  # Public link token management
│   │   │
│   │   ├── websocket/              # Real-time updates
│   │   │   ├── __init__.py
│   │   │   ├── manager.py          # Connection manager
│   │   │   └── events.py           # Event types and broadcast logic
│   │   │
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── auth.py             # JWT encode/decode, password hashing
│   │       ├── colours.py          # Default colour palette
│   │       ├── holidays.py         # Public holiday data/API client
│   │       └── ical.py             # iCal generation/parsing
│   │
│   └── tests/
│       ├── conftest.py             # Fixtures (test DB, client, auth)
│       ├── test_tasks.py
│       ├── test_projects.py
│       ├── test_timeline.py
│       └── test_auth.py
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── main.tsx                # React entry point
│   │   ├── App.tsx                 # Root component, router
│   │   ├── vite-env.d.ts
│   │   │
│   │   ├── api/                    # API client layer
│   │   │   ├── client.ts           # Axios/fetch wrapper with auth
│   │   │   ├── tasks.ts
│   │   │   ├── projects.ts
│   │   │   ├── teams.ts
│   │   │   ├── users.ts
│   │   │   └── websocket.ts        # WebSocket connection manager
│   │   │
│   │   ├── stores/                 # State management (Zustand)
│   │   │   ├── authStore.ts
│   │   │   ├── workspaceStore.ts
│   │   │   ├── taskStore.ts
│   │   │   ├── projectStore.ts
│   │   │   ├── teamStore.ts
│   │   │   └── uiStore.ts          # Zoom level, sidebar state, filters
│   │   │
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── TopBar.tsx
│   │   │   │   ├── WorkspaceSwitcher.tsx
│   │   │   │   └── QuickSearch.tsx
│   │   │   │
│   │   │   ├── timeline/
│   │   │   │   ├── Timeline.tsx           # Core timeline container
│   │   │   │   ├── TimelineHeader.tsx     # Date columns header
│   │   │   │   ├── TimelineSwimlane.tsx   # Single user/segment row
│   │   │   │   ├── TaskBar.tsx            # Draggable task bar
│   │   │   │   ├── MilestoneMarker.tsx    # Vertical milestone line
│   │   │   │   ├── TodayMarker.tsx        # Current date indicator
│   │   │   │   ├── ZoomControls.tsx       # W/M/Q/A buttons
│   │   │   │   ├── DatePicker.tsx         # Jump-to-date
│   │   │   │   └── TimelineFilters.tsx    # Filter bar
│   │   │   │
│   │   │   ├── board/
│   │   │   │   ├── Board.tsx              # Kanban container
│   │   │   │   ├── BoardColumn.tsx        # Status column
│   │   │   │   └── BoardCard.tsx          # Task card
│   │   │   │
│   │   │   ├── task/
│   │   │   │   ├── TaskDetail.tsx         # Slide-out panel
│   │   │   │   ├── TaskProperties.tsx     # Core properties form
│   │   │   │   ├── TaskDescription.tsx    # Rich text editor
│   │   │   │   ├── TaskChecklist.tsx      # Checklist section
│   │   │   │   ├── TaskComments.tsx       # Comments thread
│   │   │   │   ├── TaskAttachments.tsx    # File upload/list
│   │   │   │   ├── ColourPicker.tsx
│   │   │   │   ├── StatusPicker.tsx
│   │   │   │   └── AssigneePicker.tsx
│   │   │   │
│   │   │   ├── taskbox/
│   │   │   │   └── Taskbox.tsx            # Floating inbox
│   │   │   │
│   │   │   └── shared/
│   │   │       ├── Avatar.tsx
│   │   │       ├── Modal.tsx
│   │   │       ├── ContextMenu.tsx
│   │   │       ├── Tooltip.tsx
│   │   │       └── ConfirmDialog.tsx
│   │   │
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── TeamTimelinePage.tsx
│   │   │   ├── ProjectTimelinePage.tsx
│   │   │   ├── ProjectBoardPage.tsx
│   │   │   ├── MyWorkPage.tsx
│   │   │   ├── SettingsPage.tsx
│   │   │   └── SharedTimelinePage.tsx     # Public read-only view
│   │   │
│   │   ├── hooks/
│   │   │   ├── useTimeline.ts             # Timeline scroll, zoom, date calc
│   │   │   ├── useDragAndDrop.ts          # DnD abstraction
│   │   │   ├── useKeyboardShortcuts.ts
│   │   │   ├── useWebSocket.ts
│   │   │   └── useTaskFilters.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── dates.ts                   # Date arithmetic, formatting
│   │   │   ├── colours.ts                 # Palette, contrast calculation
│   │   │   └── constants.ts               # Zoom configs, default statuses
│   │   │
│   │   └── styles/
│   │       ├── globals.css
│   │       ├── timeline.css
│   │       └── variables.css              # CSS custom properties (theme)
│   │
│   └── tests/
│       ├── Timeline.test.tsx
│       ├── TaskBar.test.tsx
│       └── Board.test.tsx
│
├── nginx/
│   └── nginx.conf                  # Reverse proxy config
│
├── scripts/
│   ├── seed.py                     # Generate sample data for dev
│   ├── backup.sh                   # PostgreSQL dump script
│   └── restore.sh                  # PostgreSQL restore script
│
└── docs/
    ├── design-spec.md              # This design specification
    ├── api-reference.md            # Auto-generated or hand-written API docs
    ├── deployment.md               # Self-hosting guide
    └── development.md              # Dev environment setup
```

---

## Implementation Phases

### Phase 1 — Foundation (Weeks 1–2)
**Goal:** Backend API skeleton, database schema, auth, and basic frontend shell.

**Backend:**
- [ ] Project scaffolding: FastAPI app, Docker setup, docker-compose.yml
- [ ] PostgreSQL connection via SQLAlchemy async
- [ ] Alembic migration setup
- [ ] Core models: Workspace, User, Team, team_members
- [ ] Auth: user registration, login, JWT token issue/refresh
- [ ] API endpoints: `/me`, `/workspaces`, `/workspaces/:ws/members`, `/workspaces/:ws/teams`
- [ ] CORS configuration
- [ ] Health check endpoint

**Frontend:**
- [ ] Vite + React + TypeScript scaffolding
- [ ] Zustand store setup (auth, workspace, UI)
- [ ] API client with auth interceptor
- [ ] Login page
- [ ] App shell: sidebar skeleton, top bar, router
- [ ] Workspace switcher (dropdown)

**Infra:**
- [ ] docker-compose.yml with backend, frontend, postgres, redis, nginx
- [ ] .env.example with all config variables
- [ ] Makefile targets: `up`, `down`, `migrate`, `logs`

**Deliverable:** Login → see empty sidebar with workspace name, teams listed.

---

### Phase 2 — Projects & Tasks CRUD (Weeks 3–4)
**Goal:** Full task lifecycle without the timeline — board view first.

**Backend:**
- [ ] Models: Project, Client, Segment, Tag, Task, task_assignees, task_tags
- [ ] Alembic migrations for all new models
- [ ] API endpoints: full CRUD for projects, tasks, segments, tags
- [ ] Task filtering: by project, status, assignee, date range, tags
- [ ] Checklist model + endpoints (nested under tasks)

**Frontend:**
- [ ] Sidebar: Projects & Clients list, create project flow
- [ ] Project Board page (Kanban):
  - [ ] BoardColumn component with status headers
  - [ ] BoardCard component (task name, colour, assignee avatar, dates, tags)
  - [ ] Drag-and-drop between columns (status change)
  - [ ] Drag within column (reorder)
  - [ ] Click card → open TaskDetail panel
- [ ] TaskDetail slide-out panel:
  - [ ] Task name (inline edit)
  - [ ] Colour picker
  - [ ] Status dropdown
  - [ ] Date range picker
  - [ ] Assignee picker
  - [ ] Project selector
  - [ ] Description (plain text initially, rich text in Phase 5)
  - [ ] Checklist (add/check/reorder/delete items)
- [ ] Filter bar on board view (by segment, tag, assignee)

**Deliverable:** Create projects → add tasks on Kanban board → drag between statuses → edit task details.

---

### Phase 3 — Timeline Views (Weeks 5–7)
**Goal:** The core feature — horizontal timeline with drag-and-drop.

This is the hardest phase. Budget extra time here.

**Backend:**
- [ ] Optimised timeline query: tasks within date range for a set of users, with eager-loaded relations
- [ ] Milestone model + CRUD endpoints
- [ ] Task bulk update endpoint (multi-select operations)

**Frontend:**
- [ ] Timeline component architecture decision: **Canvas-based** vs **DOM-based**
  - Recommend: DOM-based with virtualisation for v1 (simpler), canvas for v2 if perf needed
- [ ] TimelineHeader: date columns with day/week/month labels
- [ ] TimelineSwimlane: one row per user (team view) or per segment (project view)
- [ ] TaskBar component:
  - [ ] Colour from project
  - [ ] Task name + status emoji
  - [ ] Assignee avatar (right side)
  - [ ] Checklist progress bar (bottom)
  - [ ] Notes indicator (top-right triangle)
  - [ ] Faded when done
- [ ] TodayMarker: highlighted vertical line on current date
- [ ] Weekend shading (darker columns)
- [ ] Zoom levels: Weekly, Monthly, Quarterly, Annual
  - [ ] ZoomControls component + keyboard shortcuts (W/M/Q/A)
- [ ] Timeline scrolling: horizontal scroll, shift+scroll, date picker jump
- [ ] **Drag-and-drop on timeline:**
  - [ ] Click empty area → create task
  - [ ] Click+drag empty area → create multi-day task
  - [ ] Drag task body → reschedule (move dates)
  - [ ] Drag task edge → resize (change duration)
  - [ ] Drag to different swimlane → reassign (team) / change segment (project)
  - [ ] Cmd+drag → duplicate
- [ ] MilestoneMarker: coloured vertical line spanning all swimlanes
- [ ] Team Timeline page (swimlane = user)
- [ ] Project Timeline page (swimlane = segment, collapsible)
- [ ] My Work page (filtered to current user)

**Deliverable:** Fully interactive timelines — drag tasks around, zoom in/out, switch between team/project views.

---

### Phase 4 — Real-time & Collaboration (Week 8)
**Goal:** Multi-user live updates, comments, notifications.

**Backend:**
- [ ] WebSocket endpoint (`/ws`) with Redis pub/sub
- [ ] Broadcast events: task created/updated/deleted, status changed, comment added
- [ ] Comment model + CRUD endpoints
- [ ] Notification service: in-app notification storage
- [ ] Notification triggers (task assigned, comment added, task overdue)

**Frontend:**
- [ ] WebSocket connection manager (auto-reconnect)
- [ ] Live timeline updates (task changes from other users appear without refresh)
- [ ] TaskComments section in TaskDetail (threaded, with timestamps + avatars)
- [ ] Notification bell in top bar with dropdown list
- [ ] Real-time notification toasts

**Deliverable:** Two users see each other's changes live. Comments work. Notifications appear.

---

### Phase 5 — Polish & Extended Features (Weeks 9–10)
**Goal:** Feature parity with Toggl Plan free/standard tier.

**Backend:**
- [ ] Attachment model + file upload endpoints (store to local fs or MinIO)
- [ ] Recurring task engine (RRULE parsing, instance expansion)
- [ ] CSV/JSON export endpoints
- [ ] CSV/JSON import endpoints
- [ ] ICS feed endpoint (calendar export)
- [ ] Public sharing: generate token-based read-only timeline URLs
- [ ] Time-off model + API
- [ ] Public holidays integration (Nager.Date API or embedded JSON)
- [ ] Webhook outbound (configurable event→URL mapping)

**Frontend:**
- [ ] TaskAttachments section (drag-and-drop upload, file list with download)
- [ ] Rich text editor for task description (TipTap)
- [ ] Recurring task UI in TaskDetail (frequency picker, end condition)
- [ ] Taskbox (floating inbox, drag to timeline to schedule)
- [ ] Quick Search (global, searches tasks/projects/users)
- [ ] Context menu (right-click on tasks)
- [ ] Bulk selection (Cmd+click, Shift+drag) + bulk operations toolbar
- [ ] Keyboard shortcuts (full set from spec)
- [ ] Time-off display on timelines (shaded blocks with icons)
- [ ] Public holiday overlays on timelines
- [ ] Shared Timeline page (public, read-only, embeddable)
- [ ] Settings page (workspace settings, user profile, notification prefs)
- [ ] Dark mode / theme toggle

**Deliverable:** Feature-complete v1 matching the design spec.

---

### Phase 6 — Hardening & Release (Week 11)
**Goal:** Production-ready self-hosted release.

- [ ] Error handling audit (backend: proper HTTP codes + messages, frontend: error boundaries)
- [ ] Input validation hardening (Pydantic strict mode, XSS prevention)
- [ ] Rate limiting on API
- [ ] Database index tuning (EXPLAIN ANALYZE on timeline queries)
- [ ] Frontend performance: virtualise long task lists, lazy-load heavy components
- [ ] Lighthouse audit (accessibility, performance)
- [ ] Write deployment guide (`docs/deployment.md`)
- [ ] Write development setup guide (`docs/development.md`)
- [ ] Generate API reference (`docs/api-reference.md`)
- [ ] Seed script with realistic sample data
- [ ] Backup/restore scripts for PostgreSQL
- [ ] CI pipeline (GitHub Actions: lint, test, build, push Docker image)
- [ ] Tag v1.0.0, push `wgf007/planview:latest` + `wgf007/planview:1.0.0` to Docker Hub
- [ ] README with screenshots, quick-start, feature list

**Deliverable:** `docker compose up` → fully working Planview instance.

---

## Tech Stack Summary

| Layer | Choice | Version |
|-------|--------|---------|
| Language (backend) | Python | 3.12+ |
| Framework | FastAPI | 0.115+ |
| ORM | SQLAlchemy (async) | 2.0+ |
| Migrations | Alembic | 1.13+ |
| Validation | Pydantic | 2.0+ |
| Auth | PyJWT + passlib[bcrypt] | — |
| Task queue (future) | Celery + Redis | — |
| Language (frontend) | TypeScript | 5.x |
| UI framework | React | 19+ |
| Build tool | Vite | 6+ |
| State management | Zustand | 5+ |
| DnD library | @dnd-kit/core + sortable | 6+ |
| Rich text | TipTap | 2.x |
| CSS | Tailwind CSS | 4+ |
| Database | PostgreSQL | 16+ |
| Cache / Pub-sub | Redis | 7+ |
| File storage | Local fs → MinIO (optional) | — |
| Reverse proxy | Nginx | 1.27+ |
| Containerisation | Docker + Compose | 27+ |

---

## Estimated Effort

| Phase | Duration | Complexity |
|-------|----------|------------|
| 1 — Foundation | 2 weeks | Low |
| 2 — Projects & Tasks | 2 weeks | Medium |
| 3 — Timeline Views | 3 weeks | **High** |
| 4 — Real-time | 1 week | Medium |
| 5 — Polish & Features | 2 weeks | Medium |
| 6 — Hardening & Release | 1 week | Low-Medium |
| **Total** | **~11 weeks** | |

Phase 3 is the critical path. The timeline drag-and-drop with zoom levels, virtual scrolling, and multi-interaction support is the most technically demanding piece. Everything else is standard CRUD/UI work.

---

*Ready to build.*
