"""
Seed script — populates the database with realistic sample data.

Usage:
    cd backend
    python -m seed
"""
import asyncio
import random
from datetime import date, timedelta

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.models import (
    Base, Workspace, User, Team, Client, Project, Segment, Tag,
    Task, Checklist, Comment, Milestone, team_members, task_assignees,
    PersonProfile, Meeting, MeetingAction,
    ReviewPeriod, Objective, KeyResult,
    ComplianceItem, Competency, UserCompetency,
    LeaveAllowance, LeaveRequest,
    Candidate, CandidateEvent,
    DevelopmentPlan, DevelopmentGoal,
    ReviewCycle, Review,
    PulseSurvey, PulseResponse, Kudos,
    OnboardingTemplate, OnboardingTemplateItem, OnboardingChecklist, OnboardingChecklistItem,
    AIChatSession, AIChatMessage,
)
from app.models.development import CareerPathway, DevelopmentMilestone, DevelopmentCheckpoint
from app.models.early_talent import (
    EarlyTalentProgramme, EarlyTalentCohort, EarlyTalentParticipant,
    EarlyTalentRotation, EarlyTalentRotationAssignment, EarlyTalentMilestone,
)
from app.models.lookup import LookupValue
from app.utils.auth import hash_password

random.seed(42)


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

        # Users — 20 people across the org
        users_data = [
            ("Bill Sherwood",      "billforrestuk@gmail.com", "#4186E0", "BS", "owner"),
            ("Bob Smith",          "bob@acme.com",           "#E44332", "BS", "admin"),
            ("Charlie Brown",      "charlie@acme.com",       "#5CBF4D", "CB", "regular"),
            ("Diana Prince",       "diana@acme.com",         "#9B59B6", "DP", "regular"),
            ("Eve Davis",          "eve@acme.com",           "#F0C239", "ED", "regular"),
            ("Frank Wilson",       "frank@acme.com",         "#1ABC9C", "FW", "regular"),
            ("Grace Lee",          "grace@acme.com",         "#E67E22", "GL", "regular"),
            ("Henry Taylor",       "henry@acme.com",         "#3498DB", "HT", "regular"),
            ("Ivy Chen",           "ivy@acme.com",           "#E74C3C", "IC", "regular"),
            ("Jack Morgan",        "jack@acme.com",          "#2ECC71", "JM", "regular"),
            ("Karen Patel",        "karen@acme.com",         "#F39C12", "KP", "regular"),
            ("Liam O'Brien",       "liam@acme.com",          "#8E44AD", "LO", "regular"),
            ("Mia Thompson",       "mia@acme.com",           "#16A085", "MT", "regular"),
            ("Noah Garcia",        "noah@acme.com",          "#D35400", "NG", "regular"),
            ("Olivia Hughes",      "olivia@acme.com",        "#2980B9", "OH", "regular"),
            ("Pete Robinson",      "pete@acme.com",          "#27AE60", "PR", "regular"),
            ("Quinn Foster",       "quinn@acme.com",         "#C0392B", "QF", "regular"),
            ("Rachel Kim",         "rachel@acme.com",        "#7D3C98", "RK", "regular"),
            ("Sam Martinez",       "sam@acme.com",           "#148F77", "SM", "regular"),
            ("Tanya Novak",        "tanya@acme.com",         "#D68910", "TN", "regular"),
        ]
        users = []
        for name, email, colour, initials, role in users_data:
            u = User(
                name=name, email=email, colour=colour, initials=initials,
                password_hash=hash_password("admin" if email == "billforrestuk@gmail.com" else "password123"),
                role=role,
                workspace_id=ws.id,
            )
            db.add(u)
            users.append(u)
        await db.flush()

        # Teams
        teams_data = [
            ("Everyone", list(range(20))),
            ("Engineering", [0, 1, 2, 5, 8, 9, 12, 15]),
            ("Design", [3, 6, 10, 17]),
            ("Marketing", [4, 7, 13, 19]),
            ("Product", [11, 14, 16]),
            ("Data & Analytics", [18, 9, 12]),
        ]
        teams = []
        for tname, member_indices in teams_data:
            t = Team(name=tname, workspace_id=ws.id)
            db.add(t)
            teams.append(t)
        await db.flush()
        for team, (_, member_indices) in zip(teams, teams_data):
            for idx in member_indices:
                await db.execute(team_members.insert().values(team_id=team.id, user_id=users[idx].id))

        # Clients
        clients_data = ["Zenith Industries", "Meridian Group", "Atlas Digital"]
        clients = []
        for cname in clients_data:
            c = Client(name=cname, workspace_id=ws.id)
            db.add(c)
            clients.append(c)
        await db.flush()

        # Projects
        projects_data = [
            ("Website Redesign", "#4186E0", clients[0].id),
            ("Mobile App v3", "#E44332", clients[0].id),
            ("API Platform", "#5CBF4D", clients[1].id),
            ("Marketing Campaign Q1", "#F0C239", None),
            ("Data Pipeline", "#9B59B6", clients[2].id),
            ("Customer Portal", "#1ABC9C", clients[1].id),
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
            ("Design homepage mockup",          projects[0].id, segments[0].id, 0, 3,   "done",        users[3]),
            ("Implement responsive header",     projects[0].id, segments[0].id, 2, 5,   "in_progress", users[1]),
            ("Build product card component",    projects[0].id, segments[1].id, 4, 8,   "planned",     users[2]),
            ("Checkout form validation",        projects[0].id, segments[2].id, 7, 10,  "planned",     users[5]),
            ("Payment gateway integration",     projects[0].id, segments[2].id, 10, 14, "planned",     users[8]),
            ("Setup React Native project",      projects[1].id, None, 0, 2,   "done",        users[1]),
            ("Auth flow screens",               projects[1].id, None, 2, 6,   "in_progress", users[3]),
            ("Push notification setup",         projects[1].id, None, 5, 8,   "planned",     users[9]),
            ("API authentication middleware",   projects[2].id, None, 0, 3,   "done",        users[2]),
            ("Rate limiting implementation",    projects[2].id, None, 3, 5,   "in_progress", users[5]),
            ("OpenAPI documentation",           projects[2].id, None, 5, 7,   "planned",     users[12]),
            ("Social media calendar",           projects[3].id, None, 1, 8,   "in_progress", users[4]),
            ("Blog post drafts",               projects[3].id, None, 3, 10,  "planned",     users[7]),
            ("Email campaign setup",           projects[3].id, None, 8, 14,  "planned",     users[13]),
            ("ETL pipeline for analytics",     projects[4].id, None, 0, 7,   "in_progress", users[18]),
            ("Dashboard visualisations",       projects[4].id, None, 7, 14,  "planned",     users[10]),
            ("Portal login and SSO",           projects[5].id, None, 0, 5,   "in_progress", users[15]),
            ("Customer profile page",          projects[5].id, None, 5, 10,  "planned",     users[6]),
        ]
        task_objects = []
        for tname, pid, sid, d_from, d_to, status, assignee in tasks_data:
            task = Task(
                name=tname, project_id=pid, segment_id=sid,
                workspace_id=ws.id,
                date_from=today + timedelta(days=d_from),
                date_to=today + timedelta(days=d_to),
                status=status, colour=None,
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
                task_id=task.id, user_id=users[0].id,
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

        await db.flush()

        # ========================================
        # LOOKUP / REFERENCE DATA
        # ========================================
        await _seed_lookups(db, ws)

        # ========================================
        # PEOPLE MANAGEMENT SEED DATA
        # ========================================
        await _seed_people(db, ws, users, today)

        await db.commit()
        print(f"Seeded: 1 workspace, {len(users)} users, {len(projects)} projects, {len(task_objects)} tasks")
        print(f"Seeded: people profiles, meetings, objectives, compliance, competencies, leave,")
        print(f"        candidates, development, reviews, wellbeing, onboarding, AI chat")
        print(f"Login: billforrestuk@gmail.com / admin")


async def _seed_lookups(db: AsyncSession, ws):
    """Seed default lookup/reference data for dropdowns."""
    result = await db.execute(text("SELECT count(*) FROM lookup_values WHERE workspace_id = :ws"), {"ws": str(ws.id)})
    if result.scalar_one() > 0:
        return

    DEFAULTS = {
        "department": [
            ("engineering", "Engineering"), ("design", "Design"), ("marketing", "Marketing"),
            ("product", "Product"), ("hr", "HR"), ("finance", "Finance"),
            ("operations", "Operations"), ("sales", "Sales"),
        ],
        "job_title": [
            ("software_engineer", "Software Engineer"), ("senior_engineer", "Senior Engineer"),
            ("lead_engineer", "Lead Engineer"), ("engineering_manager", "Engineering Manager"),
            ("product_manager", "Product Manager"), ("designer", "Designer"),
            ("analyst", "Analyst"), ("devops_engineer", "DevOps Engineer"),
        ],
        "location": [
            ("london", "London"), ("manchester", "Manchester"), ("bristol", "Bristol"),
            ("edinburgh", "Edinburgh"), ("birmingham", "Birmingham"), ("remote", "Remote"),
        ],
        "competency_category": [
            ("technical", "Technical"), ("safety", "Safety"), ("leadership", "Leadership"),
            ("communication", "Communication"), ("compliance", "Compliance"),
            ("domain_knowledge", "Domain Knowledge"),
        ],
        "leave_type": [
            ("annual", "Annual", "#3b82f6"), ("sick", "Sick", "#ef4444"),
            ("compassionate", "Compassionate", "#8b5cf6"), ("toil", "TOIL", "#14b8a6"),
            ("training", "Training", "#f59e0b"), ("unpaid", "Unpaid", "#64748b"),
            ("other", "Other", "#6b7280"),
        ],
        "compliance_item_type": [
            ("certificate", "Certificate", "#3b82f6"), ("visa", "Visa", "#8b5cf6"),
            ("contract", "Contract", "#14b8a6"), ("licence", "Licence", "#f59e0b"),
            ("training", "Training", "#22c55e"), ("dbs_check", "DBS Check", "#ef4444"),
            ("right_to_work", "Right to Work", "#ec4899"),
        ],
        "candidate_source": [
            ("linkedin", "LinkedIn", "#0a66c2"), ("referral", "Referral", "#22c55e"),
            ("website", "Website", "#3b82f6"), ("agency", "Agency", "#f59e0b"),
            ("job_board", "Job Board", "#8b5cf6"), ("internal", "Internal", "#14b8a6"),
            ("other", "Other", "#6b7280"),
        ],
        "event_outcome": [
            ("pass", "Pass", "#22c55e"), ("fail", "Fail", "#ef4444"),
            ("maybe", "Maybe", "#f59e0b"), ("deferred", "Deferred", "#8b5cf6"),
            ("no_show", "No Show", "#64748b"),
        ],
        "onboarding_assignee_role": [
            ("manager", "Manager"), ("it", "IT"), ("hr", "HR"),
            ("new_starter", "New Starter"), ("buddy", "Buddy"), ("facilities", "Facilities"),
        ],
        "kudos_category": [
            ("teamwork", "Teamwork", "#3b82f6"), ("innovation", "Innovation", "#8b5cf6"),
            ("leadership", "Leadership", "#f59e0b"),
            ("above_and_beyond", "Going Above & Beyond", "#22c55e"),
            ("customer_focus", "Customer Focus", "#14b8a6"),
        ],
    }

    for category, items in DEFAULTS.items():
        for i, item in enumerate(items):
            db.add(LookupValue(
                workspace_id=ws.id, category=category,
                value=item[0], label=item[1],
                colour=item[2] if len(item) > 2 else None,
                display_order=i,
            ))
    await db.flush()
    print("Seeded: lookup/reference data")


async def _seed_people(db: AsyncSession, ws, users, today):
    """Seed rich people management data for all 20 users."""
    result = await db.execute(text("SELECT count(*) FROM person_profiles"))
    if result.scalar_one() > 0:
        return

    # --- Person Profiles ---
    profiles_data = [
        # (index, job_title, department, manager_idx, contract_type, location, start_offset_years)
        (0,  "VP of Engineering",         "Engineering",     None, "permanent",   "London",       5),
        (1,  "Senior Developer",          "Engineering",     0,    "permanent",   "London",       4),
        (2,  "Backend Developer",         "Engineering",     0,    "permanent",   "London",       3),
        (3,  "Lead Designer",             "Design",          0,    "permanent",   "Manchester",   4),
        (4,  "Marketing Manager",         "Marketing",       0,    "permanent",   "Manchester",   2),
        (5,  "Platform Engineer",         "Engineering",     1,    "permanent",   "London",       3),
        (6,  "UX Designer",              "Design",          3,    "permanent",   "Manchester",   2),
        (7,  "Content Strategist",        "Marketing",       4,    "permanent",   "London",       1),
        (8,  "Full Stack Developer",      "Engineering",     1,    "permanent",   "Bristol",      2),
        (9,  "DevOps Engineer",           "Engineering",     1,    "permanent",   "London",       3),
        (10, "Product Designer",          "Design",          3,    "permanent",   "Edinburgh",    1),
        (11, "Product Manager",           "Product",         0,    "permanent",   "London",       3),
        (12, "Data Engineer",             "Engineering",     1,    "permanent",   "London",       2),
        (13, "Digital Marketing Exec",    "Marketing",       4,    "fixed_term",  "Manchester",   1),
        (14, "Product Owner",             "Product",         11,   "permanent",   "London",       2),
        (15, "Security Engineer",         "Engineering",     0,    "permanent",   "London",       4),
        (16, "Junior Product Analyst",    "Product",         11,   "fixed_term",  "Bristol",      0),
        (17, "UI Designer",              "Design",          3,    "contractor",  "Remote",       1),
        (18, "Data Scientist",            "Engineering",     1,    "permanent",   "Edinburgh",    2),
        (19, "Marketing Coordinator",     "Marketing",       4,    "fixed_term",  "Manchester",   0),
    ]
    for idx, title, dept, mgr_idx, contract, loc, years in profiles_data:
        pp = PersonProfile(
            user_id=users[idx].id, workspace_id=ws.id,
            job_title=title, department=dept,
            manager_id=users[mgr_idx].id if mgr_idx is not None else None,
            contract_type=contract,
            contract_start=today - timedelta(days=365 * years),
            contract_end=(today + timedelta(days=180)) if contract in ("fixed_term", "contractor") else None,
            probation_end=(today + timedelta(days=90)) if years == 0 else None,
            location=loc,
            phone=f"+44 7700 {900000 + idx:06d}",
            employee_id=f"EMP{100 + idx}",
        )
        db.add(pp)
    await db.flush()

    # --- 1:1 Meetings — 20 meetings across 10 weeks for various pairs ---
    meetings = []
    meeting_pairs = [
        (0, 1), (0, 2), (0, 3), (0, 4), (0, 5),
        (1, 5), (1, 8), (1, 9), (1, 12), (1, 18),
        (3, 6), (3, 10), (3, 17),
        (4, 7), (4, 13), (4, 19),
        (11, 14), (11, 16),
        (0, 11), (0, 15),
    ]
    moods = ["good", "neutral", "good", "concern", "good", "good", "neutral", "good"]
    for i, (mgr_idx, rep_idx) in enumerate(meeting_pairs):
        weeks_ago = 10 - i
        sched = today - timedelta(weeks=weeks_ago) if i < 14 else today + timedelta(weeks=i - 13)
        completed = i < 14
        m = Meeting(
            workspace_id=ws.id,
            manager_id=users[mgr_idx].id,
            report_id=users[rep_idx].id,
            scheduled_date=sched,
            actual_date=sched if completed else None,
            status="completed" if completed else "scheduled",
            mood=moods[i % len(moods)] if completed else None,
            notes=f"Regular 1:1 — discussed progress and blockers" if completed else None,
        )
        db.add(m)
        meetings.append(m)
    await db.flush()

    # Meeting actions
    action_titles = [
        "Follow up on deployment pipeline", "Review PR backlog",
        "Schedule design review", "Update project timeline",
        "Prepare training materials", "Set up monitoring dashboards",
        "Review code coverage targets", "Investigate CI failures",
        "Draft career development plan", "Book team retrospective",
        "Chase vendor for licence renewal", "Prepare sprint demo",
        "Update risk register", "Arrange knowledge-sharing session",
        "Write onboarding docs for new starters", "Review budget forecast",
    ]
    for i, mtg in enumerate(meetings[:14]):
        for j in range(2):
            a = MeetingAction(
                meeting_id=mtg.id,
                title=action_titles[(i * 2 + j) % len(action_titles)],
                status="done" if i < 10 else "open",
                owner_id=users[meeting_pairs[i][1]].id,
            )
            db.add(a)
    await db.flush()

    # --- Objectives & Key Results ---
    period_h1 = ReviewPeriod(
        workspace_id=ws.id, name="2026 H1",
        start_date=date(2026, 1, 1), end_date=date(2026, 6, 30),
    )
    period_h2 = ReviewPeriod(
        workspace_id=ws.id, name="2025 H2",
        start_date=date(2025, 7, 1), end_date=date(2025, 12, 31),
    )
    db.add_all([period_h1, period_h2])
    await db.flush()

    obj_data = [
        # (title, user_idx, category, status, progress, period)
        ("Reduce API P95 latency below 200ms",                 0,  "performance",  "active",    65, period_h1),
        ("Ship mobile app v3.0 to App Store",                  1,  "business",     "active",    45, period_h1),
        ("Achieve 90% test coverage on core modules",          2,  "performance",  "active",    70, period_h1),
        ("Redesign onboarding user flow",                      3,  "business",     "active",    30, period_h1),
        ("Launch Q1 multi-channel marketing campaign",         4,  "business",     "completed", 100, period_h1),
        ("Implement WCAG 2.1 AA accessibility across portal",  5,  "development",  "active",    20, period_h1),
        ("Reduce deployment time to under 5 minutes",          9,  "performance",  "active",    80, period_h1),
        ("Create comprehensive design system documentation",   6,  "development",  "active",    55, period_h1),
        ("Migrate entire data layer to async",                 12, "performance",  "completed", 100, period_h1),
        ("Increase social media engagement by 25%",            7,  "business",     "active",    40, period_h1),
        ("Implement zero-trust security architecture",         15, "performance",  "active",    35, period_h1),
        ("Build real-time analytics dashboard",                18, "business",     "active",    50, period_h1),
        ("Establish product discovery framework",              11, "development",  "active",    25, period_h1),
        ("Reduce customer support tickets by 30%",             14, "business",     "active",    15, period_h1),
        ("Launch employee referral programme",                 4,  "business",     "active",    60, period_h1),
        ("Containerise all legacy services",                   9,  "performance",  "active",    75, period_h1),
        ("Design component library v2",                        10, "development",  "active",    40, period_h1),
        ("Implement automated compliance reporting",           15, "performance",  "active",    10, period_h1),
        ("Build ML model for churn prediction",                18, "business",     "draft",     0,  period_h1),
        ("Migrate CI/CD to GitHub Actions",                    8,  "performance",  "active",    90, period_h1),
        ("Create customer feedback loop process",              11, "business",     "active",    35, period_h1),
        ("Develop brand guidelines v3",                        3,  "development",  "active",    70, period_h1),
        ("Optimise database query performance",                12, "performance",  "active",    55, period_h1),
        ("Improve NPS score from 42 to 55",                    14, "business",     "active",    20, period_h1),
        ("Reduce infrastructure costs by 20%",                 9,  "performance",  "cancelled", 30, period_h1),
        # Prior period — completed
        ("Launch website redesign",                            0,  "business",     "completed", 100, period_h2),
        ("Hire 5 engineers",                                   0,  "business",     "completed", 100, period_h2),
        ("Set up design system foundations",                   3,  "development",  "completed", 100, period_h2),
        ("Implement SSO across all products",                  15, "performance",  "completed", 100, period_h2),
        ("Run first pulse survey",                             4,  "business",     "completed", 100, period_h2),
    ]
    objectives = []
    for title, u_idx, cat, status, progress, period in obj_data:
        obj = Objective(
            workspace_id=ws.id, user_id=users[u_idx].id,
            review_period_id=period.id, title=title,
            category=cat, status=status, progress=progress,
        )
        db.add(obj)
        objectives.append(obj)
    await db.flush()

    # Key results for active objectives
    kr_data = [
        (0,  "P95 latency < 200ms",                200,  280,   "ms"),
        (0,  "P99 latency < 500ms",                500,  620,   "ms"),
        (1,  "Complete App Store submission",       1,    0,     "milestone"),
        (1,  "Pass all QA regression tests",       100,  78,    "%"),
        (2,  "Core module coverage >= 90%",         90,   72,    "%"),
        (2,  "Zero critical untested paths",        0,    3,     "count"),
        (3,  "User testing score >= 4.5",           4.5,  3.2,   "score"),
        (3,  "Reduce onboarding drop-off to <10%",  10,   22,    "%"),
        (5,  "Automated a11y scan pass rate 100%",  100,  65,    "%"),
        (6,  "Mean deploy time < 300s",             300,  380,   "seconds"),
        (6,  "Zero failed deployments per sprint",  0,    1,     "count"),
        (7,  "Components documented in Storybook",  50,   28,    "components"),
        (10, "Security audit findings resolved",    0,    4,     "count"),
        (10, "Penetration test pass rate",          100,  85,    "%"),
        (11, "Dashboard MAU > 500",                 500,  230,   "users"),
        (12, "Discovery sessions per quarter",      12,   3,     "sessions"),
        (15, "Legacy services containerised",       8,    6,     "services"),
        (19, "CI build time < 3 minutes",           180,  195,   "seconds"),
        (22, "Slow queries eliminated",             0,    12,    "count"),
    ]
    for obj_idx, title, target, current, unit in kr_data:
        kr = KeyResult(
            objective_id=objectives[obj_idx].id,
            title=title, target_value=target,
            current_value=current, unit=unit,
        )
        db.add(kr)
    await db.flush()

    # --- Compliance — lots of items with varied expiry dates ---
    compliance_data = [
        # (user_idx, type, title, status, expiry_offset_days)
        (0,  "certification",  "AWS Solutions Architect Pro",     "active",        365),
        (0,  "dbs_check",      "DBS Enhanced Check",             "active",        540),
        (0,  "certification",  "ISO 27001 Lead Auditor",         "expiring_soon", 60),
        (1,  "right_to_work",  "UK Right to Work (Settled)",     "active",        1800),
        (1,  "certification",  "CSCS Card",                      "expiring_soon", 25),
        (1,  "certification",  "Certified Scrum Master",         "active",        300),
        (2,  "right_to_work",  "UK Right to Work (Pre-Settled)", "expiring_soon", 45),
        (2,  "certification",  "First Aid at Work",              "expired",       -10),
        (2,  "certification",  "AWS Developer Associate",        "active",        200),
        (3,  "contract",       "Employment Contract",            "active",        1000),
        (3,  "certification",  "PRINCE2 Practitioner",           "active",        400),
        (4,  "dbs_check",      "DBS Basic Check",                "expired",       -5),
        (4,  "certification",  "Google Analytics 4 Cert",        "active",        280),
        (5,  "certification",  "Kubernetes CKA",                 "active",        180),
        (5,  "certification",  "Terraform Associate",            "expiring_soon", 30),
        (6,  "right_to_work",  "UK Right to Work",               "active",        700),
        (7,  "certification",  "HubSpot Content Marketing",      "active",        350),
        (8,  "right_to_work",  "BRP Card",                       "expiring_soon", 20),
        (8,  "certification",  "Azure Developer Associate",      "active",        240),
        (9,  "certification",  "Docker Certified Associate",     "expired",       -15),
        (9,  "certification",  "AWS SysOps Administrator",       "active",        150),
        (10, "contract",       "Employment Contract",            "active",        900),
        (11, "certification",  "Certified Product Manager",      "active",        320),
        (12, "certification",  "Snowflake Data Engineer",        "expiring_soon", 40),
        (12, "right_to_work",  "UK Right to Work (Visa)",        "expiring_soon", 55),
        (13, "contract",       "Fixed-Term Contract",            "expiring_soon", 75),
        (13, "certification",  "Google Ads Certification",       "active",        260),
        (14, "certification",  "Professional Scrum PO",          "active",        420),
        (15, "certification",  "CISSP",                          "active",        500),
        (15, "certification",  "CEH v12",                        "expiring_soon", 35),
        (15, "dbs_check",      "DBS Enhanced Check",             "active",        480),
        (16, "contract",       "Fixed-Term Contract",            "active",        180),
        (17, "contract",       "Contractor Agreement",           "expiring_soon", 50),
        (17, "right_to_work",  "UK Right to Work",               "active",        600),
        (18, "certification",  "TensorFlow Developer Cert",      "active",        270),
        (18, "certification",  "GCP Professional Data Eng",      "expired",       -20),
        (19, "contract",       "Fixed-Term Contract",            "expiring_soon", 65),
        (19, "dbs_check",      "DBS Basic Check",                "active",        350),
    ]
    for u_idx, item_type, title, status, expiry_offset in compliance_data:
        ci = ComplianceItem(
            workspace_id=ws.id, user_id=users[u_idx].id,
            item_type=item_type, title=title, status=status,
            expiry_date=today + timedelta(days=expiry_offset),
            alert_days=[90, 60, 30, 14, 7],
        )
        db.add(ci)
    await db.flush()

    # --- Competencies ---
    comp_data = [
        ("Python",              "technical",   True,  24),
        ("TypeScript/React",    "technical",   False, None),
        ("AWS",                 "technical",   True,  12),
        ("Kubernetes",          "technical",   True,  24),
        ("Project Management",  "management",  False, None),
        ("Communication",       "soft_skill",  False, None),
        ("Cyber Security",      "technical",   True,  12),
        ("Data Analysis",       "technical",   False, None),
        ("Leadership",          "management",  False, None),
        ("UX Research",         "technical",   False, None),
        ("CI/CD & DevOps",      "technical",   False, None),
        ("SQL & Databases",     "technical",   False, None),
        ("Machine Learning",    "technical",   True,  24),
        ("Agile/Scrum",         "management",  False, None),
        ("Stakeholder Mgmt",   "soft_skill",  False, None),
    ]
    competencies = []
    for name, cat, requires_cert, validity in comp_data:
        c = Competency(
            workspace_id=ws.id, name=name, category=cat,
            requires_certification=requires_cert,
            certification_validity_months=validity,
            levels=["awareness", "practitioner", "expert"],
        )
        db.add(c)
        competencies.append(c)
    await db.flush()

    # User competency assignments — wide coverage
    levels = ["awareness", "practitioner", "expert"]
    uc_assignments = [
        # Engineering
        (0,  0, 2), (0,  2, 2), (0,  6, 2), (0,  8, 2), (0, 11, 2), (0, 14, 2),
        (1,  0, 1), (1,  1, 2), (1,  5, 1), (1, 10, 1), (1, 11, 1), (1, 13, 1),
        (2,  0, 2), (2,  2, 1), (2,  7, 1), (2, 11, 2), (2,  3, 0),
        (5,  0, 1), (5,  3, 2), (5, 10, 2), (5,  2, 1), (5, 11, 1),
        (8,  0, 1), (8,  1, 2), (8,  2, 0), (8, 10, 1), (8, 11, 1),
        (9,  0, 0), (9,  2, 2), (9,  3, 2), (9, 10, 2), (9, 11, 1),
        (12, 0, 2), (12, 7, 2), (12, 11, 2), (12, 12, 1),
        (15, 0, 1), (15, 6, 2), (15, 2, 1), (15, 3, 1), (15, 10, 1),
        (18, 0, 2), (18, 7, 2), (18, 12, 2), (18, 11, 1),
        # Design
        (3,  1, 2), (3,  9, 2), (3,  5, 2), (3, 14, 1), (3,  4, 1), (3, 8, 1),
        (6,  1, 1), (6,  9, 2), (6,  5, 1), (6, 13, 0),
        (10, 1, 1), (10, 9, 1), (10, 5, 1), (10, 13, 1),
        (17, 1, 2), (17, 9, 1), (17, 5, 0),
        # Marketing
        (4,  5, 2), (4,  4, 1), (4,  7, 1), (4, 14, 2), (4,  8, 1),
        (7,  5, 2), (7, 14, 1), (7, 13, 0),
        (13, 5, 1), (13, 7, 0), (13, 13, 0),
        (19, 5, 0), (19, 13, 0),
        # Product
        (11, 4, 2), (11, 5, 2), (11, 13, 2), (11, 14, 2), (11, 8, 1),
        (14, 4, 1), (14, 13, 1), (14, 14, 1), (14, 5, 1),
        (16, 7, 0), (16, 13, 0), (16, 5, 0),
    ]
    for user_idx, comp_idx, level_idx in uc_assignments:
        expiry = None
        if competencies[comp_idx].requires_certification:
            expiry = today + timedelta(days=random.randint(30, 365))
        uc = UserCompetency(
            user_id=users[user_idx].id,
            competency_id=competencies[comp_idx].id,
            workspace_id=ws.id,
            level=levels[level_idx],
            assessed_date=today - timedelta(days=random.randint(30, 180)),
            assessed_by=users[0].id,
            expiry_date=expiry,
        )
        db.add(uc)
    await db.flush()

    # --- Leave ---
    year = today.year
    for i, u in enumerate(users):
        entitlement = 25 if i < 15 else 20  # contractors/FTC get less
        used = random.randint(2, 12)
        booked = random.randint(0, 5)
        la = LeaveAllowance(
            workspace_id=ws.id, user_id=u.id,
            year=year, entitlement_days=entitlement,
            carried_forward=random.randint(0, 5),
            used_days=used, booked_days=booked,
        )
        db.add(la)
    await db.flush()

    leave_requests = [
        # (user_idx, type, start_offset, end_offset, days, status)
        (1,  "annual",         5,  10,  5, "approved"),
        (1,  "annual",         40, 42,  2, "pending"),
        (2,  "sick",           -3, -1,  3, "approved"),
        (3,  "annual",         14, 21,  5, "approved"),
        (3,  "training",       35, 36,  2, "pending"),
        (4,  "annual",         7,  14,  5, "approved"),
        (0,  "toil",           3,  3,   1, "approved"),
        (5,  "annual",         20, 27,  5, "approved"),
        (6,  "annual",         10, 12,  2, "approved"),
        (7,  "sick",           -5, -4,  2, "approved"),
        (8,  "annual",         30, 35,  4, "pending"),
        (9,  "annual",         15, 19,  4, "approved"),
        (9,  "compassionate",  45, 47,  3, "pending"),
        (10, "annual",         8,  12,  4, "approved"),
        (11, "training",       25, 27,  3, "approved"),
        (12, "annual",         18, 22,  4, "approved"),
        (13, "annual",         5,  9,   4, "approved"),
        (14, "sick",           -2, -1,  2, "approved"),
        (15, "annual",         50, 55,  4, "pending"),
        (16, "annual",         12, 14,  2, "approved"),
        (17, "unpaid",         30, 34,  5, "pending"),
        (18, "annual",         22, 26,  4, "approved"),
        (19, "annual",         6,  8,   2, "approved"),
        (19, "sick",           -7, -5,  3, "approved"),
        (2,  "compassionate",  55, 57,  3, "pending"),
        (5,  "training",       60, 62,  3, "approved"),
        (8,  "annual",         65, 72,  5, "pending"),
        (12, "sick",           -1, -1,  1, "approved"),
    ]
    for u_idx, leave_type, start_off, end_off, days, status in leave_requests:
        lr = LeaveRequest(
            workspace_id=ws.id, user_id=users[u_idx].id,
            leave_type=leave_type,
            start_date=today + timedelta(days=start_off),
            end_date=today + timedelta(days=end_off),
            days=days, status=status,
            approved_by=users[0].id if status == "approved" else None,
        )
        db.add(lr)
    await db.flush()

    # --- Recruitment — 15 candidates at various stages ---
    cand_data = [
        ("Alice Johnson",     "alice.j@mail.com",       "Senior Developer",     "screening",     "referral",  -25),
        ("Frank Wilson",      "frank.w@mail.com",       "DevOps Engineer",      "interviewing",  "agency",    -30),
        ("Grace Lee",         "grace.l@mail.com",       "UX Designer",          "interviewing",  "direct",    -20),
        ("Henry Taylor",      "henry.t@mail.com",       "Marketing Analyst",    "offered",       "direct",    -35),
        ("Ivy Chen",          "ivy.c@mail.com",         "Backend Developer",    "hired",         "internal",  -45),
        ("James Wright",      "james.w@mail.com",       "Platform Engineer",    "applied",       "agency",    -5),
        ("Kim Nakamura",      "kim.n@mail.com",         "Data Scientist",       "screening",     "direct",    -12),
        ("Luca Bianchi",      "luca.b@mail.com",        "Senior Developer",     "interviewing",  "referral",  -18),
        ("Maria Santos",      "maria.s@mail.com",       "Product Designer",     "applied",       "direct",    -3),
        ("Nadia Popov",       "nadia.p@mail.com",       "Security Engineer",    "offered",       "agency",    -40),
        ("Omar Hassan",       "omar.h@mail.com",        "Full Stack Developer", "rejected",      "direct",    -50),
        ("Priya Sharma",      "priya.s@mail.com",       "QA Engineer",          "applied",       "referral",  -8),
        ("Ravi Patel",        "ravi.p@mail.com",        "DevOps Engineer",      "screening",     "agency",    -15),
        ("Sofia Eriksson",    "sofia.e@mail.com",       "UX Researcher",        "withdrawn",     "direct",    -22),
        ("Tom Mbeki",         "tom.m@mail.com",         "Junior Developer",     "interviewing",  "internal",  -14),
    ]
    candidates = []
    for name, email, position, status, source, applied_off in cand_data:
        c = Candidate(
            workspace_id=ws.id, name=name, email=email,
            position_applied=position, status=status,
            source=source, applied_date=today + timedelta(days=applied_off),
        )
        db.add(c)
        candidates.append(c)
    await db.flush()

    # Candidate events — progression through pipeline
    event_types_list = ["cv_review", "phone_screen", "interview", "technical_test", "offer"]
    status_to_events = {
        "applied": 0, "screening": 1, "interviewing": 3,
        "offered": 4, "hired": 5, "rejected": 3, "withdrawn": 2,
    }
    for cand in candidates:
        num_events = status_to_events.get(cand.status, 1)
        for j in range(min(num_events, len(event_types_list))):
            outcome = "pass"
            if cand.status == "rejected" and j == num_events - 1:
                outcome = "fail"
            elif j == num_events - 1 and cand.status in ("screening", "interviewing"):
                outcome = "maybe"
            ce = CandidateEvent(
                candidate_id=cand.id,
                event_type=event_types_list[j],
                event_date=cand.applied_date + timedelta(days=3 + j * 4),
                interviewer_id=users[random.randint(0, 4)].id,
                outcome=outcome,
                notes=f"{event_types_list[j].replace('_', ' ').title()} completed",
                rejection_reason="Skills not aligned with role requirements" if outcome == "fail" else None,
            )
            db.add(ce)
    await db.flush()

    # --- Development Plans — one per user, varied states ---
    dev_plans = []
    aspirations = [
        "CTO", "Tech Lead", "Principal Engineer", "Design Director", "CMO",
        "Staff Engineer", "Head of Design", "Content Director", "Architect",
        "Site Reliability Lead", "Head of Product Design", "VP Product",
        "Data Engineering Lead", "Head of Digital", "CPO", "CISO",
        "Senior Analyst", "Creative Director", "Chief Data Officer", "Marketing Director",
    ]
    plan_statuses = (
        ["active"] * 14 + ["draft"] * 3 + ["completed"] * 2 + ["archived"]
    )
    for i, u in enumerate(users):
        dp = DevelopmentPlan(
            workspace_id=ws.id, user_id=u.id,
            review_period_id=period_h1.id,
            status=plan_statuses[i],
            career_aspiration=aspirations[i],
        )
        db.add(dp)
        dev_plans.append(dp)
    await db.flush()

    goal_data = [
        # (plan_idx, title, type, status, target_offset, cost)
        (0,  "Complete TOGAF certification",               "training",       "in_progress",  60,   2500),
        (0,  "Lead architecture review board",             "experience",     "not_started",  90,   None),
        (0,  "Present at QCon conference",                 "experience",     "completed",    -30,  1200),
        (1,  "Complete system design course",              "training",       "in_progress",  45,   800),
        (1,  "Lead cross-team feature delivery",           "experience",     "not_started",  120,  None),
        (1,  "Mentor two junior developers",               "mentoring",      "in_progress",  90,   None),
        (2,  "AWS Solutions Architect certification",      "qualification",  "in_progress",  75,   300),
        (2,  "Contribute to open-source project",          "project",        "completed",    -15,  None),
        (3,  "Complete Nielsen Norman UX certification",   "qualification",  "not_started",  100,  4000),
        (3,  "Run 5 user research sessions",               "experience",     "in_progress",  60,   500),
        (3,  "Build design system component library",      "project",        "in_progress",  90,   None),
        (4,  "Google Ads certification",                   "training",       "completed",    -20,  None),
        (4,  "Run first A/B testing programme",            "project",        "in_progress",  45,   2000),
        (5,  "CKA Kubernetes certification",               "qualification",  "in_progress",  50,   395),
        (5,  "Build internal platform tooling",            "project",        "not_started",  120,  None),
        (6,  "Attend Figma Config conference",             "training",       "completed",    -45,  800),
        (6,  "Shadow product manager for a sprint",        "mentoring",      "in_progress",  30,   None),
        (7,  "Complete content strategy course",           "training",       "in_progress",  60,   600),
        (8,  "Full-stack project ownership end-to-end",    "experience",     "in_progress",  90,   None),
        (8,  "Complete React Advanced workshop",           "training",       "completed",    -10,  450),
        (9,  "HashiCorp Terraform Associate cert",         "qualification",  "not_started",  80,   250),
        (9,  "Lead incident response improvements",        "experience",     "in_progress",  60,   None),
        (10, "Run design sprint workshops",                "experience",     "not_started",  100,  None),
        (11, "Product analytics deep-dive course",         "training",       "in_progress",  45,   900),
        (11, "Present strategy to exec team",              "experience",     "not_started",  90,   None),
        (12, "Databricks certified associate",             "qualification",  "in_progress",  55,   300),
        (12, "Build automated data quality pipeline",      "project",        "not_started",  120,  None),
        (13, "SEO masterclass certification",              "training",       "completed",    -25,  200),
        (14, "Pragmatic Institute PMC cert",               "qualification",  "not_started",  100,  2800),
        (15, "OSCP certification",                         "qualification",  "in_progress",  90,   1599),
        (15, "Lead red team exercise",                     "experience",     "not_started",  120,  None),
        (16, "SQL and data analysis bootcamp",             "training",       "in_progress",  30,   400),
        (17, "Framer and prototyping masterclass",         "training",       "not_started",  60,   350),
        (18, "MLOps specialisation (Coursera)",            "training",       "in_progress",  75,   500),
        (18, "Publish internal ML best practices guide",   "project",        "not_started",  90,   None),
        (19, "Marketing automation certification",         "training",       "not_started",  80,   300),
    ]
    for plan_idx, title, goal_type, status, target_off, cost in goal_data:
        dg = DevelopmentGoal(
            plan_id=dev_plans[plan_idx].id,
            title=title, goal_type=goal_type,
            status=status,
            target_date=today + timedelta(days=target_off),
            cost_estimate=cost,
        )
        db.add(dg)
    await db.flush()

    # --- Reviews ---
    cycle_current = ReviewCycle(
        workspace_id=ws.id, name="2026 Annual Review",
        period_start=date(2026, 1, 1), period_end=date(2026, 6, 30),
        status="manager_review",
    )
    cycle_prev = ReviewCycle(
        workspace_id=ws.id, name="2025 Annual Review",
        period_start=date(2025, 1, 1), period_end=date(2025, 12, 31),
        status="complete",
    )
    db.add_all([cycle_current, cycle_prev])
    await db.flush()

    # Current cycle reviews — various stages
    current_review_data = [
        # (user_idx, reviewer_idx, status, rating, strengths, improvements)
        (0,  0,  "finalised",        5, "Exceptional technical leadership, drives architectural excellence", "Could delegate more to develop others"),
        (1,  0,  "finalised",        4, "Strong coding skills, reliable delivery, good mentor", "Needs to improve estimation accuracy"),
        (2,  0,  "discussed",        3, "Solid backend skills, improving steadily", "Should take on more ownership of features"),
        (3,  0,  "finalised",        4, "Outstanding design thinking, elevates team standards", "Could be more assertive in stakeholder discussions"),
        (4,  0,  "manager_draft",    None, None, None),
        (5,  1,  "finalised",        4, "Excellent platform engineering, strong K8s skills", "Needs better documentation habits"),
        (6,  3,  "discussed",        3, "Good UX instincts, growing well", "Should develop stronger visual design skills"),
        (7,  4,  "self_assessment",  None, None, None),
        (8,  1,  "discussed",        4, "Versatile full-stack skills, fast learner", "Could improve code review thoroughness"),
        (9,  1,  "finalised",        5, "Outstanding DevOps expertise, hero in production incidents", "Should share knowledge more proactively"),
        (10, 3,  "self_assessment",  None, None, None),
        (11, 0,  "finalised",        4, "Strong product sense, good stakeholder management", "Needs to develop data-driven decision making"),
        (12, 1,  "manager_draft",    None, None, None),
        (13, 4,  "not_started",      None, None, None),
        (14, 11, "discussed",        3, "Improving product ownership skills", "Needs to develop technical understanding"),
        (15, 0,  "finalised",        5, "Exceptional security knowledge, keeps us safe", "Could improve presentation skills for non-technical audiences"),
        (16, 11, "not_started",      None, None, None),
        (17, 3,  "self_assessment",  None, None, None),
        (18, 1,  "finalised",        4, "Strong data science skills, innovative approaches", "Should align work more closely with business outcomes"),
        (19, 4,  "not_started",      None, None, None),
    ]
    for u_idx, rev_idx, status, rating, strengths, improvements in current_review_data:
        r = Review(
            cycle_id=cycle_current.id, workspace_id=ws.id,
            user_id=users[u_idx].id, reviewer_id=users[rev_idx].id,
            status=status, overall_rating=rating,
            strengths=strengths, areas_for_improvement=improvements,
            sign_off_date=(today - timedelta(days=random.randint(1, 20))) if status == "finalised" else None,
        )
        db.add(r)

    # Previous cycle — all finalised
    prev_ratings = [4, 3, 3, 4, 3, 3, 3, 3, 4, 4, 3, 4, 3, 3, 3, 5, 3, 3, 4, 3]
    for i in range(min(len(users), 20)):
        r = Review(
            cycle_id=cycle_prev.id, workspace_id=ws.id,
            user_id=users[i].id, reviewer_id=users[0].id,
            status="finalised", overall_rating=prev_ratings[i],
            strengths="Good performance during the period",
            areas_for_improvement="Continue developing in current role",
            sign_off_date=date(2025, 12, 15),
        )
        db.add(r)
    await db.flush()

    # --- Wellbeing — 4 surveys across 4 months ---
    surveys = []
    survey_data = [
        ("January Pulse",  "closed",  date(2026, 1, 31)),
        ("February Pulse", "closed",  date(2026, 2, 28)),
        ("March Pulse",    "closed",  date(2026, 3, 31)),
        ("April Pulse",    "active",  date(2026, 4, 30)),
    ]
    for title, status, end in survey_data:
        s = PulseSurvey(workspace_id=ws.id, title=title, status=status, end_date=end)
        db.add(s)
        surveys.append(s)
    await db.flush()

    # Responses — most people respond to each survey, with realistic variation
    for survey_idx, survey in enumerate(surveys):
        respondents = list(range(20))
        # Not everyone responds — simulate ~80% response rate
        random.shuffle(respondents)
        respondents = respondents[:random.randint(14, 18)]
        for u_idx in respondents:
            # Simulate trends: morale dipping then recovering
            base_morale = [3.5, 3.2, 3.8, 4.0][survey_idx]
            base_workload = [3.0, 3.5, 3.2, 2.8][survey_idx]
            base_support = [3.8, 3.5, 4.0, 4.2][survey_idx]
            morale = max(1, min(5, round(base_morale + random.uniform(-1.5, 1.5))))
            workload = max(1, min(5, round(base_workload + random.uniform(-1.5, 1.5))))
            support = max(1, min(5, round(base_support + random.uniform(-1.5, 1.5))))
            comments = None
            if morale <= 2:
                comments = random.choice([
                    "Feeling a bit overwhelmed with workload recently",
                    "Would appreciate more clarity on team priorities",
                    "Struggling to maintain work-life balance",
                ])
            elif morale >= 4:
                comments = random.choice([
                    "Things are going well, enjoying the current projects",
                    "Great team atmosphere lately",
                    "Feeling productive and supported",
                    None, None,  # Most happy people don't comment
                ])
            pr = PulseResponse(
                survey_id=survey.id, user_id=users[u_idx].id,
                morale=morale, workload=workload, support=support,
                comments=comments,
            )
            db.add(pr)
    await db.flush()

    # Kudos — 20 entries spread across teams
    kudos_messages = [
        (0,  1,  "Outstanding work on the API migration — zero downtime!"),
        (1,  2,  "Thanks for the thorough code review, caught a nasty bug"),
        (3,  6,  "The new dashboard designs are absolutely brilliant"),
        (0,  3,  "Love the new design system — it's transformed our velocity"),
        (2,  0,  "Thanks for unblocking the deployment pipeline issue"),
        (4,  7,  "Great blog post — the engagement numbers are incredible"),
        (9,  5,  "Your Kubernetes setup saved us hours of debugging"),
        (1,  8,  "Brilliant full-stack work on the customer portal"),
        (11, 14, "Excellent product discovery work — really insightful"),
        (3,  10, "Beautiful component library — the team loves it"),
        (15, 9,  "Thanks for the quick incident response last night"),
        (0,  15, "The security audit report was exceptional work"),
        (4,  13, "Great social media campaign — best metrics this quarter"),
        (18, 12, "Solid data pipeline work — love the monitoring you added"),
        (1,  18, "Impressive ML model accuracy — well researched approach"),
        (11, 16, "Great analysis work — really helped shape the roadmap"),
        (6,  17, "Stunning UI work on the new feature — pixel perfect"),
        (0,  11, "Excellent product strategy presentation to the board"),
        (5,  9,  "Thanks for the Terraform modules — massive time saver"),
        (7,  4,  "Brilliant campaign strategy — exceeding all targets"),
    ]
    for from_idx, to_idx, msg in kudos_messages:
        k = Kudos(
            workspace_id=ws.id,
            from_user_id=users[from_idx].id,
            to_user_id=users[to_idx].id,
            message=msg,
        )
        db.add(k)
    await db.flush()

    # --- Onboarding ---
    # Templates
    templates_data = [
        ("Engineering Onboarding", "onboarding", "Full onboarding for engineering hires"),
        ("General Onboarding",     "onboarding", "Standard onboarding for all departments"),
        ("Offboarding Process",    "offboarding", "Standard offboarding checklist"),
    ]
    templates = []
    for tname, ttype, desc in templates_data:
        tmpl = OnboardingTemplate(
            workspace_id=ws.id, name=tname,
            template_type=ttype, description=desc,
        )
        db.add(tmpl)
        templates.append(tmpl)
    await db.flush()

    eng_items = [
        ("IT setup — laptop, monitors, peripherals", "it", 0),
        ("Create accounts — GitHub, Jira, Slack, AWS", "it", 1),
        ("HR induction session", "hr", 2),
        ("Meet the team lunch", "manager", 3),
        ("Dev environment setup walkthrough", "manager", 4),
        ("Complete security awareness training", "new_starter", 5),
        ("Review architecture documentation", "new_starter", 6),
        ("First week 1:1 with manager", "manager", 7),
        ("Pair programming session with buddy", "manager", 8),
        ("Set initial 90-day objectives", "new_starter", 9),
        ("Building access and security badge", "it", 10),
        ("Complete code review training", "new_starter", 11),
    ]
    for title, role, order in eng_items:
        ti = OnboardingTemplateItem(
            template_id=templates[0].id,
            title=title, default_assignee_role=role, sort_order=order,
        )
        db.add(ti)

    general_items = [
        ("IT setup — laptop and accounts", "it", 0),
        ("HR induction session", "hr", 1),
        ("Meet the team lunch", "manager", 2),
        ("Complete compliance training", "new_starter", 3),
        ("First week check-in with manager", "manager", 4),
        ("Set initial objectives", "new_starter", 5),
        ("Building access and security badge", "it", 6),
    ]
    for title, role, order in general_items:
        ti = OnboardingTemplateItem(
            template_id=templates[1].id,
            title=title, default_assignee_role=role, sort_order=order,
        )
        db.add(ti)
    await db.flush()

    # Active onboarding checklists — 3 recent starters
    checklist_data = [
        (16, templates[0], 8),   # Quinn — engineering, 8 of 12 done
        (19, templates[1], 4),   # Tanya — general, 4 of 7 done
        (17, templates[1], 6),   # Rachel — general, 6 of 7 done
    ]
    for u_idx, template, items_done in checklist_data:
        cl = OnboardingChecklist(
            workspace_id=ws.id, user_id=users[u_idx].id,
            template_id=template.id, checklist_type="onboarding",
            status="in_progress",
        )
        db.add(cl)
        await db.flush()
        items = eng_items if template == templates[0] else general_items
        for i, (title, role, order) in enumerate(items):
            ci = OnboardingChecklistItem(
                checklist_id=cl.id,
                title=title, sort_order=order,
                completed=i < items_done,
                assigned_to=users[0].id if role == "manager" else users[u_idx].id,
            )
            db.add(ci)

    # Completed onboarding checklist
    cl_done = OnboardingChecklist(
        workspace_id=ws.id, user_id=users[13].id,
        template_id=templates[1].id, checklist_type="onboarding",
        status="completed",
    )
    db.add(cl_done)
    await db.flush()
    for title, role, order in general_items:
        ci = OnboardingChecklistItem(
            checklist_id=cl_done.id,
            title=title, sort_order=order,
            completed=True,
            assigned_to=users[0].id if role == "manager" else users[13].id,
        )
        db.add(ci)
    await db.flush()

    # --- Career Pathways ---
    pathway_eng = CareerPathway(
        workspace_id=ws.id,
        name="Engineering Career Ladder",
        description="Junior Engineer -> Engineer -> Senior Engineer -> Staff Engineer -> Principal Engineer",
        levels=[
            {"title": "Junior Engineer", "typical_years": 2, "required_competencies": []},
            {"title": "Engineer", "typical_years": 3, "required_competencies": []},
            {"title": "Senior Engineer", "typical_years": 3, "required_competencies": []},
            {"title": "Staff Engineer", "typical_years": 4, "required_competencies": []},
            {"title": "Principal Engineer", "typical_years": 0, "required_competencies": []},
        ],
    )
    pathway_design = CareerPathway(
        workspace_id=ws.id,
        name="Design Career Ladder",
        description="Junior Designer -> Designer -> Senior Designer -> Lead Designer -> Design Director",
        levels=[
            {"title": "Junior Designer", "typical_years": 2, "required_competencies": []},
            {"title": "Designer", "typical_years": 3, "required_competencies": []},
            {"title": "Senior Designer", "typical_years": 3, "required_competencies": []},
            {"title": "Lead Designer", "typical_years": 4, "required_competencies": []},
            {"title": "Design Director", "typical_years": 0, "required_competencies": []},
        ],
    )
    db.add_all([pathway_eng, pathway_design])
    await db.flush()

    # Enhance some development plans with multi-year horizon data
    for i, dp in enumerate(dev_plans[:5]):
        dp.horizon_years = random.choice([2, 3, 5])
        dp.start_date = today - timedelta(days=random.randint(30, 365))
        dp.end_date = dp.start_date + timedelta(days=dp.horizon_years * 365)
        dp.career_pathway_id = pathway_eng.id if i < 3 else pathway_design.id
        dp.total_budget = random.choice([5000, 10000, 15000, 20000])
        dp.overall_progress = random.randint(10, 80)

    # Add milestones to first 3 plans
    milestone_data = [
        (0, "Complete core technical training", 1, "completed", -30),
        (0, "Pass architecture review assessment", 1, "in_progress", 60),
        (0, "Lead a major project delivery", 2, "pending", 200),
        (0, "Achieve senior certification", 3, "pending", 500),
        (1, "Complete code review mastery", 1, "completed", -60),
        (1, "Lead feature delivery independently", 1, "in_progress", 45),
        (1, "Mentor a junior developer", 2, "pending", 180),
        (2, "AWS certification", 1, "completed", -20),
        (2, "Cloud architecture project", 1, "in_progress", 90),
        (2, "Present at internal tech talk", 2, "pending", 150),
    ]
    for plan_idx, title, year, status, offset in milestone_data:
        ms = DevelopmentMilestone(
            plan_id=dev_plans[plan_idx].id,
            title=title, year=year, status=status,
            target_date=today + timedelta(days=offset),
            completed_date=(today + timedelta(days=offset - 10)) if status == "completed" else None,
            sort_order=0,
        )
        db.add(ms)

    # Add checkpoints to first 2 plans
    checkpoint_data = [
        (0, -90, "on_track", "Making excellent progress. TOGAF cert on track."),
        (0, -30, "on_track", "Architecture board presentation went well. Continue current trajectory."),
        (1, -60, "behind", "Code review training delayed. Needs to catch up on mentoring goals."),
        (1, -15, "on_track", "Back on track after focused sprint on goals."),
    ]
    for plan_idx, offset, assessment, notes in checkpoint_data:
        cp = DevelopmentCheckpoint(
            plan_id=dev_plans[plan_idx].id,
            checkpoint_date=today + timedelta(days=offset),
            reviewer_id=users[0].id,
            overall_assessment=assessment,
            notes=notes,
        )
        db.add(cp)
    await db.flush()

    # --- Early Talent Programmes ---
    grad_prog = EarlyTalentProgramme(
        workspace_id=ws.id,
        name="Graduate Programme 2026",
        programme_type="graduate",
        description="Two-year graduate development programme with four 6-month rotations across engineering disciplines.",
        start_date=date(2026, 1, 6),
        end_date=date(2027, 12, 31),
        duration_months=24,
        status="active",
        max_cohort_size=8,
    )
    apprentice_prog = EarlyTalentProgramme(
        workspace_id=ws.id,
        name="Apprenticeship Programme 2025",
        programme_type="apprentice",
        description="Three-year Level 6 degree apprenticeship in Digital & Technology Solutions.",
        start_date=date(2025, 9, 1),
        end_date=date(2028, 8, 31),
        duration_months=36,
        status="active",
        max_cohort_size=4,
    )
    db.add_all([grad_prog, apprentice_prog])
    await db.flush()

    # Cohorts
    grad_cohort = EarlyTalentCohort(
        programme_id=grad_prog.id,
        name="Jan 2026 Intake",
        intake_date=date(2026, 1, 6),
        expected_end_date=date(2027, 12, 31),
        status="active",
    )
    app_cohort = EarlyTalentCohort(
        programme_id=apprentice_prog.id,
        name="Sep 2025 Intake",
        intake_date=date(2025, 9, 1),
        expected_end_date=date(2028, 8, 31),
        status="active",
    )
    db.add_all([grad_cohort, app_cohort])
    await db.flush()

    # Rotations for graduate programme
    grad_rotations = []
    rotation_data = [
        ("Software Engineering", "Engineering", 26, "Core development rotation — backend and frontend."),
        ("DevOps & Platform", "Platform Engineering", 26, "Infrastructure, CI/CD, and cloud platform work."),
        ("Data Engineering", "Data", 26, "Data pipelines, analytics, and ML infrastructure."),
        ("Cyber Security", "Security", 26, "Security operations, penetration testing, and compliance."),
    ]
    for rname, dept, weeks, desc in rotation_data:
        rot = EarlyTalentRotation(
            programme_id=grad_prog.id,
            name=rname, department=dept, duration_weeks=weeks, description=desc,
            sort_order=rotation_data.index((rname, dept, weeks, desc)),
        )
        db.add(rot)
        grad_rotations.append(rot)
    await db.flush()

    # Participants — use some of the existing users as grads/apprentices
    # Users 16, 17, 18, 19 are the most junior
    grad_participants = []
    grad_part_data = [
        (16, "BEng Computer Science", "University of Sheffield", "level_6", 35, "active"),
        (17, "BEng Electrical Engineering", "Leeds Beckett", "level_6", 25, "active"),
        (19, "BSc Data Science", "Sheffield Hallam", "level_6", 15, "enrolled"),
    ]
    for u_idx, qual, uni, level, progress, status in grad_part_data:
        p = EarlyTalentParticipant(
            programme_id=grad_prog.id,
            cohort_id=grad_cohort.id,
            workspace_id=ws.id,
            user_id=users[u_idx].id,
            mentor_id=users[0].id,
            buddy_id=users[1].id,
            status=status,
            qualification_target=qual,
            university=uni,
            qualification_level=level,
            qualification_progress=progress,
            start_date=date(2026, 1, 6),
            expected_end_date=date(2027, 12, 31),
        )
        db.add(p)
        grad_participants.append(p)

    app_participants = []
    app_part_data = [
        (18, "BSc Digital & Technology Solutions", "University of Lincoln", "level_6", 45, "active"),
    ]
    for u_idx, qual, uni, level, progress, status in app_part_data:
        p = EarlyTalentParticipant(
            programme_id=apprentice_prog.id,
            cohort_id=app_cohort.id,
            workspace_id=ws.id,
            user_id=users[u_idx].id,
            mentor_id=users[5].id,
            buddy_id=users[8].id,
            status=status,
            qualification_target=qual,
            university=uni,
            qualification_level=level,
            qualification_progress=progress,
            start_date=date(2025, 9, 1),
            expected_end_date=date(2028, 8, 31),
        )
        db.add(p)
        app_participants.append(p)
    await db.flush()

    # Rotation assignments for first grad participant
    if grad_rotations and grad_participants:
        ra1 = EarlyTalentRotationAssignment(
            participant_id=grad_participants[0].id,
            rotation_id=grad_rotations[0].id,
            supervisor_id=users[1].id,
            start_date=date(2026, 1, 6),
            end_date=date(2026, 6, 30),
            status="completed",
            assessment="Excellent performance. Strong coding ability and good teamwork.",
            rating=4,
        )
        ra2 = EarlyTalentRotationAssignment(
            participant_id=grad_participants[0].id,
            rotation_id=grad_rotations[1].id,
            supervisor_id=users[5].id,
            start_date=date(2026, 7, 1),
            status="in_progress",
        )
        db.add_all([ra1, ra2])

    # Milestones for grad participants
    et_milestone_data = [
        (grad_participants[0], "Complete Software Engineering rotation", "rotation", "completed", -30),
        (grad_participants[0], "Pass mid-programme review", "review", "completed", -15),
        (grad_participants[0], "Start DevOps rotation", "rotation", "in_progress", 0),
        (grad_participants[0], "Year 1 academic submission", "qualification", "pending", 90),
        (grad_participants[1], "Complete orientation week", "probation", "completed", -60),
        (grad_participants[1], "First rotation assessment", "rotation", "pending", 60),
        (grad_participants[1], "Year 1 academic submission", "qualification", "pending", 120),
    ]
    for participant, title, mtype, status, offset in et_milestone_data:
        etm = EarlyTalentMilestone(
            participant_id=participant.id,
            title=title, milestone_type=mtype, status=status,
            target_date=today + timedelta(days=offset),
            completed_date=(today + timedelta(days=offset - 5)) if status == "completed" else None,
            sort_order=0,
        )
        db.add(etm)
    await db.flush()

    # --- AI Chat Session (sample) ---
    ai_session = AIChatSession(
        workspace_id=ws.id, user_id=users[0].id,
        title="Team Overview",
    )
    db.add(ai_session)
    await db.flush()

    ai_messages = [
        ("user", "Give me a summary of my team's status"),
        ("assistant", "Here's a quick overview of your team at Acme Corp:\n\n"
         "**Team Size:** 20 members across Engineering, Design, Marketing, Product, and Data\n\n"
         "**Key Highlights:**\n"
         "- 30 objectives tracked, averaging ~50% progress across the board\n"
         "- 12 compliance items expiring within 90 days — several need urgent attention\n"
         "- 8 pending leave requests awaiting approval\n"
         "- Team morale trending upward at 3.8/5 in the latest pulse survey\n"
         "- 10 active candidates in the recruitment pipeline\n"
         "- 3 team members currently onboarding\n\n"
         "Would you like me to dig deeper into any of these areas?"),
    ]
    for role, content in ai_messages:
        msg = AIChatMessage(session_id=ai_session.id, role=role, content=content)
        db.add(msg)
    await db.flush()


if __name__ == "__main__":
    asyncio.run(seed())
