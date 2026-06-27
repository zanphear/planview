import { useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Search,
  Users,
  Target,
  Calendar,
  Shield,
  Award,
  GraduationCap,
  ClipboardCheck,
  Heart,
  UserPlus,
  BarChart3,
  MessageSquare,
  KeyRound,
  LayoutGrid,
  User,
  Activity,
  TrendingDown,
  CalendarDays,
  Kanban,
  Settings,
  Bug,
  Server,
  FolderOpen,
  Star,
  Bot,
  Timer,
  CalendarOff,
  Gauge,
} from 'lucide-react';

interface GuideStep {
  action: string;
  detail?: string;
}

interface GuideSection {
  title: string;
  icon: React.ElementType;
  category: 'core' | 'people' | 'admin';
  overview: string;
  steps: GuideStep[];
  tips?: string[];
}

const sections: GuideSection[] = [
  // ── Core Planning ──
  {
    title: 'Getting Started',
    icon: LayoutGrid,
    category: 'core',
    overview:
      "Planview is a visual planning tool with timeline-based scheduling, Kanban boards, and team management. Here's how to get up and running.",
    steps: [
      {
        action: 'Log in with your email and password, or via SSO',
        detail:
          'If your admin has set up SSO (OIDC), you\'ll see a "Sign in with SSO" button. In OIDC-only mode, password login is disabled entirely.',
      },
      {
        action: "You'll land on the Dashboard",
        detail: 'This shows an overview of your tasks, upcoming deadlines, and team stats.',
      },
      {
        action: 'Use the sidebar to navigate',
        detail:
          'The sidebar has your teams, projects, and all feature modules. Star items to pin them to "Favourites" at the top.',
      },
      {
        action: 'Set up your profile',
        detail:
          'Go to Settings (gear icon, bottom of sidebar) → Profile. Set your display name, initials, colour, and optionally upload a profile picture.',
      },
      {
        action: 'Enable two-factor authentication for extra security',
        detail:
          'Go to Settings → Security → Enable 2FA. Scan the QR code with your authenticator app.',
      },
    ],
    tips: [
      'Click the hamburger menu (top-left) to collapse the sidebar for more screen space.',
      'Use Ctrl+K to open the keyboard shortcuts reference.',
      'Dark mode is available via the sun/moon icon in the top bar.',
      "Your session refreshes automatically, you'll stay logged in until you explicitly log out.",
    ],
  },
  {
    title: 'Teams',
    icon: Users,
    category: 'core',
    overview:
      'Teams are groups of people who work together. Each team gets its own timeline swimlane view.',
    steps: [
      { action: 'In the sidebar, find the "Teams" section and click the "+" button' },
      { action: 'Enter a team name and press Enter' },
      {
        action: 'Click the team name in the sidebar to open its timeline view',
        detail: "You'll see a swimlane for each team member with their tasks laid out over time.",
      },
      {
        action: 'To add members, right-click the team name and select "Manage"',
        detail: 'Or click the gear icon next to the team name.',
      },
      { action: 'Search and add existing workspace members to the team' },
      { action: 'Star a team to pin it to your Favourites section at the top of the sidebar' },
    ],
    tips: [
      'Each team member appears as a row in the team timeline, drag tasks onto their row to assign work.',
      'Team timelines support day/week/month zoom levels.',
    ],
  },
  {
    title: 'Projects',
    icon: FolderOpen,
    category: 'core',
    overview:
      'Projects contain tasks and can be viewed as a Kanban board or a timeline. Each project gets its own colour.',
    steps: [
      { action: 'In the sidebar, find the "Projects" section and click the "+" button' },
      { action: 'Enter a project name and press Enter' },
      {
        action: 'Click the project name to open its Board view',
        detail:
          'The board shows tasks in columns: To Do, In Progress, Done (and any custom statuses).',
      },
      {
        action:
          'To switch to the project Timeline view, click the timeline icon in the project header',
      },
      {
        action:
          'To edit the project (rename, change colour, delete), click the gear icon next to it in the sidebar',
      },
      { action: 'Star a project to pin it to your Favourites section' },
    ],
    tips: [
      'Project colours are shown on task bars in the timeline views, use distinct colours to tell projects apart at a glance.',
    ],
  },
  {
    title: 'Tasks',
    icon: Kanban,
    category: 'core',
    overview:
      'Tasks are the core unit of work. They live inside projects and can be assigned to people, scheduled on timelines, and tracked on boards.',
    steps: [
      { action: 'Open a project board and click "+ Add task" at the bottom of any column' },
      {
        action: 'Type the task name and press Enter',
        detail: "The task is created in that column's status.",
      },
      {
        action: 'Click a task to open the detail panel',
        detail:
          'Here you can set: assignees, start/end dates, description (rich text), colour, tags, checklists, attachments, and comments.',
      },
      { action: 'To assign someone, click the assignee area and select team members' },
      {
        action: 'Set start and end dates to make the task appear on timelines',
        detail: 'Tasks without dates only appear on the board, not on timelines.',
      },
      { action: 'Drag and drop tasks between columns on the board to change their status' },
      {
        action:
          'On timelines, drag the edges of a task bar to resize it, or drag the whole bar to reschedule',
      },
    ],
    tips: [
      'Use the bulk action bar (select multiple tasks with checkboxes) to assign, move, or delete in bulk.',
      'Add checklists to break tasks into sub-items, the progress shows on the task card.',
      'Use tags to categorise tasks (e.g. "urgent", "blocked", "design").',
      'Ctrl+click to select multiple tasks on the board.',
    ],
  },
  {
    title: 'My Work',
    icon: User,
    category: 'core',
    overview:
      'A personal view showing all tasks assigned to you across every project, displayed as a timeline.',
    steps: [
      { action: 'Click "My Work" in the sidebar' },
      {
        action: "You'll see your tasks laid out on a personal timeline",
        detail: 'Use the zoom controls to switch between day/week/month views.',
      },
      { action: 'Drag tasks to reschedule them' },
      { action: 'Click any task to open its detail panel' },
    ],
  },
  {
    title: 'Calendar',
    icon: Calendar,
    category: 'core',
    overview:
      'A monthly calendar view showing all tasks, milestones, and time off across your workspace.',
    steps: [
      { action: 'Click "Calendar" in the sidebar' },
      { action: 'Navigate months using the arrow buttons' },
      { action: 'Tasks appear as coloured bars spanning their date range' },
      { action: 'Click any task to open its detail panel' },
      { action: 'Milestones appear as diamond markers on their due date' },
    ],
  },
  {
    title: 'Activity Feed',
    icon: Activity,
    category: 'core',
    overview:
      'A chronological log of everything happening in your workspace, task changes, comments, assignments, and more.',
    steps: [
      { action: 'Click "Activity" in the sidebar' },
      { action: 'Scroll through the feed to see recent actions' },
      { action: 'Each entry shows who did what, when, and on which task' },
    ],
  },
  {
    title: 'Burndown Charts',
    icon: TrendingDown,
    category: 'core',
    overview:
      'Track project progress over time with burndown charts showing tasks remaining vs. the ideal trend line.',
    steps: [
      { action: 'Click "Burndown" in the sidebar' },
      { action: 'Select a project from the dropdown' },
      { action: "The chart shows completed vs. remaining tasks over the project's date range" },
      {
        action:
          "The ideal line shows where you should be, if you're above it, you're behind schedule",
      },
    ],
  },
  {
    title: 'Rotas / Shift Patterns',
    icon: CalendarDays,
    category: 'core',
    overview: 'Define recurring shift patterns and assign team members to rota schedules.',
    steps: [
      { action: 'Click "Rotas" in the sidebar' },
      { action: 'Click "New Rota" to create a rota pattern' },
      { action: 'Give it a name (e.g. "Week 1 Days") and set the shift times' },
      { action: 'Add entries, each entry is a day of the week with a start/end time' },
      { action: 'Assign team members to the rota' },
    ],
  },
  {
    title: 'Sharing Timelines',
    icon: Star,
    category: 'core',
    overview:
      "Generate read-only public links to share team or project timelines with stakeholders who don't have accounts. Links expire automatically for security.",
    steps: [
      { action: 'Open a team or project timeline' },
      { action: 'Click the "Share" button in the toolbar' },
      {
        action: 'Click "Create Link" to generate a shareable URL',
        detail:
          'Links expire after 30 days by default. After expiry, anyone visiting the link sees a "This shared timeline has expired" message.',
      },
      {
        action: 'Copy the link and send it to anyone',
        detail: "They'll see a read-only version of the timeline, no login required.",
      },
      { action: 'You can deactivate or delete links at any time from the same Share dialog' },
    ],
    tips: [
      "Expired links can't be reactivated, create a new one if you still need to share.",
      'Shared links only show task data (names, dates, assignees), no comments, attachments, or internal notes are exposed.',
    ],
  },

  {
    title: 'Time Tracking',
    icon: Timer,
    category: 'core',
    overview:
      'Log time against tasks using a built-in timer or manual entry. Each entry is stored individually so you can review and manage your time log.',
    steps: [
      { action: 'Open any task by clicking it on the board or timeline' },
      { action: 'In the task detail panel, find the "Time Tracked" section' },
      {
        action: 'Click "Start Timer" to begin tracking',
        detail:
          "A live timer counts up. Click the red stop button when you're done, the elapsed time is logged automatically.",
      },
      { action: 'Or log time manually: type the number of minutes in the input and click "Log"' },
      {
        action: 'Click "History" to see all time entries for this task',
        detail: 'Each entry shows who logged it, how long, and when.',
      },
      { action: 'Delete individual entries by clicking the bin icon next to them' },
      {
        action: 'Set a Time Estimate (above the tracker) to see a progress bar',
        detail:
          'The bar shows logged time as a percentage of the estimate, turns red if you go over.',
      },
    ],
    tips: [
      "The timer keeps running while you work, switch away and come back, it'll still be counting.",
      'Time estimates and logged time are visible on the Resource Utilisation page for workload planning.',
    ],
  },
  {
    title: 'Absence Calendar',
    icon: CalendarOff,
    category: 'core',
    overview:
      "A dedicated calendar view showing who's off, combining approved leave and time-off records in one place.",
    steps: [
      { action: 'Click "Absences" in the sidebar' },
      { action: 'Navigate months using the arrow buttons or click "Today" to jump back' },
      {
        action: 'Each day shows colour-coded pills for people who are off',
        detail: 'The colour matches the absence type (leave, time off, etc.).',
      },
      { action: 'Hover over a pill to see the full name and absence reason' },
      {
        action:
          'Below the calendar, a "People off this month" section lists everyone with absences',
        detail: 'Useful for a quick headcount of availability.',
      },
    ],
    tips: [
      "Only approved leave requests appear, pending requests won't show here.",
      'Combine this with the Resource Utilisation view to plan workload around absences.',
    ],
  },
  {
    title: 'Resource Utilisation',
    icon: Gauge,
    category: 'core',
    overview:
      "See how your team's time is being used, active tasks, logged hours, and utilisation rates at a glance.",
    steps: [
      { action: 'Click "Resources" in the sidebar' },
      {
        action: 'Choose a time period: Week, Month, or Quarter',
        detail: 'The data shows time logged and tasks assigned within that window.',
      },
      {
        action: 'Summary cards at the top show team-wide totals',
        detail: 'Team members, total logged time, active tasks, and overdue count.',
      },
      { action: 'The table below shows each team member with their stats' },
      {
        action: 'The "Utilisation" bar shows logged time vs. estimated time',
        detail: 'Green = healthy, amber = high (over 80%), red = over-utilised (over 100%).',
      },
      {
        action: 'Use the overdue column to spot people who may be struggling',
        detail: 'A high overdue count might mean too much work or blockers that need attention.',
      },
    ],
    tips: [
      'For meaningful utilisation data, make sure tasks have time estimates and people are logging time.',
      'Review resource utilisation weekly to catch workload imbalances early.',
    ],
  },

  // ── People Management ──
  {
    title: 'People Profiles',
    icon: Users,
    category: 'people',
    overview: 'Your team directory with full profiles, org chart, and document storage.',
    steps: [
      { action: 'Click "People" in the sidebar to open the directory' },
      {
        action: 'Click "+ Add Person" to create a new profile',
        detail: 'Enter their name, job title, department, start date, and other details.',
      },
      {
        action: 'Click any person to see their full profile',
        detail:
          'The profile page shows all their details, documents, and linked records across all modules.',
      },
      {
        action: 'Switch to the "Org Chart" tab to see the reporting hierarchy',
        detail: 'Set the "Reports To" field on each profile to build the tree.',
      },
      {
        action: 'Switch to the "Insights" tab (managers only) to view personal notes',
        detail: 'Record birthdays, dietary needs, interests, things that help build relationships.',
      },
      {
        action:
          'Upload documents (contracts, certificates) via the Documents section on each profile',
      },
    ],
    tips: [
      'Use the search bar at the top to quickly find people by name, job title, or department.',
      'Department and job title dropdowns pull from Settings → Reference Data, customise these to match your organisation.',
    ],
  },
  {
    title: '1:1 Meetings',
    icon: MessageSquare,
    category: 'people',
    overview: 'Track regular check-ins with direct reports, notes, mood, and action items.',
    steps: [
      { action: 'Click "1:1 Meetings" in the sidebar' },
      { action: 'Click "+ New Meeting" to schedule one' },
      {
        action: 'Select the team member, set the date, and choose a mood indicator (1-5)',
        detail: 'The mood tracks how the person is feeling, use it consistently to spot trends.',
      },
      { action: 'Write your meeting notes in the text area' },
      {
        action: 'Add action items at the bottom',
        detail: 'Each action has a description and an "owner" (you or them).',
      },
      {
        action:
          'After the meeting, mark actions as completed or carry them forward to the next meeting',
      },
    ],
    tips: [
      'Review the mood trend over time, a dip might indicate something needs attention.',
      'Carry forward incomplete actions so nothing gets lost between meetings.',
    ],
  },
  {
    title: 'Objectives & Key Results',
    icon: Target,
    category: 'people',
    overview: 'Set measurable objectives with key results, linked to review periods.',
    steps: [
      { action: 'Click "Objectives" in the sidebar' },
      {
        action: "First, create a Review Period if one doesn't exist",
        detail: 'E.g. "2026 H1" with start and end dates. Objectives are grouped by period.',
      },
      { action: 'Click "+ New Objective" to create one' },
      { action: 'Set the title, category (Personal/Team/Company), weight, and assign to a person' },
      {
        action: 'Add Key Results to the objective',
        detail:
          'Each KR has a title, target value (e.g. 100), current value (e.g. 45), and unit (e.g. "%", "deals", "points").',
      },
      {
        action: 'Update the "current value" on each KR as progress is made',
        detail: 'The progress bar and percentage update automatically.',
      },
    ],
    tips: [
      'Weight objectives by importance (e.g. 40%, 30%, 30%) so the overall progress reflects priorities.',
      'Link objectives to development goals for a joined-up view of growth.',
    ],
  },
  {
    title: 'Compliance Tracking',
    icon: Shield,
    category: 'people',
    overview: 'Track certificates, licences, visas, and anything with an expiry date.',
    steps: [
      { action: 'Click "Compliance" in the sidebar' },
      { action: 'Click "+ Add Item" to create a compliance record' },
      {
        action:
          'Select the person, item type (Certificate, Visa, Licence, etc.), and enter the details',
      },
      {
        action: 'Set the issue date and expiry date',
        detail: 'Items approaching expiry are flagged automatically on the dashboard.',
      },
      { action: 'Optionally upload evidence (e.g. a scan of the certificate) as an attachment' },
      { action: 'The summary cards at the top show valid, expiring soon, and expired counts' },
    ],
    tips: [
      'Check the dashboard regularly for expiring items, the amber "Expiring Soon" count shows items within 30 days of expiry.',
      'Compliance item types are customisable in Settings → Reference Data.',
    ],
  },
  {
    title: 'Competencies & Skills Matrix',
    icon: Award,
    category: 'people',
    overview: 'Define required competencies and assess team members against them.',
    steps: [
      { action: 'Click "Competencies" in the sidebar' },
      {
        action: 'Click "+ Add Competency" to define a skill',
        detail: 'Set the name, category, and whether it requires certification.',
      },
      {
        action: 'Assign the competency to team members with an assessment level',
        detail: 'Levels: Beginner, Intermediate, Advanced, Expert.',
      },
      {
        action: 'The Skills Matrix view shows all people vs. all competencies in a grid',
        detail: 'Colour-coded by level, spot gaps at a glance.',
      },
      {
        action: 'For competencies requiring certification, set a validity period to track renewals',
      },
    ],
    tips: [
      'Use competency categories (Technical, Safety, Leadership, etc.) to organise skills, these are customisable in Settings → Reference Data.',
    ],
  },
  {
    title: 'Leave Management',
    icon: CalendarDays,
    category: 'people',
    overview: 'Manage leave allowances, requests, and approvals.',
    steps: [
      { action: 'Click "Leave" in the sidebar' },
      {
        action: 'First, set up allowances: click "+ Add Allowance"',
        detail: 'Set the person, year, leave type, total days, and any carried-forward days.',
      },
      { action: 'To request leave, click "+ Request Leave"' },
      { action: 'Select the leave type, start date, end date, and add optional notes' },
      {
        action: 'Managers see pending requests and can Approve or Reject them',
        detail: 'The requestor sees the status update immediately.',
      },
      { action: 'The summary shows used, booked, and remaining days per person' },
    ],
    tips: [
      'Leave types are customisable in Settings → Reference Data (Annual, Sick, TOIL, etc.).',
      'Approved leave shows on the team calendar view.',
    ],
  },
  {
    title: 'Recruitment Pipeline',
    icon: UserPlus,
    category: 'people',
    overview: 'Track candidates through your hiring process from application to hire.',
    steps: [
      { action: 'Click "Recruitment" in the sidebar' },
      { action: 'Click "+ Add Candidate" to create a new record' },
      { action: 'Enter name, email, role applied for, and source (LinkedIn, Referral, etc.)' },
      {
        action: 'The candidate starts in "Applied" stage',
        detail:
          'Stages: Applied → Screening → Interview → Offer → Hired (or Rejected at any point).',
      },
      {
        action: 'Log events against each candidate, phone screens, interviews, tests',
        detail: 'Each event has a date, type, notes, and outcome (Pass/Fail/Maybe).',
      },
      { action: "Change the candidate's stage as they progress through the pipeline" },
    ],
    tips: [
      'Use the source field consistently to track which recruitment channels perform best.',
      'The summary cards show your pipeline at a glance, how many at each stage.',
    ],
  },
  {
    title: 'Development Plans',
    icon: GraduationCap,
    category: 'people',
    overview: 'Create multi-year development plans with goals, milestones, and career pathways.',
    steps: [
      { action: 'Click "Development" in the sidebar' },
      {
        action: 'Switch to the "Pathways" tab to define career pathways first (optional)',
        detail:
          'A pathway is a progression ladder (e.g. Engineer → Senior → Lead → Principal) with defined skills at each level.',
      },
      { action: 'Back on the "Plans" tab, click "+ New Plan" to create a development plan' },
      {
        action:
          'Set the person, horizon (1-5 years), start/end dates, and optionally link a career pathway',
      },
      {
        action: 'Add Goals to the plan',
        detail:
          'Each goal has a type (Skill/Knowledge/Experience/Qualification), priority, target year, progress %, and optional budget.',
      },
      {
        action: 'Add Milestones to track major checkpoints',
        detail: 'E.g. "Complete AWS certification by Q2 2026".',
      },
      { action: 'Update progress on goals as the person develops' },
    ],
    tips: [
      'Link goals to competencies for a joined-up skills development view.',
      'Use milestones for hard deadlines and goals for ongoing development.',
      'The summary cards show active plans, average progress, total budget, and overdue milestones.',
    ],
  },
  {
    title: 'Performance Reviews',
    icon: ClipboardCheck,
    category: 'people',
    overview: 'Run structured review cycles with self-assessment and manager assessment.',
    steps: [
      { action: 'Click "Reviews" in the sidebar' },
      {
        action: 'Click "+ New Cycle" to create a review cycle',
        detail: 'Set the period name and date range (e.g. "2026 Annual Review", Jan-Dec).',
      },
      { action: 'Click "+ Add Review" to assign a review to a team member within the cycle' },
      {
        action: 'The team member fills in their self-assessment',
        detail: 'Covers achievements, challenges, and career aspirations.',
      },
      {
        action: 'The manager fills in their assessment',
        detail: 'Covers strengths, areas for improvement, and an overall rating (1-5).',
      },
      {
        action:
          'The review flows through stages: Not Started → In Progress → Submitted → Completed',
      },
    ],
    tips: [
      'Link reviews to the same review periods as objectives for a joined-up performance picture.',
    ],
  },
  {
    title: 'Team Wellbeing',
    icon: Heart,
    category: 'people',
    overview: 'Pulse surveys for team morale tracking and a kudos wall for recognition.',
    steps: [
      { action: 'Click "Wellbeing" in the sidebar' },
      {
        action: 'To create a pulse survey, click "+ New Survey"',
        detail: 'Surveys measure morale, workload, and support on a 1-5 scale.',
      },
      { action: 'Assign the survey to team members and set a due date' },
      { action: 'Team members respond with their ratings and optional comments' },
      {
        action: 'View results to see average scores and trends',
        detail: 'Scores are semi-anonymous, you see the trend, not who said what.',
      },
      { action: 'For kudos, click "+ Give Kudos" on the Kudos Wall tab' },
      { action: 'Select a colleague, category (Teamwork, Innovation, etc.), and write a message' },
    ],
    tips: [
      'Run pulse surveys monthly to spot trends early.',
      'Kudos categories are customisable in Settings → Reference Data.',
    ],
  },
  {
    title: 'Onboarding & Offboarding',
    icon: ClipboardCheck,
    category: 'people',
    overview: 'Reusable checklist templates for bringing people in or transitioning them out.',
    steps: [
      { action: 'Click "Onboarding" in the sidebar' },
      {
        action: 'First, create a Template: click "+ New Template"',
        detail:
          'Choose the type (Onboarding or Offboarding) and give it a name (e.g. "Engineer Onboarding").',
      },
      {
        action: 'Add checklist items to the template',
        detail:
          'Each item has a description, an assigned role (Manager, IT, HR, New Starter, Buddy), and a due day offset (e.g. "Day 1", "Day 7").',
      },
      {
        action: 'When a new starter joins, click "+ Start Checklist"',
        detail: 'Select the person and the template. A personalised checklist is generated.',
      },
      {
        action: 'Work through the checklist items, ticking them off as completed',
        detail:
          'Different items will be assigned to different people (IT sets up laptop, HR processes paperwork, etc.).',
      },
      { action: 'The checklist auto-completes when all items are done' },
    ],
    tips: [
      'Create different templates for different roles or departments.',
      'Use offboarding templates to ensure nothing is missed when someone leaves (equipment return, access revocation, etc.).',
    ],
  },
  {
    title: 'Early Talent Programme',
    icon: GraduationCap,
    category: 'people',
    overview: 'Manage graduate and apprentice programmes with cohorts, rotations, and milestones.',
    steps: [
      { action: 'Click "Early Talent" in the sidebar (must be enabled in Settings → Modules)' },
      {
        action: 'Click "+ New Programme" to create a programme',
        detail:
          'E.g. "Graduate Engineering Programme 2026". Set the type (Graduate/Apprentice), duration, and description.',
      },
      {
        action: 'Create Cohorts within the programme',
        detail: 'E.g. "Sept 2026 Intake" with a start date and expected end date.',
      },
      {
        action: 'Define Rotations, these are the different placements within the programme',
        detail: 'E.g. "Design Team, 6 months", "Operations, 3 months".',
      },
      {
        action: 'Enrol Participants into a cohort',
        detail: 'Assign them a mentor and buddy from the existing team.',
      },
      { action: 'Assign rotation placements to participants' },
      {
        action:
          'Track milestones for each participant (e.g. "Passed probation", "Completed rotation 1")',
      },
      { action: 'The Dashboard tab shows programme-wide stats and charts' },
    ],
  },

  // ── Admin & Settings ──
  {
    title: 'AI Assistant & Reports',
    icon: Bot,
    category: 'admin',
    overview: 'An AI chat assistant and automated report generation powered by your local LLM.',
    steps: [
      { action: 'Click "AI Assistant" in the sidebar' },
      { action: 'Start a new chat session or continue an existing one' },
      {
        action: 'Ask questions about your data or get help with tasks',
        detail: 'The AI has context about your workspace and can help with analysis.',
      },
      { action: 'For structured reports, click "AI Reports" in the sidebar' },
      {
        action: 'Click "+ New Report" and choose a report type',
        detail: 'The AI generates the report and you can download it as PDF.',
      },
    ],
    tips: [
      'The AI model URL must be configured in Settings → look for AI_MODEL_URL. Your admin sets this up.',
      'Reports can take a moment to generate, the status updates automatically.',
    ],
  },
  {
    title: 'Reporting Dashboard',
    icon: BarChart3,
    category: 'admin',
    overview: 'Aggregated metrics across all people management modules.',
    steps: [
      { action: 'Click "Reporting" in the sidebar' },
      {
        action: 'The dashboard shows summary cards for each enabled module',
        detail: 'Team size, objective progress, pending leave, compliance alerts, and more.',
      },
      {
        action: 'Charts visualise trends and distributions',
        detail:
          'Donut charts for status breakdowns, bar charts for comparisons, progress rings for completion rates.',
      },
      { action: 'Sections only appear for modules you have enabled' },
    ],
  },
  {
    title: 'Settings & Configuration',
    icon: Settings,
    category: 'admin',
    overview: 'Manage your profile, workspace, members, and all system configuration.',
    steps: [
      { action: 'Click the gear icon at the bottom of the sidebar to open Settings' },
      { action: 'Profile, your name, initials, colour, and profile picture' },
      {
        action: 'Security, enable two-factor authentication (TOTP) and change your password',
        detail: 'If your workspace uses OIDC-only mode, the password change option is hidden.',
      },
      {
        action: 'Members, invite new users (with login) or add members (without login)',
        detail:
          '"Add" creates a member who appears in timelines but can\'t log in. "Invite" creates a full user account with a temporary password.',
      },
      {
        action: 'Modules, toggle which features are enabled in the sidebar',
        detail: 'Disabled modules are hidden from the sidebar and their API endpoints return 404.',
      },
      {
        action:
          'Reference Data, customise dropdown values for departments, job titles, leave types, etc.',
        detail: 'These feed into all the people management modules.',
      },
      { action: 'Webhooks, configure external integrations' },
      { action: 'Custom Fields, add extra fields to tasks' },
      { action: 'Templates, create reusable task templates' },
      { action: 'Feedback, view submitted bug reports and feature requests' },
    ],
  },
  {
    title: 'Bug Reports & Feature Requests',
    icon: Bug,
    category: 'admin',
    overview: 'Submit feedback directly from the app. Your reports are saved and can be reviewed.',
    steps: [
      { action: 'In the top bar, click the lightbulb icon to request a feature' },
      { action: 'Click the bug icon to report a bug' },
      { action: 'Fill in the title and description, then click Submit' },
      {
        action: 'View your submission history in Settings → Feedback',
        detail: 'You can see the status of each item: Open, In Progress, Resolved, or Closed.',
      },
    ],
  },
  {
    title: 'Security & Authentication',
    icon: KeyRound,
    category: 'admin',
    overview:
      'Planview is hardened for external exposure with workspace isolation, token rotation, rate limiting, and security headers. Three authentication modes are supported.',
    steps: [
      {
        action: 'Authentication modes: Password (default), Hybrid, and OIDC Only',
        detail:
          'Set via the AUTH_MODE environment variable. "password" = email/password only. "hybrid" = both password and SSO. "oidc_only" = SSO only (password login and registration are completely disabled).',
      },
      {
        action: 'To enable SSO, configure your OIDC provider (e.g. PocketID)',
        detail:
          'Set OIDC_ISSUER_URL, OIDC_CLIENT_ID, and OIDC_CLIENT_SECRET. For PocketID, create a client with callback URL: https://your-domain/oidc/callback. Nonce validation is built in to prevent token replay.',
      },
      {
        action: 'Two-factor authentication (TOTP) can be enabled per user',
        detail:
          'Go to Settings → Security → Enable 2FA. Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.).',
      },
      {
        action: 'Login rate limiting protects against brute-force attacks',
        detail:
          'After 5 failed attempts for the same email address, further login attempts are blocked for 15 minutes. Successful login clears the counter.',
      },
      {
        action: 'Refresh tokens use one-time rotation',
        detail:
          'Each refresh token can only be used once. When you refresh, the old token is invalidated and a new one is issued. Logging out explicitly revokes the token.',
      },
      {
        action: 'Workspace isolation prevents cross-tenant data access',
        detail:
          "Every API request is checked to ensure you belong to the workspace in the URL. Attempting to access another workspace's data returns 403 Forbidden.",
      },
      {
        action: 'WebSocket connections require authentication',
        detail:
          'Real-time updates use your access token for authentication. Unauthenticated WebSocket connections are rejected.',
      },
      {
        action: 'File uploads are validated at the byte level',
        detail:
          'Uploaded files are checked with magic-byte detection to ensure the content matches the file extension. All downloads are served as attachments to prevent browser execution.',
      },
    ],
    tips: [
      'OIDC_AUTO_PROVISION=true (default) auto-creates user accounts on first SSO login.',
      'OIDC_DEFAULT_ROLE controls the role for auto-provisioned users (default: "regular").',
      'JWT_SECRET_KEY must be set to a strong random value, the app refuses to start with the default.',
      'Swagger/OpenAPI docs are disabled by default. Set ENABLE_DOCS=true if you need them for development.',
    ],
  },
  {
    title: 'Deployment & Self-Hosting',
    icon: Server,
    category: 'admin',
    overview:
      "Planview runs as a Docker Compose stack with 5 containers. Here's how to deploy it securely.",
    steps: [
      {
        action: 'Generate a JWT secret before first launch',
        detail:
          'Run: python3 -c "import secrets; print(secrets.token_urlsafe(64))" and set JWT_SECRET_KEY in your .env file or docker-compose environment. The app will not start without a real secret.',
      },
      {
        action: 'Set your CORS_ORIGINS to your actual domain',
        detail:
          'e.g. CORS_ORIGINS=https://planview.example.com, this prevents other websites from making API requests on behalf of your users.',
      },
      {
        action: 'Redis is password-protected by default',
        detail:
          'The default password is "planview_redis_secret". For production, set REDIS_PASSWORD to something stronger in your .env and update REDIS_URL accordingly.',
      },
      {
        action: 'All containers run as non-root users',
        detail:
          'The backend runs as "appuser" and the frontend uses nginx-unprivileged. This limits the blast radius if a container is compromised.',
      },
      {
        action: 'Resource limits are set on every container',
        detail:
          'CPU and memory limits prevent any single container from starving the host. Adjust the deploy.resources section in docker-compose.yml if needed.',
      },
      {
        action: 'For external access, put a reverse proxy with TLS in front',
        detail:
          'Recommended setup: Cloudflare (TLS termination) → your server → Planview nginx (port 80). No need to configure TLS on Planview itself.',
      },
      {
        action: 'For SSO, set up PocketID or another OIDC provider',
        detail:
          'Set AUTH_MODE=oidc_only to disable password login entirely. All authentication will go through your OIDC provider.',
      },
      {
        action: 'Security headers (CSP, X-Frame-Options, etc.) are set by nginx',
        detail:
          'Content-Security-Policy restricts scripts and connections to same-origin. X-Frame-Options DENY prevents clickjacking.',
      },
    ],
    tips: [
      'Run "docker compose up -d" to start. Alembic migrations run automatically on boot.',
      'Health checks are configured on all containers, Docker will restart unhealthy services automatically.',
      'Swagger docs are blocked at the nginx level even if ENABLE_DOCS is accidentally set to true.',
      'Shared timeline links expire after 30 days by default.',
      'Image versions are pinned (postgres:16.6, redis:7.4, nginx:1.27) for reproducible builds.',
    ],
  },
];

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'core', label: 'Planning & Scheduling' },
  { key: 'people', label: 'People Management' },
  { key: 'admin', label: 'Admin & Settings' },
] as const;

export function GuidePage() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState<'all' | 'core' | 'people' | 'admin'>('all');

  const filtered = sections.filter((s) => {
    const matchesCategory = category === 'all' || s.category === category;
    const matchesSearch =
      !searchTerm ||
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.overview.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.steps.some(
        (st) =>
          st.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
          st.detail?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen size={28} style={{ color: 'var(--color-primary)' }} />
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            User Guide
          </h1>
        </div>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Step-by-step instructions for every feature. Click a section to expand the walkthrough.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search the guide..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text)',
          }}
        />
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setCategory(cat.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              category === cat.key ? 'text-white' : 'hover:bg-muted'
            }`}
            style={
              category === cat.key
                ? { backgroundColor: 'var(--color-primary)' }
                : { color: 'var(--color-text-secondary)' }
            }
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Sections */}
      <div className="space-y-2">
        {filtered.map((section) => {
          const globalIndex = sections.indexOf(section);
          const isExpanded = expandedIndex === globalIndex;
          const Icon = section.icon;

          return (
            <div
              key={section.title}
              className="rounded-xl border overflow-hidden"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
              }}
            >
              <button
                onClick={() => setExpandedIndex(isExpanded ? null : globalIndex)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: 'var(--color-primary)', opacity: 0.9 }}
                >
                  <Icon size={16} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium" style={{ color: 'var(--color-text)' }}>
                    {section.title}
                  </span>
                  {!isExpanded && (
                    <p
                      className="text-xs mt-0.5 truncate"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {section.overview}
                    </p>
                  )}
                </div>
                {isExpanded ? (
                  <ChevronDown size={18} style={{ color: 'var(--color-text-secondary)' }} />
                ) : (
                  <ChevronRight size={18} style={{ color: 'var(--color-text-secondary)' }} />
                )}
              </button>
              {isExpanded && (
                <div className="px-5 pb-5 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  {/* Overview */}
                  <p
                    className="text-sm leading-relaxed pt-4 pb-3"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {section.overview}
                  </p>

                  {/* Steps */}
                  <div className="space-y-1">
                    {section.steps.map((step, j) => (
                      <div key={j} className="flex gap-3 py-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                          style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                        >
                          {j + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                            {step.action}
                          </p>
                          {step.detail && (
                            <p
                              className="text-xs mt-0.5"
                              style={{ color: 'var(--color-text-secondary)' }}
                            >
                              {step.detail}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tips */}
                  {section.tips && section.tips.length > 0 && (
                    <div
                      className="mt-4 p-3 rounded-lg"
                      style={{ backgroundColor: 'var(--color-primary-light)' }}
                    >
                      <p
                        className="text-xs font-semibold mb-1.5"
                        style={{ color: 'var(--color-primary)' }}
                      >
                        {section.tips.length === 1 ? 'Tip' : 'Tips'}
                      </p>
                      {section.tips.map((tip, j) => (
                        <p
                          key={j}
                          className="text-xs leading-relaxed"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {section.tips!.length > 1 ? `• ${tip}` : tip}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12" style={{ color: 'var(--color-text-secondary)' }}>
          <BookOpen size={48} className="mx-auto mb-3 opacity-30" />
          <p>No sections match your search.</p>
        </div>
      )}
    </div>
  );
}
