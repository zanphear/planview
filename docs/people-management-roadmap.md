# Planview — People Management Roadmap

**Status:** Planning / Ideas
**Date:** 2026-02-28
**Author:** Bill / Claude

---

## Vision

Extend Planview from a visual planning tool into a lightweight people management platform. The planning, timelines, rotas, notifications, and team structures already exist — this roadmap builds on those foundations to cover the full line manager toolkit: 1:1s, objectives, development, contracts, compliance, recruitment, and competence management.

The philosophy remains the same: **visual, simple, self-hosted**. This is not Workday or SAP SuccessFactors — it's a practical tool for engineering managers who need to stay on top of their people without drowning in HR software.

---

## Phase 7 — People Profiles

**Priority:** Foundation — everything else depends on this

Extend the User model into a full person record. This is the spine that all subsequent features hang off.

### New Fields on User / New PersonProfile Model

| Field | Type | Notes |
|-------|------|-------|
| job_title | string | Current role |
| department | string | e.g. "SCADA & Comms", "Mechanical" |
| manager_id | UUID (FK → users) | Line manager — gives us the org tree |
| contract_type | enum | permanent, fixed_term, contractor, agency |
| contract_start | date | When they started |
| contract_end | date | Nullable — only for fixed-term/contractor |
| probation_end | date | Nullable |
| location | string | Site / office |
| phone | string | Contact number |
| employee_id | string | Internal reference / payroll number |
| notes | text | Free-text manager notes |

### Org Chart

- Tree view derived from `manager_id` self-referencing FK
- Visual hierarchy — expandable/collapsible nodes
- Click through to person profile
- Could reuse timeline swimlane patterns for a flat "reporting lines" view

### Profile Pictures

- Avatar upload on person profile (crop/resize on upload)
- Display in org chart, 1:1s, team views, sidebar, comments
- Fallback to coloured initials circle (already implemented)
- Store as `/uploads/avatars/{user_id}.jpg` — simple, no DB bloat

### Personal Insights

Private manager-only notes about their people — the human stuff that makes you a better manager.

| Field | Type | Notes |
|-------|------|-------|
| date_of_birth | date | Birthday reminders |
| partner_name | string | Nullable |
| number_of_kids | int | Nullable |
| kids_details | text | Names/ages if relevant |
| interests | text | Hobbies, sports, passions |
| dietary_requirements | string | For team events |
| emergency_contact | string | Name + number |
| personal_notes | text | Free-form — anything useful to remember |

- **Visibility:** Manager-only — the person themselves shouldn't see this section
- **Birthday reminders** — notification on the day (or day before if weekend)
- **Dashboard widget** — "Upcoming birthdays this week" panel
- **Sensitive data flag** — clearly marked as private/confidential in the UI

### CV / Document Storage

- Extend the existing attachment system to support person-level documents (not just task-level)
- Upload CVs, contracts, certifications, right-to-work docs
- `PersonDocument` model: user_id, document_type (cv, contract, certification, visa, other), filename, file_path, expiry_date, uploaded_by, notes
- Document types with optional expiry dates feed into the alerts system

---

## Phase 8 — 1:1s & Check-ins

**Priority:** High — immediate daily value for managers

Structured recurring meetings between manager and direct report, with the killer feature being **rolling action items** that carry forward until completed.

### Data Model

```
Meeting
├── id, manager_id, report_id
├── scheduled_date, actual_date
├── notes (rich text — TipTap already integrated)
├── mood / sentiment (optional — good/neutral/concern)
├── status (scheduled, completed, cancelled)
└── MeetingActions[]
    ├── id, meeting_id, title, status (open, done)
    ├── owner_id (who's responsible)
    ├── carried_from_id (FK → self, for rolled-forward items)
    └── created_task_id (FK → tasks, if converted to a task)
```

### Features

- **Recurring schedule** — reuse existing recurrence system (weekly, fortnightly, monthly)
- **Agenda builder** — add talking points before the meeting
- **Rolling actions** — incomplete items automatically appear on the next 1:1 agenda
- **One-click task creation** — turn an action item into a Planview task
- **Meeting history** — timeline of past 1:1s with search
- **Sentiment tracking** — optional mood indicator per meeting, trend over time
- **Prep reminders** — notification 24h before with outstanding actions

### UI

- Dedicated "1:1s" page — list of your reports with next meeting date, outstanding actions count
- Meeting detail view — split screen: notes on left, actions on right
- Timeline view showing meeting cadence and gaps

---

## Phase 9 — Objectives & Targets

**Priority:** High — links to performance reviews later

OKR-style or simpler target-setting, tied to individuals and review periods.

### Data Model

```
ReviewPeriod
├── id, name (e.g. "FY26 H1"), start_date, end_date

Objective
├── id, user_id, review_period_id
├── title, description
├── category (performance, development, team, business)
├── status (draft, active, completed, cancelled)
├── progress (0-100%)
├── weight (relative importance within the period)
└── KeyResults[]
    ├── id, objective_id
    ├── title, description
    ├── target_value, current_value, unit
    ├── measurement_type (numeric, percentage, boolean, milestone)
    └── evidence_notes
```

### Features

- **Cascading objectives** — team objectives break down into individual ones (optional parent_id)
- **Progress tracking** — manual updates or calculated from key results
- **Mid-period check-ins** — link to 1:1 meetings for progress discussions
- **Burndown/progress charts** — reuse existing chart components
- **Objective templates** — common objectives that can be assigned to multiple people
- **Year-over-year comparison** — see how targets evolve

---

## Phase 10 — Contract & Visa Tracking

**Priority:** High — compliance requirement, high business value

Automated tracking and alerting for contract end dates, visa expirations, right-to-work documents, and certification renewals.

### Data Model

```
ComplianceItem
├── id, user_id, workspace_id
├── item_type (contract, visa, right_to_work, dbs_check, certification, other)
├── title (e.g. "Tier 2 Visa", "CSCS Card", "SC Clearance")
├── reference_number
├── issue_date, expiry_date
├── status (active, expiring_soon, expired, renewed)
├── alert_days[] (JSONB — e.g. [90, 60, 30, 14, 7])
├── document_id (FK → person_documents for uploaded evidence)
└── notes
```

### Features

- **Dashboard widget** — "Expiring Soon" panel on main dashboard
- **People Timeline view** — horizontal bars per person showing:
  - Contract duration (colour-coded by type/status)
  - Visa expiry as milestone markers
  - Certification renewal dates
  - Probation end dates
- **Automated alerts** — notification + email at configured intervals before expiry
  - Reuse existing notification and email services
  - Configurable per item type (90/60/30 days default)
- **Bulk view** — filterable table of all compliance items across the team
- **Audit trail** — who updated what, when (existing activity service)

---

## Phase 11 — Competence Management & Skills Matrix

**Priority:** Medium-High — critical for energy sector compliance

Track competencies, skills, and certifications across the workforce. Identify coverage gaps and single points of failure.

### Data Model

```
Competency
├── id, workspace_id
├── name (e.g. "HV Switching", "SCADA Programming", "First Aid")
├── category (technical, safety, management, soft_skill)
├── description
├── requires_certification (boolean)
├── certification_validity_months (nullable — e.g. 36 for first aid)
└── levels[] (JSONB — e.g. ["awareness", "practitioner", "expert"])

UserCompetency
├── id, user_id, competency_id
├── level (e.g. "practitioner")
├── assessed_date
├── assessed_by (FK → users)
├── expiry_date (calculated or manual)
├── evidence_document_id (FK → person_documents)
└── notes
```

### Features

- **Skills Matrix view** — grid with people as rows, competencies as columns, levels as colour-coded cells
  - Filter by team, department, category
  - Highlight gaps (no coverage) and single points of failure (only one person)
- **Individual competency profile** — radar/spider chart of a person's skills
- **Gap analysis** — "Team X needs 2 people with HV Switching at practitioner level, currently has 1"
- **Training needs** — auto-generated list of competencies that need development or renewal
- **Certification tracking** — links to compliance items for auto-expiry alerts
- **Bulk assessment** — manager can assess multiple people on a competency in one go

---

## Phase 12 — Leave Management (Extend TimeOff)

**Priority:** Medium — natural evolution of existing feature

Extend the existing TimeOff model into a proper leave management system.

### Enhancements

- **Leave types** — annual, sick, compassionate, TOIL, training, unpaid (each with own colour)
- **Allowance tracking** — annual entitlement, carried forward, used, remaining, booked future
- **Approval workflow** — request → pending → approved/rejected by manager
  - Notification to manager on request
  - Notification to requester on decision
- **Team calendar** — who's off when (already built in CalendarPage, extend with leave data)
- **Conflicts** — warn if too many people from same team are off simultaneously
- **Bradford Factor** — calculate absence patterns for short-term sickness monitoring
- **Public holidays** — country-configurable (settings.holidays_country already exists)
- **Year summary** — per-person breakdown of leave taken by type

---

## Phase 13 — Recruitment & Candidate Tracking

**Priority:** Medium — useful for hiring managers

Lightweight applicant tracking for people you're interviewing, with historical records.

### Data Model

```
Candidate
├── id, workspace_id
├── name, email, phone
├── position_applied (string or FK → a job posting)
├── source (referral, agency, direct, internal)
├── status (applied, screening, interviewing, offered, hired, rejected, withdrawn)
├── cv_document_id (FK → attachment or dedicated candidate_documents)
├── applied_date
├── notes (rich text)
└── CandidateEvents[]
    ├── id, candidate_id
    ├── event_type (cv_review, phone_screen, interview, technical_test, offer, rejection)
    ├── event_date
    ├── interviewer_id (FK → users)
    ├── outcome (pass, fail, maybe)
    ├── notes (rich text — interview feedback)
    └── rejection_reason (string — important for future reference)
```

### Features

- **Candidate pipeline** — Kanban board (reuse existing board components) with columns per status
- **CV storage** — upload and preview CVs (FilePreview component already exists)
- **Interview scheduling** — link to calendar, assign interviewers
- **Rejection records** — when declining a candidate, require a reason
  - **Re-applicant detection** — if the same name/email applies again, surface previous history and rejection reasons
  - "This person applied for Senior Engineer on 15/03/2025 — declined: insufficient HV experience"
- **Offer tracking** — salary, start date, conditions
- **Hired → Person** — one-click conversion from candidate to full person profile when they accept
- **GDPR compliance** — configurable auto-deletion of candidate data after retention period (e.g. 12 months post-rejection)

---

## Phase 14 — Development Plans (PDPs)

**Priority:** Medium — builds on objectives and competencies

Personal development plans tied to career progression and competency gaps.

### Data Model

```
DevelopmentPlan
├── id, user_id, review_period_id
├── status (draft, active, completed, archived)
├── career_aspiration (text — where do they want to be in 2-3 years?)
└── DevelopmentGoals[]
    ├── id, plan_id
    ├── title, description
    ├── goal_type (training, qualification, experience, mentoring, project)
    ├── linked_competency_id (FK → competencies, optional)
    ├── target_date
    ├── status (not_started, in_progress, completed)
    ├── evidence (text / document link)
    └── cost_estimate (decimal — for budget tracking)
```

### Features

- **Link to competency gaps** — auto-suggest development goals based on skills matrix gaps
- **Training record** — log completed courses, certifications, conferences
- **Budget tracking** — estimated vs actual cost of development activities
- **Manager review** — manager signs off on PDP, tracks progress in 1:1s
- **Templates** — standard development paths for common roles

---

## Phase 15 — Performance Reviews

**Priority:** Lower — build last, needs all the above as inputs

Formal review cycles pulling together objectives, competencies, 1:1 history, and development plans.

### Data Model

```
ReviewCycle
├── id, workspace_id
├── name, period_start, period_end
├── status (setup, self_assessment, manager_review, calibration, complete)
├── deadline dates for each stage

Review
├── id, cycle_id, user_id, reviewer_id
├── self_assessment (JSONB — structured responses)
├── manager_assessment (JSONB)
├── overall_rating (1-5 or descriptive scale)
├── strengths, areas_for_improvement (text)
├── status (not_started, self_assessment, manager_draft, discussed, finalised)
├── linked_objectives[] (summary of objective achievement)
├── linked_competencies[] (competency assessment snapshot)
└── sign_off_date, signed_off_by
```

### Features

- **Guided review flow** — step-by-step wizard: self-assessment → manager review → discussion → sign-off
- **Evidence linking** — pull in objective progress, 1:1 notes, competency assessments as evidence
- **Calibration view** — manager sees all their reports' ratings in one view for consistency
- **Historical comparison** — rating trend over review periods
- **PDF export** — generate a formatted review document
- **Reminders** — automated nudges for overdue stages

---

## Phase 16 — AI Assistant & Insights

**Priority:** Medium-High — massive force multiplier across all features

Chat interface backed by a local LLM (self-hosted at `http://192.168.0.53:8003`) for natural language queries, canned reports, and intelligent analysis across all Planview data.

### Architecture

```
Frontend                    Backend                     LLM
┌──────────┐   WebSocket   ┌──────────────┐   HTTP    ┌─────────────┐
│ Chat UI  │ ──────────── │ AI Service   │ ────────── │ Local Model │
│          │               │ (context     │            │ (Ollama /   │
│ Quick    │   REST API   │  builder +   │            │  vLLM etc)  │
│ Report   │ ──────────── │  tool calls) │            │ :8003       │
│ Buttons  │               └──────────────┘            └─────────────┘
```

- **Backend AI service** — builds context from DB queries, sends structured prompts to local model
- **Tool-use pattern** — LLM can request data (list team members, get competencies, fetch leave records) via defined functions, backend executes and feeds results back
- **No data leaves the network** — everything stays on-prem, queries hit local model only
- **Configurable endpoint** — `AI_MODEL_URL` env var, defaults to disabled

### Chat Interface

- Slide-out panel (like the existing Taskbox) or dedicated page
- Natural language queries against all Planview data:
  - "Who's on call next week?"
  - "Show me everyone with expiring visas in the next 90 days"
  - "Which competencies does Team Alpha lack compared to Team Bravo?"
  - "Summarise Sarah's last three 1:1s"
  - "Who hasn't had a 1:1 in over a month?"
  - "What's the average objective completion rate this quarter?"
  - "Who has the most outstanding actions from their 1:1s?"
  - "Draft an objective for improving SCADA response times"

### Quick Report Buttons (Canned Reports)

Pre-built one-click reports that use the AI to generate formatted summaries:

| Report | Description |
|--------|-------------|
| Team Health Check | 1:1 cadence, outstanding actions, sentiment trends, leave patterns |
| Compliance Dashboard | All expiring items across the team in the next 90 days |
| Skills Coverage | Competency gaps, single points of failure, training needs |
| Recruitment Pipeline | Open positions, candidate pipeline status, time-to-hire |
| Quarterly People Summary | Objective progress, development plan status, new starters/leavers |
| Workload Analysis | Task distribution, overtime patterns, who's overloaded |
| Absence Patterns | Bradford Factor, absence trends, team impact |
| Review Readiness | Who's completed self-assessment, outstanding reviews, calibration status |

### AI-Powered Features

- **1:1 prep assistant** — before a meeting, AI summarises: outstanding actions, recent objective updates, upcoming compliance items, any concerns from sentiment trend
- **Review draft helper** — AI drafts review narrative based on objective achievements, competency assessments, and 1:1 notes (manager edits and owns the final version)
- **Anomaly detection** — flag unusual patterns: sudden increase in sick days, missed 1:1s, stalled objectives
- **CV analysis** — parse uploaded CVs to auto-populate candidate profiles (skills, experience, qualifications)
- **Smart scheduling** — suggest optimal rota assignments based on fairness (equal distribution), competency requirements, and leave conflicts

### Data Model

```
AIChatSession
├── id, user_id, workspace_id
├── title (auto-generated or user-set)
├── created_at
└── AIChatMessages[]
    ├── id, session_id
    ├── role (user, assistant, system)
    ├── content (text)
    ├── tool_calls (JSONB — what data was queried)
    └── created_at

AIReportRun
├── id, user_id, workspace_id
├── report_type (team_health, compliance, skills, etc.)
├── parameters (JSONB — filters applied)
├── result (text — generated report)
├── created_at
```

---

## Phase 17 — Wellbeing & Engagement

**Priority:** Lower — nice-to-have, builds on sentiment data from 1:1s

### Features

- **Pulse surveys** — quick anonymous 1-5 ratings on team morale, workload, support (weekly/monthly)
- **Wellbeing dashboard** — aggregate sentiment trends from 1:1s + pulse surveys
- **Workload heatmap** — visual of who's overloaded based on task count, hours logged, rota frequency
- **Recognition/kudos** — lightweight peer recognition ("thanks for staying late on the outage") visible in activity feed
- **Return-to-work prompts** — after extended sick leave, prompt manager to schedule a return-to-work meeting with suggested agenda

---

## Phase 18 — Onboarding & Offboarding Checklists

**Priority:** Lower — useful but not critical early on

### Features

- **Onboarding templates** — configurable checklist per role: IT equipment, access requests, inductions, training, buddy assignment, probation milestones
- **Offboarding templates** — equipment return, access revocation, knowledge transfer, exit interview
- **Auto-triggered** — when a candidate status changes to "hired" or a contract end date is reached
- **Progress tracking** — percentage complete, overdue items, assigned owners per checklist item
- **Integration with tasks** — each checklist item can spawn a Planview task assigned to the relevant person (IT, HR, manager, new starter)

---

## Phase 19 — Reporting & Analytics Dashboard

**Priority:** Medium — grows in value as data accumulates

### Features

- **Headcount trends** — starters, leavers, net change over time
- **Diversity metrics** — if data is captured (optional, sensitive)
- **Retention analysis** — average tenure, turnover rate by team/department
- **Training spend** — budget vs actual across development plans
- **Competency coverage over time** — are we getting better or worse?
- **Rota fairness** — are shifts distributed equitably?
- **Leave utilisation** — who's not taking their leave? (burnout risk)
- **Exportable** — PDF and CSV export for all reports
- **Scheduled reports** — email a weekly/monthly summary to managers automatically

---

## Technical Considerations

### Data Model Extension Strategy

All new models follow existing patterns:
- `UUIDPrimaryKey` + `TimestampMixin`
- Workspace-scoped (everything has `workspace_id`)
- Alembic migrations for every schema change
- Pydantic v2 schemas for validation
- Async SQLAlchemy with eager loading

### Privacy & Access Control

People management data is sensitive. Need to add:
- **Row-level access** — managers can only see their direct reports (and transitive reports)
- **Data classification** — some fields visible to the person, some manager-only, some HR-only
- **Audit logging** — who viewed/edited what (extend existing activity service)
- **GDPR tools** — data export (subject access request) and deletion (right to be forgotten)

### Suggested Build Order

| Phase | Feature | Depends On | Effort |
|-------|---------|------------|--------|
| 7 | People Profiles + Org Chart + Photos + Insights + CV Upload | — | Medium |
| 8 | 1:1s & Check-ins | Phase 7 (manager_id) | Medium |
| 9 | Objectives & Targets | Phase 7 | Medium |
| 10 | Contract & Visa Tracking | Phase 7 | Small-Medium |
| 11 | Competence Management | Phase 7 | Medium-Large |
| 12 | Leave Management | Phase 7, extends TimeOff | Small-Medium |
| 13 | Recruitment & Candidates | Phase 7 (for hired conversion) | Medium |
| 14 | Development Plans | Phase 9 + 11 | Medium |
| 15 | Performance Reviews | Phase 8 + 9 + 11 | Large |
| 16 | AI Assistant & Insights | Phase 7+ (more value with more phases) | Medium-Large |
| 17 | Wellbeing & Engagement | Phase 8 (sentiment data) | Small-Medium |
| 18 | Onboarding & Offboarding | Phase 7 + 13 | Small-Medium |
| 19 | Reporting & Analytics | All phases (aggregates data) | Medium |
| 20 | In-App Guide & Help System | Any phase (content grows with features) | Small-Medium |

### Cross-Linking: People ↔ Planning

The real power is that all the people management features connect directly to Planview's existing planning, projects, and team structures. This isn't a separate HR system bolted on — it's one unified view.

| People Feature | Links To Existing | How |
|----------------|-------------------|-----|
| Person Profile | Teams, Projects, Tasks | Profile shows all teams they're in, projects they contribute to, current task load |
| 1:1s | Tasks | Action items become tasks with one click; 1:1 prep pulls in overdue tasks |
| Objectives | Projects, Tasks | Key results can link to project milestones or task completion metrics |
| Competencies | Teams, Rotas | Skills matrix filtered by team; rota assignment constrained by required competencies |
| Contracts | Team Timeline | Contract bars visible on team timeline alongside task bars |
| Leave | Calendar, Rotas | Leave blocks show on calendar and rota views; conflict detection with scheduled shifts |
| Recruitment | Projects, Teams | Hiring tied to a team vacancy; new starter auto-added to relevant teams/projects |
| Development | Tasks, Projects | Training goals create tasks; project assignments count as "experience" development |
| Workload | Timeline, Tasks | AI workload analysis uses task count, time estimates, rota hours, and leave data |
| Reviews | All of the above | Performance review pulls in: task completion rate, objective progress, 1:1 sentiment, competency growth, rota participation |

**Person Profile Page — unified view:**
- Header: photo, name, title, department, manager
- Tabs: Overview | Tasks | Projects | Teams | 1:1s | Objectives | Competencies | Compliance | Leave | Development | Documents
- Overview tab: quick stats (open tasks, next 1:1, objective progress, upcoming leave, expiring compliance items)
- Each tab links to the existing Planview views filtered for that person

**Team View — enhanced:**
- Existing team timeline now shows rota coverage, leave blocks, and contract end dates alongside task bars
- Team health widget: 1:1 cadence, average sentiment, outstanding actions, competency coverage %
- Headcount: current, planned (pending hires), at risk (expiring contracts)

**Dashboard — manager's cockpit:**
- My team: who's in today, who's on leave, who's on call
- Actions needed: overdue 1:1s, pending leave requests, expiring compliance items, review deadlines
- Quick links: next 1:1, recruitment pipeline, team calendar

### Existing Infrastructure That Gets Reused

- **Notifications + Email** — alerts for expiring items, review deadlines, meeting reminders
- **Webhooks** — external integrations (HR systems, Slack, etc.)
- **File attachments** — CVs, certificates, contracts
- **FilePreview** — CV viewing in-browser
- **Timeline component** — people timeline, contract bars, certification markers
- **Board/Kanban** — recruitment pipeline
- **Calendar** — leave calendar, meeting scheduling
- **Burndown/charts** — objective progress, competency coverage
- **Activity feed** — audit trail for all people operations
- **Custom fields** — extend any entity without schema changes
- **Rich text (TipTap)** — 1:1 notes, review narratives, development plans
- **Rotas** — already built, feeds into workforce planning

---

## Phase 20 — In-App Guide & Help System

**Priority:** Medium — essential for adoption, especially for non-technical managers

An interactive "idiot's guide" built into the app that walks users through common workflows step-by-step, with deep links straight to the relevant page/action.

### Features

- **Guide panel** — slide-out panel (or dedicated `/guide` page) with categorised how-to articles
- **Step-by-step flows** — each guide is a numbered sequence with:
  - Description of what you're doing and why
  - Screenshot/illustration of what to look for
  - **Deep link button** — "Go to this step" takes you directly to the relevant page (e.g. `/rotas`, `/settings#webhooks`)
  - What to do next / what happens when you complete this step
- **Contextual help** — `?` icon on each page that opens the guide filtered to that feature
- **Search** — full-text search across all guide content
- **Progress tracking** — optional "Getting Started" checklist that ticks off as you complete setup tasks

### Guide Content Structure

```
GuideCategory
├── id, title, icon, sort_order
└── GuideArticles[]
    ├── id, category_id, title, slug
    ├── summary (one-liner for list view)
    ├── content (markdown — rendered in-app)
    ├── sort_order
    └── GuideSteps[]
        ├── id, article_id, step_number
        ├── title, description (markdown)
        ├── screenshot_url (optional)
        ├── deep_link (e.g. "/rotas", "/settings#security")
        └── tips (optional helper text)
```

### Example Guides

**Getting Started**
| # | Step | Deep Link |
|---|------|-----------|
| 1 | Create your workspace | `/settings` |
| 2 | Invite your team members | `/settings#members` |
| 3 | Create your first project | Sidebar → Projects → + |
| 4 | Add tasks to the board | `/projects/{id}/board` |
| 5 | Switch to timeline view | `/projects/{id}/timeline` |

**Setting Up Rotas**
| # | Step | Deep Link |
|---|------|-----------|
| 1 | Navigate to the Rotas page | `/rotas` |
| 2 | Click "New Rota" and choose your type (Call-out, Weekday, 24h) | `/rotas` → New Rota |
| 3 | Configure times and weekend inclusion | Create modal |
| 4 | Add team members to rota slots | Rota → + button |
| 5 | View the schedule and adjust as needed | `/rotas` |

**Running a 1:1**
| # | Step | Deep Link |
|---|------|-----------|
| 1 | Review outstanding actions from last meeting | `/one-to-ones/{id}` |
| 2 | Add agenda items before the meeting | Meeting detail |
| 3 | During the meeting, capture notes and new actions | Meeting detail |
| 4 | Mark completed actions as done | Actions panel |
| 5 | Incomplete actions automatically carry to next 1:1 | Automatic |

**Setting Objectives for a Report**
| # | Step | Deep Link |
|---|------|-----------|
| 1 | Navigate to the person's profile | `/people/{id}` |
| 2 | Go to their Objectives tab | `/people/{id}#objectives` |
| 3 | Create a new objective with key results | Objectives → + |
| 4 | Review progress in your next 1:1 | `/one-to-ones` |
| 5 | Update progress as milestones are hit | Objective detail |

**Tracking a Visa Renewal**
| # | Step | Deep Link |
|---|------|-----------|
| 1 | Go to the person's profile | `/people/{id}` |
| 2 | Add a compliance item (type: Visa) | Compliance tab → + |
| 3 | Set the expiry date and alert thresholds | Compliance form |
| 4 | Upload supporting documents | Document upload |
| 5 | You'll get automated alerts at 90/60/30 days | Automatic |

**Hiring a New Starter**
| # | Step | Deep Link |
|---|------|-----------|
| 1 | Add candidate to recruitment pipeline | `/recruitment` |
| 2 | Upload their CV | Candidate → Upload CV |
| 3 | Log interview feedback and outcome | Candidate → Events |
| 4 | If hired, convert to person profile | Candidate → "Convert to Person" |
| 5 | Onboarding checklist auto-triggers | Automatic |

### Technical Approach

Two options:
1. **Static markdown files** — guide content as `.md` files in the repo, loaded at build time. Simple, version-controlled, no DB needed. Edit guides by editing markdown.
2. **DB-backed CMS** — guide content in PostgreSQL, editable via a settings/admin panel. More flexible but more work.

Recommendation: start with static markdown (ship fast, iterate on content), migrate to DB-backed later if needed.

### UI Components

- `GuidePanel` — slide-out or page with category navigation
- `GuideArticle` — rendered markdown with step cards
- `GuideStep` — numbered card with description, screenshot, and "Go there" button
- `ContextualHelp` — `?` button component that links to the relevant guide
- `GettingStartedChecklist` — dashboard widget for new users

---

## Open Questions

- **Integration with external HR systems?** — API import/export, or standalone?
- **Multi-workspace people?** — Can someone exist in multiple workspaces (e.g. shared services)?
- **Delegation** — Can a manager delegate 1:1s or reviews to a deputy?
- **360 feedback** — Peer reviews in addition to manager reviews?
- **Succession planning** — Key person risk identification and mitigation tracking?
- **Compensation tracking** — Salary bands, pay review history? (might be too sensitive for this tool)
- **Time & attendance** — Clock in/out, or is that out of scope?
- **Mobile app** — PWA is already in place, but a dedicated mobile app for quick actions (approve leave, check rotas, log 1:1 notes)?
- **API for external tools** — public REST API so other internal tools can pull data (e.g. intranet displaying who's on call)?
- **Notifications channel** — Slack/Teams integration for alerts alongside email?
- **Data backup/restore** — built-in PostgreSQL backup scheduling and one-click restore?
- **Multi-language** — i18n support for international teams?
- **Succession planning** — key person dependency map, "what if X leaves?" impact analysis
- **Org change modelling** — drag-and-drop org chart to model restructures before committing
- **Meeting room / resource booking** — if managing physical spaces too
- **Expense tracking** — per-person or per-team budget tracking for training, travel, equipment
- **Shift swap requests** — rota members can request swaps, manager approves
- **On-call escalation chains** — if the primary doesn't respond, auto-notify the backup
- **Integration with Active Directory / LDAP** — auto-sync people from corporate directory
- **SSO (SAML/OIDC)** — single sign-on for enterprise environments
