# Planview — Design Specification

**A Self-Hosted Visual Planning & Scheduling Tool**
*Reverse-engineered from Toggl Plan (formerly Teamweek)*

**Version:** 1.0 DRAFT
**Date:** 2026-02-26
**Author:** Bill / Claude
**Repository:** github.com/zanphear/planview
**Docker Image:** wgf007/planview

---

## 1. Executive Summary

Planview is a self-hosted, lightweight visual planning and scheduling application modelled after Toggl Plan (formerly Teamweek). It provides drag-and-drop timeline-based project planning, team workload management, and Kanban board views — designed for home/personal use and small team coordination.

The core philosophy is **visual simplicity**: colour-coded tasks on a horizontal timeline with swimlanes per person or project segment. Everything is click-and-drag, with minimal setup friction.

---

## 2. Core Concepts & Data Model

### 2.1 Entity Hierarchy

```
Workspace
├── Users / Members
├── Teams (groups of users shown on a shared timeline)
├── Clients (optional grouping for projects)
│   └── Projects
│       ├── Segments (swimlanes within a project timeline)
│       ├── Tags (filterable labels on tasks)
│       └── Tasks
│           ├── Checklists
│           ├── Comments
│           ├── Attachments
│           └── Time Estimates
└── Milestones (vertical deadline markers spanning the timeline)
```

### 2.2 Entity Definitions

#### Workspace
The top-level container. A user can belong to multiple workspaces.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | string | Workspace name |
| created_at | timestamp | Creation date |
| updated_at | timestamp | Last modified |

#### User / Member
A person who can be assigned tasks and appear on team timelines.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | string | Display name |
| email | string | Email (nullable for placeholder members) |
| initials | string(2) | Two-letter initials |
| colour | hex string | Avatar/profile colour |
| avatar_url | string | Profile picture URL (nullable) |
| role | enum | `owner`, `admin`, `regular` |
| pin_on_top | boolean | Always show self first in team views |
| workspace_id | UUID | FK to workspace |
| created_at | timestamp | |
| updated_at | timestamp | |

#### Team
A named group of users whose schedules are displayed together on a shared timeline.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | string | Team name (e.g. "Everyone", "Dev Team") |
| workspace_id | UUID | FK to workspace |
| is_favourite | boolean | Pinned to sidebar top |
| created_at | timestamp | |
| updated_at | timestamp | |

**Relation:** `team_members` (join table: team_id, user_id, sort_order)

#### Client
Optional grouping above projects for organisational purposes.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | string | Client name |
| workspace_id | UUID | FK to workspace |
| created_at | timestamp | |

#### Project
A collection of tasks with its own colour, segments, tags, and views.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | string | Project name |
| colour | hex string | Project colour (inherited by all tasks unless overridden) |
| client_id | UUID | FK to client (nullable) |
| workspace_id | UUID | FK to workspace |
| status | enum | `active`, `archived` |
| is_favourite | boolean | Pinned in sidebar |
| custom_statuses | JSON | Array of custom board column statuses |
| created_at | timestamp | |
| updated_at | timestamp | |

#### Segment
Swimlanes within a project timeline for visual grouping (phases, departments, etc.).

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | string | Segment name (e.g. "Development", "Design", "Launch") |
| project_id | UUID | FK to project |
| sort_order | integer | Display order on timeline Y-axis |
| created_at | timestamp | |

#### Tag
Filterable labels applied to tasks within a project.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | string | Tag name |
| colour | hex string | Tag colour |
| project_id | UUID | FK to project |
| created_at | timestamp | |

#### Task
The fundamental unit of work. Appears on timelines and boards.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | string | Task title |
| description | text | Rich-text notes (markdown supported) |
| colour | hex string | Defaults to parent project colour; overridable |
| status | string | `todo`, `in_progress`, `blocked`, `done` (or custom) |
| status_emoji | string | Emoji prefix shown on timeline (e.g. 🔴 for blocked) |
| date_from | date | Start date |
| date_to | date | End date |
| start_time | time | Intra-day start time (nullable) |
| end_time | time | Intra-day end time (nullable) |
| time_estimate_minutes | integer | Total or per-day estimate (nullable) |
| time_estimate_mode | enum | `total`, `per_day` |
| project_id | UUID | FK to project (nullable — unassigned tasks allowed) |
| segment_id | UUID | FK to segment (nullable) |
| workspace_id | UUID | FK to workspace |
| is_recurring | boolean | Whether task recurs |
| recurrence_rule | string | iCal RRULE string (nullable) |
| created_at | timestamp | |
| updated_at | timestamp | |

**Relations:**
- `task_assignees` (join table: task_id, user_id) — supports multi-assign
- `task_tags` (join table: task_id, tag_id)

#### Checklist
Sub-items within a task, with completion tracking.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| task_id | UUID | FK to task |
| title | string | Checklist item text |
| is_completed | boolean | Completion state |
| sort_order | integer | Display order |
| created_at | timestamp | |

#### Comment
Threaded discussion attached to a task.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| task_id | UUID | FK to task |
| user_id | UUID | FK to user |
| body | text | Comment text (markdown) |
| created_at | timestamp | |
| updated_at | timestamp | |

#### Attachment
Files uploaded to a task.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| task_id | UUID | FK to task |
| filename | string | Original filename |
| file_path | string | Storage path |
| file_size | integer | Bytes |
| mime_type | string | MIME type |
| uploaded_by | UUID | FK to user |
| created_at | timestamp | |

#### Milestone
A named deadline that spans the entire timeline as a vertical marker.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | string | Milestone title |
| date | date | Deadline date |
| colour | hex string | Marker colour |
| project_id | UUID | FK to project (nullable for workspace-level milestones) |
| workspace_id | UUID | FK to workspace |
| created_at | timestamp | |

---

## 3. Views & UI Components

### 3.1 Team Timeline View (Primary View)

The defining feature. A horizontal Gantt-style timeline where:

- **Y-axis:** Team members (one swimlane per person)
- **X-axis:** Calendar dates (scrollable left/right)
- **Task bars:** Coloured rectangles spanning date_from → date_to
- **Colour:** Inherited from project (each project = distinct colour)
- **Zoom levels:** Weekly (W), Monthly (M), Quarterly (Q), Annual (A) — keyboard shortcuts

**Visual indicators on task bars:**
- Assignee avatar on right side of bar
- Status emoji prefix on task title
- Checklist progress bar (grey bar at bottom of task)
- Notes indicator (small triangle, top-right corner)
- Project name shown below task title
- Faded appearance when status = `done`

**Interactions:**
- Click on empty timeline area → create single-day task
- Click + drag on empty area → create multi-day task
- Drag task bar → reschedule (move dates)
- Drag task edge → resize (change duration)
- Drag task to different swimlane → reassign
- Cmd/Ctrl + click → select multiple tasks for bulk operations
- Shift + click-drag → select region of tasks
- Cmd/Ctrl + drag task → duplicate task
- Right-click → context menu (status change, start timer, delete)
- Hover → tooltip with task summary
- Milestones rendered as coloured vertical lines spanning all swimlanes

**Timeline navigation:**
- Horizontal scroll: scrollbar, shift+scroll, two-finger touchpad
- Date picker for jump-to-date
- "Today" marker (highlighted vertical line)
- Weekend columns shaded darker (toggleable in settings)
- Option to hide weekends entirely

### 3.2 Project Timeline View

Same horizontal timeline, but scoped to a single project:

- **Y-axis:** Segments (swimlanes per segment, collapsible)
- **X-axis:** Calendar dates
- **Task bars:** Same rendering as team timeline
- Assignee avatars shown on task bars
- Milestones specific to this project
- Toggle "Show Segments" / "Hide Segments" button
- Tags shown as coloured labels inside task cards (toggleable)

### 3.3 Project Board View (Kanban)

Kanban-style column layout for a single project:

- **Columns:** Status values (default: To-do → In Progress → Blocked → Done)
- **Cards:** Task cards with name, colour, assignee, dates, tags, segment labels
- Drag-and-drop between columns to change status
- Drag within column to reorder
- Click card → open task detail panel
- Filter by segment, tag, or assignee
- Custom column statuses per project

**Default statuses (with emoji):**
| Status | Emoji | Description |
|--------|-------|-------------|
| To-do | 📋 | Not started |
| In Progress | 🔵 | Actively working |
| Blocked | 🔴 | Waiting / impeded |
| Done | ✅ | Completed |

Custom statuses can be added per project and categorised as "done" type.

### 3.4 My Work View

A personal hub showing only the authenticated user's tasks across all projects:

- Filtered team timeline showing only your swimlane
- Aggregated from all teams and projects
- Sortable by date, project, status
- Quick-access to your upcoming tasks

### 3.5 Task Detail Panel (Slide-out / Modal)

Opened when clicking a task. Contains all task properties and sections:

**Always-visible properties:**
- Task name (editable inline)
- Colour picker
- Status dropdown (with emoji)
- Date range (from / to) with calendar picker
- Assignee(s) — avatar picker with multi-select
- Project selector

**Toggle-on properties (hidden when unused):**
- Segment selector
- Tags (multi-select)
- Time estimate (total or per-day)
- Start time / End time (intra-day)
- Recurrence rule builder

**Sections:**
- Description (rich-text editor with headings, lists, links, code blocks, quotes)
- Checklist (add items, check/uncheck, reorder, progress shown)
- Comments (threaded, with user avatars and timestamps)
- Attachments (drag-and-drop file upload, list with download links)

### 3.6 Sidebar Navigation

Persistent left sidebar:

```
┌─────────────────────┐
│ [Workspace Name ▼]  │  ← workspace switcher dropdown
│                     │
│ 🔍 Quick Search     │  ← search tasks, projects, users
│ 👤 My Work          │
│                     │
│ ★ Favourites        │  ← pinned teams/projects
│   Team Alpha        │
│   Project Clarion   │
│                     │
│ 👥 Teams            │
│   + [Create Team]   │
│   Everyone          │
│   Dev Team          │
│                     │
│ 📁 Projects & Clients│
│   + [Create Project] │
│   Client A          │
│     ├ Project X     │
│     └ Project Y     │
│   (No Client)       │
│     └ Project Z     │
│                     │
│ ⚙ Settings          │
└─────────────────────┘
```

- Sidebar collapsible
- Current view highlighted
- 3-dot menu on hover for each team/project (edit, favourite, share, delete, etc.)

### 3.7 Taskbox

A floating inbox/scratch area (bottom-right corner) for quick task capture:

- Quickly type task names without assigning dates/projects
- Drag tasks from Taskbox onto timeline to schedule
- Persists unscheduled tasks until placed

---

## 4. Colour System

Colours are central to the visual language. Each project has a designated colour, and all tasks within it inherit that colour by default.

**Default colour palette (16+ predefined):**

```
#E44332  #E8833A  #F0C239  #5CBF4D
#2DA1B1  #4186E0  #9B6AC0  #E06296
#D97025  #B8C142  #47B881  #3D7ACF
#7C5BBB  #DB4C8C  #8E8E8E  #5E6C84
```

- Custom hex colours supported (paid tier in Toggl, always enabled for self-hosted)
- Task colour override: any task can have its colour changed independently
- Milestone colours: independently set
- Tag colours: independently set (shown as small coloured labels)

---

## 5. Interactions & UX Patterns

### 5.1 Drag and Drop Matrix

| Source | Target | Action |
|--------|--------|--------|
| Timeline empty area | — | Create task at clicked date(s) |
| Task bar (body) | Same swimlane | Reschedule (change dates) |
| Task bar (body) | Different swimlane | Reassign (team view) or change segment (project view) |
| Task bar (edge) | — | Resize (extend/shorten duration) |
| Task bar + Cmd | Any | Duplicate task |
| Board card | Different column | Change status |
| Board card | Same column | Reorder |
| Taskbox item | Timeline | Schedule and assign |
| File (external) | Task detail | Upload attachment |

### 5.2 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| W | Weekly zoom |
| M | Monthly zoom |
| Q | Quarterly zoom |
| A | Annual zoom |
| N | New task |
| T | Today (scroll to current date) |
| Esc | Close task detail / deselect |
| Delete / Backspace | Delete selected task(s) |
| Cmd/Ctrl + Z | Undo |
| Cmd/Ctrl + Shift + Z | Redo |
| Cmd/Ctrl + C | Copy task |
| Cmd/Ctrl + V | Paste task |
| ← → | Scroll timeline |
| ? | Show keyboard shortcuts help |

### 5.3 Bulk Operations

When multiple tasks are selected (Cmd+click or Shift+drag):

- Drag to reschedule all
- Right-click menu: change status, reassign, change project, delete
- Bulk status update
- Bulk colour change

---

## 6. Notifications & Following

### 6.1 Notification Triggers

| Event | Notified Users |
|-------|---------------|
| Task assigned to you | Assignee |
| Task you're assigned to is updated | Assignee(s) |
| Comment on task you're involved in | All assignees + commenters |
| Milestone approaching (configurable) | Project followers |
| Task overdue | Assignee(s) |

### 6.2 Following

Users can "follow" projects or teams to receive update notifications. Notifications delivered via:

- In-app notification bell (real-time via WebSocket)
- Email digest (configurable: immediate / daily / weekly / off)
- Optional: webhook for external integrations

---

## 7. Sharing & Permissions

### 7.1 Workspace Roles

| Role | Capabilities |
|------|-------------|
| Owner | Full control, billing, delete workspace |
| Admin | Manage members, projects, teams, settings |
| Regular | Create/edit/delete own tasks, view all timelines |

### 7.2 Public Sharing

Project and team timelines can be shared via a read-only public URL:

- Generates unique shareable link
- Viewer sees timeline with tasks, milestones, assignees
- No editing capability
- Can be embedded via iframe
- Revocable at any time

### 7.3 Time Off / Availability

Users can mark time-off periods on their timeline:

| Type | Icon | Description |
|------|------|-------------|
| Vacation | 🏖️ | Holiday / annual leave |
| Sick Leave | 🤒 | Illness |
| Other | 📅 | Generic time off |

Scheduling a task during a user's time-off triggers a conflict warning.

---

## 8. Data Import / Export

### 8.1 Import

- CSV import (task name, dates, assignee, project, segment, tags, status)
- JSON import (full entity structure)
- iCal import (calendar events → tasks)

### 8.2 Export

- CSV export (per project or team, includes all task properties)
- JSON export (full workspace data)
- iCal/ICS export (tasks → calendar feed URL for Google Calendar, Outlook, Apple Calendar)
  - Approximately 2 months of future tasks from today
  - Tasks need start/end times to show at correct times; otherwise shown as all-day

---

## 9. Integrations

### 9.1 Calendar Sync

- **Google Calendar import:** Pull calendar events into timeline to show availability
- **Calendar export (ICS feed):** Subscribe from any calendar app
- Bi-directional sync where feasible

### 9.2 Webhooks / API

RESTful API modelled on Toggl Plan's v5 API:

**Base URL:** `https://<host>/api/v1`
**Auth:** Bearer token (OAuth2 or API key)
**Format:** JSON

**Core endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /me | Current user profile |
| GET | /workspaces | List workspaces |
| GET | /:ws/members | List workspace members |
| GET | /:ws/teams | List teams |
| GET | /:ws/projects | List projects |
| GET | /:ws/tasks | List tasks (filterable: since, until, users, project, tags, status) |
| POST | /:ws/tasks | Create task |
| PUT | /:ws/tasks/:id | Update task |
| DELETE | /:ws/tasks/:id | Delete task |
| GET | /:ws/milestones | List milestones |
| POST | /:ws/milestones | Create milestone |
| GET | /:ws/projects/:id/segments | List segments |
| GET | /:ws/projects/:id/tags | List tags |

**Filtering (tasks endpoint):**

| Param | Type | Description |
|-------|------|-------------|
| filter | string | `backlog` (no dates), `timeline` (has dates), or empty (all) |
| since | ISO date | Tasks ending after this date |
| until | ISO date | Tasks starting before this date |
| users | comma-separated UUIDs | Filter by assignee |
| project | UUID | Filter by project |
| tags | comma-separated UUIDs | Filter by tags |
| status | string | Filter by status |

### 9.3 Webhook Events

Outbound webhooks on configurable events:

- `task.created`, `task.updated`, `task.deleted`
- `task.status_changed`
- `task.assigned`
- `comment.created`
- `milestone.approaching`

---

## 10. Technical Architecture (Self-Hosted)

### 10.1 Recommended Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Backend API | FastAPI (Python) or Go | Lightweight, high-performance REST API |
| Database | PostgreSQL | Relational model, JSON support, mature |
| Cache / Real-time | Redis | Pub/sub for WebSocket events, session cache |
| Frontend | React + TypeScript | Rich interactive UI, drag-and-drop ecosystem |
| Timeline Rendering | Custom canvas or react-virtualized + custom | Performance for large timelines |
| Drag-and-Drop | @dnd-kit/core or react-beautiful-dnd | Mature DnD libraries |
| Rich Text | TipTap or Slate.js | Markdown-compatible editor for descriptions |
| File Storage | Local filesystem / S3-compatible (MinIO) | Attachment storage |
| Auth | JWT + OAuth2 (optional OIDC) | Stateless auth, SSO support |
| WebSockets | FastAPI WebSocket / Socket.io | Real-time timeline updates |
| Containerisation | Docker / Docker Compose | Self-hosted deployment |

### 10.2 Deployment Architecture

```
┌─────────────────────────────────────────────────┐
│                  Docker Compose                  │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │  Nginx   │──│ Frontend │  │   Backend    │  │
│  │ (Reverse │  │  (React  │  │  (FastAPI)   │  │
│  │  Proxy)  │  │   SPA)   │  │              │  │
│  └──────────┘  └──────────┘  └──────┬───────┘  │
│                                      │          │
│                    ┌─────────────────┼────────┐ │
│                    │                 │        │ │
│               ┌────▼────┐     ┌─────▼──┐     │ │
│               │PostgreSQL│     │ Redis  │     │ │
│               │         │     │        │     │ │
│               └─────────┘     └────────┘     │ │
│                                              │ │
│               ┌─────────┐                    │ │
│               │  MinIO   │  (file storage)   │ │
│               └─────────┘                    │ │
└─────────────────────────────────────────────────┘
```

### 10.3 Database Schema (PostgreSQL)

Key indexes for performance:

- `tasks`: composite index on `(workspace_id, date_from, date_to)` for timeline queries
- `tasks`: index on `(project_id, status)` for board views
- `task_assignees`: composite index on `(user_id, task_id)` for "My Work" queries
- `team_members`: composite index on `(team_id, user_id)`

---

## 11. Configuration & Settings

### 11.1 Workspace Settings

- Workspace name
- Default timezone
- Week start day (Monday / Sunday)
- Public holidays calendar (country/region selector)
- Default task colour
- Show/hide weekends on timelines

### 11.2 User Profile Settings

- Name, email, initials, avatar
- "Pin Me On Top" — always show yourself first in team views
- Default task properties on new tasks (which sections show by default)
- Notification preferences (in-app, email frequency)
- Theme: light / dark / system

### 11.3 Project Settings

- Name, colour, client assignment
- Custom board statuses (names + emojis + "done" categorisation)
- Default segments
- Default tags

---

## 12. Public Holidays

Workspace-level configuration to overlay public holidays on timelines:

- Selectable by country/region
- Holidays shown as shaded columns (similar to weekends)
- Optional: automatically block scheduling on holidays
- Data source: Nager.Date API or embedded holiday JSON files

---

## 13. Recurring Tasks

Tasks can be configured to recur:

| Frequency | Options |
|-----------|---------|
| Daily | Every N days |
| Weekly | Specific days of week, every N weeks |
| Monthly | Specific day of month, every N months |
| Yearly | Specific date, every N years |

**End conditions:** Forever, until specific date, or after N occurrences.

Recurring instances share the same properties (status, notes, checklist). Each occurrence is independent once created (changing one doesn't affect others).

---

## 14. Search & Filtering

### 14.1 Quick Search (Global)

Searches across tasks, projects, teams, and users by name/title. Results grouped by entity type with keyboard navigation.

### 14.2 Timeline Filters

Filter bar at top of any timeline/board view:

- By assignee
- By project
- By tag
- By segment
- By status
- By date range
- Combination filters (AND logic)

---

## 15. Responsive / Mobile Considerations

- Primary target: desktop web browser (1280px+)
- Tablet: simplified timeline with touch-friendly drag-and-drop
- Mobile: board view primary, simplified task list view, task creation/editing
- PWA support for offline task viewing and creation (sync on reconnect)

---

## 16. Future Enhancements (Out of Scope for v1)

These features exist in Toggl Plan's paid tiers or successor (Toggl Focus) but are deferred:

- Time tracking integration (Pomodoro timer, start/stop tracking per task)
- Capacity/workload view (hours allocated vs available per user per day)
- Billable rates and revenue tracking
- Advanced reporting (time spent, task completion rates, burndown)
- Task dependencies (predecessor/successor relationships)
- Gantt chart dependency arrows
- Multiple workspace billing
- SAML/SSO enterprise auth
- Audit logging

---

## 17. Acceptance Criteria Summary

The MVP is considered complete when:

1. Users can create workspaces, projects (with colours), and team groups
2. Tasks can be created via click/drag on timelines and via board view
3. Team timeline displays all members with colour-coded task bars
4. Project timeline displays segments as swimlanes
5. Project board displays tasks in configurable status columns
6. Tasks support: name, description, colour, dates, status, assignee(s), checklist, comments, attachments, tags, segments
7. Drag-and-drop works for: reschedule, reassign, resize, reorder, duplicate
8. Four zoom levels (W/M/Q/A) work on all timelines
9. Milestones appear as vertical markers on timelines
10. Sidebar navigation with workspace switcher, teams, projects, favourites
11. Quick search finds tasks/projects/users
12. Public read-only sharing via link works for timelines
13. REST API covers all CRUD operations
14. Docker Compose deployment works in a single `docker compose up`
15. Data persists in PostgreSQL with proper indexing

---

*End of specification.*
