# ManMadhan Progress — Combined Upgrade Specification

---

## PART 1 — Sidebar (Books/Podcasts), Focus Page (100dvh fix), Global UX + Real Functionality Upgrade

### UPDATE THE EXISTING MANMADHAN PROGRESS SIDEBAR

**IMPORTANT:** This is a targeted upgrade.

- DO NOT rebuild the sidebar.
- DO NOT change existing navigation logic unnecessarily.
- DO NOT break existing routes.
- DO NOT remove any existing sidebar items.
- DO NOT change the desktop/mobile architecture.

#### REQUIRED CHANGE

Add these two Personal Workspace pages as FIRST-CLASS sidebar navigation items:

- Books
- Podcasts

They must NOT be hidden under: Library, More, Resources, Settings.

They belong to the **LEARNING** section.

#### FINAL SIDEBAR ORDER

**WORKSPACE**
- Dashboard
- Focus
- Tasks
- Projects
- Calendar

**PERSONAL**
- Notes
- Journal
- Ideas
- Goals
- Progress

**LEARNING**
- Books
- Podcasts

**RESOURCES**
- Library
- Reminders

**TRACKING**
- Habits
- Time Tracking
- Analytics
- Activity

**SYSTEM**
- Search
- Archive
- Profile
- Settings

**INTELLIGENCE**
- AI Assistant
- Automation
- Integrations
- Command Center

#### BOOKS

Sidebar item: **Books**

Route: Use the existing Books route if it already exists. If it does not exist, create the appropriate route according to the existing routing architecture.

Books must be a REAL page. Do not create a mock page.

Must eventually support:
- Currently Reading, Want to Read, Paused, Completed, Abandoned
- Active book
- Reading progress
- Reading sessions
- Notes
- Highlights
- Goals
- Tasks

#### PODCASTS

Sidebar item: **Podcasts**

Use the existing Podcasts route if it already exists. If it does not exist, create it using the existing routing architecture.

Podcasts must be a REAL page. Support:
- Now Listening, Queue, Saved, History, Podcasts, Episodes

Track real:
- Episode progress, Listening position, Duration, Completion, Listening sessions

#### SIDEBAR UI

Books and Podcasts must look exactly like the other sidebar navigation items.

- Do NOT create oversized cards.
- Do NOT add separate navigation panels.
- Do NOT add AI-style icons.
- Use the existing icon system, typography, spacing, active-state design.

Active state: subtle surface, gold accent, correct text contrast.

Dark theme: No white border.
Light theme: Use existing light-theme tokens.

#### DESKTOP

Books and Podcasts must be directly visible in the desktop sidebar. No More menu. No hidden submenu. Directly clickable.

#### MOBILE

- DO NOT add Books and Podcasts directly to the fixed bottom navigation.
- Keep existing bottom navigation: Dashboard, Focus, +, Profile, More.
- Books and Podcasts must be available inside the existing More sheet under **LEARNING**: Books, Podcasts.
- Do not create a second mobile navigation system.

#### NAVIGATION

- Click Books → navigate to Books page.
- Click Podcasts → navigate to Podcasts page.
- Active state must update correctly.
- Browser back/forward must continue working.
- Deep links must work.
- Refreshing the page must preserve the correct active sidebar state.

#### DATA

- Do not add mock book data. Do not add mock podcast data.
- If the database/API already exists: connect to it.
- If the models do not exist yet: prepare the routes/components using the existing architecture and implement the required data model safely without affecting existing data.

#### RESPONSIVE

Verify: 360px, 390px, 412px, 420px, 768px, 1024px, 1280px, 1440px.

Books and Podcasts must not cause: horizontal overflow, sidebar overflow, layout shifting, duplicate scrollbars.

#### REGRESSION

After making the change verify all existing routes still navigate correctly (Dashboard, Focus, Tasks, Projects, Calendar, Notes, Journal, Ideas, Goals, Progress, Library, Reminders, Habits, Time Tracking, Analytics, Activity, Search, Archive, Profile, Settings, AI Assistant, Automation, Integrations, Command Center). Do not break existing functionality.

#### FINAL RESULT

Desktop sidebar must clearly show LEARNING → Books, Podcasts as first-class Personal Workspace modules.

Mobile: More → Learning → Books, Podcasts.

Implement this change cleanly using the existing application architecture.

---

### MANMADHAN PROGRESS — FOCUS PAGE: FIX 100VH / NO PAGE SCROLL / CLEAN EXECUTION LAYOUT

**IMPORTANT:** Upgrade the EXISTING Focus page.

- DO NOT rebuild the Focus system.
- DO NOT change existing focus business logic.
- DO NOT remove existing functionality.
- DO NOT create mock sessions.
- DO NOT change the existing timer/session backend unnecessarily.

The current Focus page has an unwanted browser/page scrollbar. Fix the ROOT LAYOUT problem.

#### 1. Current Problem

- Browser scrollbar appears on the right.
- Main timer section occupies too much vertical space.
- Recent Sessions extends below the viewport.
- The page is using normal document flow.
- The Focus screen does not behave like a dedicated execution mode.
- The user has to scroll to see Recent Sessions.

This is NOT acceptable for Focus Mode. Focus must behave as a dedicated single-screen execution interface.

#### 2. Final Focus Architecture

Focus page must use `100dvh` and `overflow: hidden` at the Focus page shell level.

```
┌─────────────────────────────────────────────────────┐
│ FOCUS HEADER                                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│              CURRENT WORK                           │
│                 TIMER                               │
│             PLAY / PAUSE                            │
│               SKIP                                  │
│                                                     │
├─────────────────────────────────────────────────────┤
│ RECENT SESSIONS                                     │
│ [ Session ] [ Session ] [ Session ]                │
└─────────────────────────────────────────────────────┘
```

EVERYTHING MUST FIT INSIDE ONE VIEWPORT. NO PAGE SCROLL.

#### 3. Important Scroll Rule

The Focus page itself must NOT scroll.

```
FocusShell
height: 100dvh
min-height: 0
overflow: hidden
```

Do NOT allow body/html/page scroll. The browser scrollbar must disappear.

Do NOT globally change body overflow if that would break the rest of the application — scope this behavior specifically to Focus Mode.

#### 4. Existing App Shell Compatibility

The application already has header, sidebar, main content shell. DO NOT break these.

If the normal application header/sidebar consumes viewport height, calculate the Focus content correctly:

```
Focus viewport height = 100dvh - existing application header height
```

If Focus Mode intentionally uses a dedicated fullscreen layout, use the existing fullscreen architecture instead. Do not create nested 100vh containers that cause overflow.

CRITICAL: Avoid `100vh + header height + padding + margin` because that produces `100vh + extra pixels = scrollbar`.

Use: `height: calc(100dvh - required-shell-height)` where appropriate.

#### 5. Remove Excessive Vertical Space

Reduce top padding, bottom padding, section gaps, timer spacing, control spacing. The screen should feel balanced. Do NOT make the timer enormous.

Recommended timer size: 72–96px desktop (48–72px for smaller desktop heights). Use `clamp()` where appropriate.

#### 6. Focus Header

Keep header compact.

Current structure (acceptable): `PERSONAL / FOCUS MODE`. Improve spacing.

- Left: PERSONAL / FOCUS MODE
- Right: Sound, Settings, Fullscreen

Keep controls compact. Every icon must work. Do not create decorative icons.

#### 7. Current Work

The title currently shown is `DRAFT Q3 BUDGET ALLOCATION`. This MUST come from the actual active focus/task/project. Do not hardcode it.

If there is no active work: show `NO ACTIVE WORK — Create or select work before starting Focus.`

#### 8. Timer

Timer must remain the primary visual element. Use a real persisted focus session.

States: READY, RUNNING, PAUSED, COMPLETED.

Do not create a timer using only local React state. Timer must survive refresh, navigation where supported, temporary connection loss. Calculate elapsed time from persisted timestamps.

#### 9. Timer Controls

Primary: Start / Pause / Resume.
Secondary: Skip.

Skip must actually perform the existing intended action. Do not show a Skip button if no skip behavior exists. If the existing product uses Complete instead: use the existing business rule. Do not invent a new workflow.

#### 10. Recent Sessions

Recent Sessions must be INSIDE the Focus viewport. Do NOT position it after a fixed-height timer section that pushes it below the browser viewport. Use a compact bottom section.

```
RECENT SESSIONS
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Yesterday    │ │ Aug 3        │ │ Aug 2        │
│ Deep Work    │ │ Reading      │ │ Code Review  │
│ 120m         │ │ 45m          │ │ 60m          │
└──────────────┘ └──────────────┘ └──────────────┘
```

Cards should remain compact.

#### 11. Recent Session Data

The displayed sessions MUST come from actual focus/session data. Do not hardcode "Yesterday / Deep Work / 120m" etc. If no sessions exist: "No recent sessions yet."

#### 12. Recent Sessions Responsive Behavior

- Desktop: show 3–4 compact session cards. Do NOT create vertical overflow.
- Mobile: show 1–2 cards. If more sessions exist, allow ONLY the Recent Sessions strip/list to scroll horizontally. Do not make the entire Focus page scroll.

#### 13. Layout Model

```
FocusShell
  ├── FocusHeader
  ├── FocusMain
  │     ├── WorkLabel
  │     ├── Timer
  │     └── Controls
  └── RecentSessions

FocusShell:      height: 100dvh; display: flex; flex-direction: column; overflow: hidden
FocusMain:       flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: center
RecentSessions:  flex-shrink: 0
```

This prevents Recent Sessions from being pushed below the viewport.

#### 14. No Fixed Pixel Height Stacking

Do NOT create `timer section 700px + recent section 200px + header 64px` = 964px+ → causes scrolling.

Instead use flex, grid, minmax, clamp, available viewport height. The layout must adapt to 640px, 720px, 768px, 800px, 900px, 1080px.

#### 15. 768px Height

Especially important at 1280×768 or 1440×768. Focus must still fit — reduce timer size, spacing, padding automatically. Do NOT introduce scrolling.

#### 16. 1080px Height

At 1920×1080 do not allow excessive empty space. Use balanced spacing. Timer should remain visually centered. Recent Sessions should remain anchored near the bottom.

#### 17. Mobile

Mobile Focus must use 100dvh. Fixed mobile header if applicable. Fixed bottom navigation only if Focus is not in a dedicated fullscreen mode. If Focus Mode is fullscreen: use existing fullscreen behavior. Do NOT let timer/controls/recent sessions/bottom navigation overlap.

#### 18. Mobile Timer

At 360×800, 375×812, 390×844, 412×915, 420×900: timer and primary controls must remain visible. Use smaller typography automatically.

Recommended: 48–64px timer. Controls: minimum 44px touch target.

#### 19. Mobile Recent Sessions

Do not stack 10 cards vertically. Use horizontal compact list or small vertical list with maximum visible items. If horizontal: `overflow-x: auto` — ONLY the Recent Sessions container may scroll horizontally. The Focus page itself must not scroll.

#### 20. Color / Design

Preserve existing ManMadhan Progress theme. Do not redesign the entire Focus page.

- Dark theme: existing dark tokens.
- Light theme: existing light tokens.
- Gold: use for active focus state and primary action.

Do NOT use neon, glow, AI-style gradients, excessive shadows, giant decorative graphics. Keep it calm, professional, human-designed, execution-focused.

#### 21. Current Visual Problem — Fix

Current: large empty timer area → Recent Sessions pushed below viewport → browser scrollbar.

Fix by changing the layout architecture. Do NOT solve it by hiding the scrollbar visually — that is NOT a valid fix. The content must genuinely fit inside the viewport.

#### 22. Do Not Use These Hacks

- `::-webkit-scrollbar { display:none }`
- `position: fixed` everything
- giant negative margins
- clip content
- reduce content opacity
- hide Recent Sessions
- delete functionality to make the page fit

Fix the actual layout.

#### 23. Realtime

Preserve existing realtime behavior.

Focus events: `FOCUS_STARTED`, `FOCUS_PAUSED`, `FOCUS_RESUMED`, `FOCUS_COMPLETED`.

Do NOT emit events every second. Do NOT use `WORKSPACE_UPDATED` for timer ticks. If the current implementation emits unnecessary workspace events, identify and fix the source.

#### 24. Performance

Focus page should render immediately using available data. Do NOT wait for socket connection before displaying the page.

Correct: load focus data → render → connect realtime → synchronize. Do not create artificial delays. Do not use `setTimeout` to simulate loading.

#### 25. Functional Validation

Test: Start, Pause, Resume, Complete, Skip if supported, Refresh, Navigation, Workspace switching, Realtime update, Recent Sessions update. Verify all data persists.

#### 26. Visual Validation

Test: 1280×720, 1280×768, 1440×768, 1440×900, 1920×1080.
Mobile: 360×800, 390×844, 412×915, 420×900.

For every viewport:
- [ ] No browser scrollbar
- [ ] No body scroll
- [ ] Timer visible
- [ ] Current work visible
- [ ] Controls visible
- [ ] Recent Sessions visible
- [ ] No overlap
- [ ] No clipping
- [ ] No horizontal page overflow
- [ ] Header correct
- [ ] Navigation correct

#### 27. Final Acceptance

The Focus page must visually behave like a dedicated single-screen Focus Mode.

```
┌─────────────────────────────────────────────────┐
│ PERSONAL / FOCUS MODE              SOUND ⚙ ⛶   │
│                                                 │
│              CURRENT WORK                       │
│        DRAFT Q3 BUDGET ALLOCATION               │
│                  90:00                          │
│             ■  PLAY     SKIP                    │
│                                                 │
├─────────────────────────────────────────────────┤
│ RECENT SESSIONS                                  │
│ [Yesterday] [Aug 3] [Aug 2]                    │
└─────────────────────────────────────────────────┘
```

Everything fits. No browser scroll. No hidden content. No fake data. No broken timer. No layout overflow.

#### Final Command

Inspect the current Focus implementation. Identify exactly which parent container is causing the page height to exceed the viewport. Fix the root cause. Do NOT simply hide the scrollbar. Convert the Focus screen into a genuine 100dvh execution layout. Preserve all existing Focus functionality and data logic. Then test every specified viewport.

If a bug is found: identify the root cause → fix it → retest → check regression. Do not leave the Focus page with known layout bugs.

---

### MANMADHAN PROGRESS — PERSONAL WORKSPACE: GLOBAL UX + REAL FUNCTIONALITY UPGRADE

**READ ui.md FIRST.**

You are upgrading the EXISTING ManMadhan Progress application. The current implementation has several pages that visually resemble generic AI-generated productivity dashboards. THIS MUST BE CORRECTED.

The final product must feel like a carefully designed, human-made professional Personal Execution Workspace.

This is NOT a visual redesign only. You must improve: application shell, fixed header, internal scrolling, Tasks, Kanban, Projects, Project details, Progress, Calendar, real interactions, realtime updates, responsive behavior, empty/loading/error states, data relationships — WITHOUT BREAKING EXISTING FUNCTIONALITY.

#### 0. Non-Destructive Rule

DO NOT rebuild the application. DO NOT replace the existing architecture, database, authentication, or existing APIs unnecessarily. DO NOT replace existing realtime/socket infrastructure unless there is a verified architectural problem. DO NOT delete working functionality. DO NOT create duplicate routes.

First inspect the existing implementation. Then: AUDIT → PRESERVE → FIX → EXTEND → UPGRADE → TEST.

#### 1. Most Important Global Problem

The current pages behave like normal webpages, causing: browser-level scrollbar, header scrolling away, inconsistent page heights, excessive whitespace, content extending beyond viewport, poor internal scrolling, pages feeling like separate templates, inconsistent spacing, generic dashboard appearance.

Fix the APPLICATION SHELL.

#### 2. Global Application Shell

The entire Personal Workspace must use 100dvh architecture.

```
Desktop:
┌──────────────┬────────────────────────────────────┐
│              │ FIXED HEADER                       │
│              ├────────────────────────────────────┤
│ FIXED        │                                    │
│ SIDEBAR      │ SCROLLABLE PAGE CONTENT             │
└──────────────┴────────────────────────────────────┘

Mobile:
┌──────────────────────────────────────────────────┐
│ FIXED MOBILE HEADER                              │
├──────────────────────────────────────────────────┤
│ SCROLLABLE PAGE CONTENT                          │
├──────────────────────────────────────────────────┤
│ FIXED BOTTOM NAV                                 │
└──────────────────────────────────────────────────┘
```

The browser/body itself must NOT become the scrolling container. Use page-level internal scroll containers.

#### 3. Fixed Header

The header MUST remain fixed while page content scrolls.

- Desktop: height 60–64px
- Mobile: height 56–60px

Must remain visible when Tasks/Projects/Calendar/Progress content scrolls, Search opens, Details open. Do NOT allow header scrolling away, duplication, nested headers, or content appearing behind header. Use the existing application layout architecture — do not create separate fake headers per page.

#### 4. Page Height Model

```
AppShell
├── Sidebar
└── MainShell
     ├── Fixed Header
     └── PageViewport
          └── PageContent
               └── InternalScrollContainer
```

Do NOT use `height: 100vh` inside multiple nested containers. Prefer `100dvh` and `calc(100dvh - headerHeight)` where necessary. Avoid `100vh + header + padding + margin` (causes overflow).

#### 5. No Global Scroll Hacks

Do NOT hide the scrollbar (`::-webkit-scrollbar { display: none }`), clip content, use giant negative margins, or use fixed positioning everywhere. Fix the actual layout architecture.

#### 6. Page-Specific Scrolling

- Tasks: board scrolls internally.
- Projects: grid/list scrolls internally.
- Progress: content area scrolls internally.
- Calendar: calendar viewport stays inside application shell.
- Details: detail content scrolls internally.
- Focus: NO PAGE SCROLL.
- Dashboard: main content can internally scroll when required.

The browser/body should never become the accidental scroll container.

#### 7. Human-Made Design Rule

Current pages look too much like generated dashboard templates. Remove that feeling.

Do NOT use: excessive cards, huge empty spaces, excessive rounded containers, generic dashboard headings, unnecessary subtitles, repetitive card structures, decorative gradients, AI-style glow, futuristic effects, excessive badges/borders, fake statistics, meaningless icons.

Design should feel: professional, quiet, intentional, human, editorial, execution-focused. Use whitespace intelligently, not empty space for its own sake.

#### 8. Global Card Rule

Not every section should be a card. Use typography, spacing, dividers, subtle surfaces before adding cards. Cards should represent meaningful objects (Task, Project, Book, Podcast). Page heading / Toolbar / Section title do not need cards.

#### 9. Global Border Rule

Avoid visible white borders in dark mode. Dark borders should be subtle, using existing theme tokens. Do not randomly introduce `border-white` / `border-gray-300` into dark theme. Borders should communicate structure, not decoration.

#### 10. Tasks — Complete Upgrade

Upgrade into a REAL execution board.

Header: `PERSONAL / TASKS — Execution Board`

Toolbar: Search, Filter, Sort, View, New Task — all controls must work.

#### 11. Task Views

Support Kanban, List. If architecture allows, Calendar/Timeline can be added later. Kanban is default.

#### 12. Kanban

REAL DRAG AND DROP.

Columns: TO DO, IN PROGRESS, REVIEW, COMPLETED — each shows real task count.

Task movement: drag → optimistic UI update → persist status → database update → realtime event → other clients update. If API fails: rollback task, show error, do not leave UI inconsistent.

#### 13. Kanban Internal Scroll

The Kanban page itself must NOT scroll.

```
Tasks Page (100dvh)
├── Fixed App Header
├── Task Toolbar
└── Kanban View
     ├── Column → INTERNAL VERTICAL SCROLL
     ├── Column → INTERNAL VERTICAL SCROLL
     └── Column → INTERNAL VERTICAL SCROLL
```

Desktop: horizontal columns remain accessible; each column scrolls vertically internally. Do NOT make the whole browser page scroll.

#### 14. Task Card

Show where available: Priority, Title, Due date, Project, Goal, Estimated time, Tracked time, Subtask progress, Status. Do NOT show unnecessary information.

Click task → Task Detail. Actions (Complete, Edit, Move, Delete, Start Focus) must actually work.

#### 15. Task Creation

New Task opens the existing creation modal/sheet.

Fields: Title, Description, Priority, Due date, Project, Goal, Estimate, Tags.

After creation: database → realtime → board update. No page reload.

#### 16. Task → Focus Relation

Focus MUST depend on real work: Create Task → Task exists → Start Focus → Focus session references Task → Track time → Complete Focus → Task progress updates. Do not allow the dashboard/focus system to invent work.

#### 17. Projects — Complete Upgrade

Upgrade into a real Project Workspace.

Header: `PERSONAL / PROJECTS — Projects`

Toolbar: Search, Filter, Sort, View, New Project.

#### 18. Project Card

Show: Project name, Status, Priority, Deadline, Task count, Completed task count, Progress, Tracked time, Last activity.

Progress MUST be calculated from real tasks (e.g. 8 tasks, 5 completed → 62.5%). Never hardcode percentages unless derived from actual data.

#### 19. Project Details

Click Project → Project Detail page.

Sections: Overview, Tasks, Progress, Timeline, Notes, Files, Activity, Time.

Actions (Edit, Archive, Complete, Add Task, Add Note, Start Focus, Add File) must work.

#### 20. Project Progress

`Completed tasks ÷ Total tasks`, using actual linked task data. If no tasks: "No tasks yet. [ Add Task ]" — never show 0% or fake progress unless genuinely calculated.

#### 21. Progress Page — Real Execution Analytics

Must answer: What did I actually do? How much did I complete? How much time did I spend? Where did my time go? What improved? What remains?

#### 22. Progress Structure

- Top: Progress
- Date range: Today / This Week / This Month / Custom
- Summary: Tasks completed, Focus time, Work time, Projects progressed, Goals progressed
- Then: Daily Work Graph
- Then: Completion trend
- Then: Project progress
- Then: Goal progress
- Then: Learning progress

All values must be real.

#### 23. Daily Work Graph

Must use real records: focus sessions, completed tasks, tracked time, work sessions.

Allow switching metric: Focus Minutes / Tasks Done / Work Time — toggle must actually change the graph. No fake or decorative graph without data.

#### 24. Progress Details

Every metric should be explainable/clickable:
- Focus Time → focus sessions
- Tasks Completed → completed tasks
- Project Progress → related projects
- Learning → books/podcasts

Do not create charts that cannot be traced to real records.

#### 25. Calendar — Complete Upgrade

Make Calendar a REAL interactive calendar (current one wastes viewport space and behaves like a static month image).

#### 26. Calendar Navigation

Controls: Today, Previous, Next.

- Previous → previous month/day/week depending on current view.
- Next → next.
- Today → current date.

Do NOT reload the entire page. Update state immediately.

#### 27. Calendar Views

Support Month, Week, Day, Agenda. Preserve existing implementation where possible.

Default: Month on desktop; Agenda/Day on mobile.

#### 28. Click Date

Click a date → selected date changes; show events, tasks, reminders, deadlines for that date. Selected date must be visually clear.

#### 29. Click Event

Click event → event detail. Actions (Edit, Delete, Open linked task, Open linked project) must work.

#### 30. Create Calendar Event

Click empty date/time → Create Event.

Fields: Title, Date, Start, End, Description, Related Task, Related Project, Reminder.

Save: database → UI → realtime. No page reload.

#### 31. Calendar No Page Scroll

Calendar must fit inside the available application viewport. Do NOT allow browser/page scrolling.

```
CalendarPage (100dvh available area)
├── Fixed App Header
├── Calendar Toolbar
└── CalendarViewport
     ├── Calendar Grid
     └── Side/Agenda Panel
```

If content exceeds available space, ONLY the appropriate internal calendar region may scroll.

#### 32. Calendar Month View

Month grid must fill available height intelligently — no enormous empty cells. Each day cell: Date, Events, Task deadlines, Reminders. If too many events: "+3 more" → click → day details.

#### 33. Calendar Previous/Next

Navigation must work correctly across months, years, weeks, days (e.g. December 2026 → January 2027, January 2027 → December 2026). Do not hardcode August 2026 — use actual date calculations.

#### 34. Calendar Today

Today must always use the user's current date/time context; highlight today. Do not hardcode August 9.

#### 35. Realtime Calendar

If event created/changed/deleted from another page, Calendar updates. Use specific realtime events — do NOT use broad `WORKSPACE_UPDATED` for every calendar change.

#### 36. Dashboard Relationship

Dashboard upcoming section must use real Calendar/Tasks/Projects/Reminders data (Upcoming Deadline, Upcoming Event, Reminder). Click → correct detail page.

#### 37. Header Fix — All Pages

Fix globally so headers stay fixed across scrolling content on Dashboard, Tasks, Projects, Progress, Calendar.

#### 38. Page Toolbar

Page-specific toolbar may scroll with content or remain sticky depending on page type:
- Tasks: toolbar sticky above Kanban.
- Calendar: toolbar remains visible.
- Progress: filters can remain sticky.

Use `position: sticky` only where appropriate — not everything fixed.

#### 39. Responsive

Desktop: 1280, 1440, 1600, 1920.
Mobile: 360, 375, 390, 393, 412, 420, 430.
Tablet: 768, 820, 1024.
Verify all.

#### 40. Mobile Tasks

Mobile Kanban: horizontal board scrolling; each column vertical internal scroll only if required. Alternative: List view can be default on small screens if supported. Task creation: bottom sheet. Task detail: full-screen sheet/page.

#### 41. Mobile Projects

Project cards stack naturally, no excessive whitespace. Project detail: full-screen mobile page.

#### 42. Mobile Progress

Charts adapt to narrow width — do not force desktop chart dimensions. Metrics: 2-column grid where appropriate. Graphs: horizontal overflow only inside graph container if genuinely necessary.

#### 43. Mobile Calendar

Do NOT force a tiny 7-column month calendar on a 360px screen. Prefer Agenda/Day with Previous/Today/Next. Month view can remain available.

#### 44. Dark Theme

Preserve existing dark theme: `#0B0B0C`, `#141416`, `#18181A`. Gold: `#D8A52B` used selectively. NO WHITE BORDERS — no `border-white`, bright gray outlines, or excessive glowing gold. Borders should be subtle.

#### 45. Light Theme

Preserve existing light theme. Ensure text/border/button contrast and muted text are correct. Do not mix dark-theme values into light theme.

#### 46. Icons

Use existing icon library. Icons should communicate functionality — avoid decorative icon overload.

#### 47. Empty States

Real empty states, e.g.:
- Tasks: "No tasks yet. [ Create Task ]"
- Projects: "No projects yet. [ Create Project ]"
- Calendar: "No events on this day. [ Create Event ]"
- Progress: "Not enough activity yet. Start working to build your progress."

Do NOT create fake content.

#### 48. Loading States

Use skeleton/loading states, not "Loading..." text everywhere. Avoid layout jumping.

#### 49. Error States

If API fails, show a useful error with Retry. Do not silently fail.

#### 50. Realtime

Audit socket listeners. Prevent duplicate listeners/events, unnecessary reconnects, unnecessary workspace updates.

Specific events: `TASK_CREATED`, `TASK_UPDATED`, `TASK_COMPLETED`, `TASK_DELETED`, `PROJECT_CREATED`, `PROJECT_UPDATED`, `PROJECT_COMPLETED`, `CALENDAR_EVENT_CREATED`, `CALENDAR_EVENT_UPDATED`, `CALENDAR_EVENT_DELETED`, `FOCUS_STARTED`, `FOCUS_PAUSED`, `FOCUS_RESUMED`, `FOCUS_COMPLETED`, `GOAL_UPDATED`.

Do NOT use `WORKSPACE_UPDATED` as a universal event.

#### 51. Performance

Pages must render from their actual data source. Do not wait for socket connection.

Correct: API/data load → render → socket background connection → realtime synchronization. No artificial delays, no `setTimeout()` to simulate real behavior.

#### 52. Real Data Relationships

Ensure real ID-based relationships: Task↔Project, Task↔Goal, Task↔Calendar, Task↔Focus, Project↔Goal, Project↔Calendar, Focus↔Time Tracking, Book↔Goal, Book↔Notes, Podcast↔Goal, Podcast↔Notes.

#### 53. No Fake Numbers

Remove all hardcoded task counts, project counts, progress, focus time, percentages, calendar events, recent sessions, book progress, podcast progress. If the database has no data, show empty state.

#### 54. Bug Fix Loop

For every bug: Reproduce → Identify root cause → Fix root cause → Run type check → Run lint → Run tests → Test the affected page → Test related pages → Check responsive behavior → Continue.

Do NOT hide errors. Do NOT use `any` to silence TypeScript. Do NOT use `@ts-ignore` as a shortcut.

#### 55. Global Regression

After changes verify no route breaks: Dashboard, Focus, Tasks, Projects, Calendar, Notes, Journal, Ideas, Goals, Progress, Books, Podcasts, Library, Reminders, Habits, Time Tracking, Analytics, Activity, Search, Archive, Profile, Settings, AI Assistant, Automation, Integrations, Command Center.

#### 56. Final Visual Target

The application should feel like a serious personal execution system — NOT a generic AI dashboard.

Visual hierarchy: Content → Action → Context → Details — not Card → Card → Card → Card → Card. Use fewer but better components.

#### 57. Final Acceptance Test

**Desktop:**
- [ ] Header fixed
- [ ] Sidebar fixed
- [ ] Browser does not scroll
- [ ] Main content scrolls internally
- [ ] Tasks board works
- [ ] Drag/drop works
- [ ] Task creation works
- [ ] Project creation works
- [ ] Project detail works
- [ ] Progress is real
- [ ] Progress details work
- [ ] Calendar fits viewport
- [ ] Previous works
- [ ] Next works
- [ ] Today works
- [ ] Date click works
- [ ] Event click works
- [ ] Event creation works
- [ ] No fake calendar data
- [ ] No unnecessary whitespace

**Mobile:**
- [ ] Header fixed
- [ ] Bottom nav fixed
- [ ] No horizontal page overflow
- [ ] Tasks usable
- [ ] Kanban usable
- [ ] Project cards usable
- [ ] Progress readable
- [ ] Calendar usable
- [ ] Agenda usable
- [ ] Previous works
- [ ] Next works
- [ ] Today works

**Data:**
- [ ] No mock tasks
- [ ] No mock projects
- [ ] No fake progress
- [ ] No fake calendar events
- [ ] No fake sessions
- [ ] No fake charts

**Realtime:**
- [ ] Task changes synchronize
- [ ] Project changes synchronize
- [ ] Calendar changes synchronize
- [ ] Focus changes synchronize
- [ ] No duplicate socket listeners
- [ ] No unnecessary WORKSPACE_UPDATED events

#### Final Command

READ ui.md. INSPECT THE EXISTING CODEBASE. DO NOT REBUILD THE PRODUCT. UPGRADE THE EXISTING PERSONAL WORKSPACE.

FIX THE GLOBAL APPLICATION SHELL FIRST. THEN FIX: 1. Header, 2. Tasks, 3. Kanban, 4. Projects, 5. Project Details, 6. Progress, 7. Calendar. Then verify all remaining pages.

The browser/page itself must NOT become the accidental scroll container. Use internal scrolling where appropriate. Make the header fixed. Make Kanban genuinely drag-and-drop. Make Tasks genuinely functional. Make Projects genuinely functional. Make Progress genuinely data-driven. Make Calendar genuinely interactive. Previous/Next/Today/date navigation MUST work.

No fake data. No dead buttons. No mock interactions. No unnecessary cards. No AI-generated visual feeling. No excessive whitespace. No white borders in dark theme. No known bugs left unresolved.

If you find a bug: FIX IT. If fixing it introduces another bug: FIX THAT TOO. Continue until the application passes the final regression, responsive, functional, and build checks.

**FINAL RESULT:** A complete, professional, human-designed, real-time ManMadhan Progress Personal Workspace.

---

## PART 2 — Complete Product Upgrade (Full Personal Workspace Spec)

### MANMADHAN PROGRESS — PERSONAL WORKSPACE: COMPLETE PRODUCT UPGRADE

**READ `ui.md` FIRST AND TREAT IT AS THE CANONICAL SPECIFICATION.**

You are working on the EXISTING ManMadhan Progress application. Your task is to turn the existing Personal Workspace into a COMPLETE, REAL, PROFESSIONAL, HUMAN-DESIGNED PERSONAL EXECUTION WORKSPACE.

This is an UPGRADE of the existing application.

- DO NOT rebuild the application from scratch.
- DO NOT replace working architecture unnecessarily.
- DO NOT remove existing functionality.
- DO NOT break existing routes.
- DO NOT reset the database.
- DO NOT replace working authentication.
- DO NOT replace working realtime infrastructure unnecessarily.

#### 1. Core Objective

Upgrade ALL Personal Workspace pages — not only Dashboard/Tasks/Projects/Calendar/Focus but EVERY page defined in `ui.md`.

Each page must be: REAL, FUNCTIONAL, CONNECTED, DATA-DRIVEN, RESPONSIVE, CONSISTENT, PRODUCTION-READY.

Do not create isolated pages. Everything must work as ONE Personal Workspace.

#### 2. First Action — Full Codebase Audit

Before changing code: READ `ui.md`. Then inspect the complete existing codebase.

Map: Routes, Components, Layouts, Database, Models, Migrations, API, Authentication, Authorization, Workspace logic, Realtime, State management, Queries, Mutations, Storage, Theme, Responsive system.

Create an internal feature map per page: existing implementation → existing functionality → missing functionality → mock data → broken functionality → UI problems → performance problems → required upgrade.

Do NOT start by blindly rewriting files.

#### 3. Non-Destructive Rule

- IF WORKING → PRESERVE
- IF WORKING BUT POOR UI → UPGRADE UI
- IF MOCK → CONNECT REAL DATA
- IF PARTIALLY WORKING → COMPLETE IT
- IF BROKEN → FIX ROOT CAUSE
- IF MISSING → IMPLEMENT
- IF ARCHITECTURE IS UNSAFE → MAKE THE SMALLEST SAFE CHANGE

Never choose a full rewrite when an extension is possible.

#### 4. Global Application Shell

Fix the application shell FIRST. Entire Personal Workspace must use `100dvh`.

- Desktop: FIXED SIDEBAR + FIXED HEADER + INTERNAL PAGE SCROLL
- Mobile: FIXED HEADER + INTERNAL PAGE SCROLL + FIXED BOTTOM NAV

The browser body must NOT be the accidental scroll container. Do not solve scrolling by hiding the scrollbar — fix the actual layout.

#### 5. Global Header

One consistent application header.

- Desktop: Page Name, Workspace Context, Search, Notifications, Profile. Search opens dedicated Search. Header remains fixed.
- Mobile: Compact. Workspace switcher where appropriate. Notifications. Profile. No unnecessary controls.

#### 6. Global Page System

```
PageShell
 ├── PageHeader
 ├── PageToolbar
 └── PageContent

PageShell:   height: available viewport; min-height: 0; overflow: hidden
PageContent: overflow-y: auto
```

Use page-specific internal scrolling. Do NOT make every page independently use `height: 100vh` (nested 100vh containers create overflow).

#### 7. Global Design Language

Product must feel: Human-designed, Professional, Calm, Premium, Functional, Execution-focused. NOT AI-generated, Futuristic, Over-designed, Template-like.

Avoid: Excessive cards, excessive rounded containers, excessive borders, glow, neon, glassmorphism, 3D decoration, huge empty spaces, fake analytics, decorative graphs, unnecessary badges.

Use: Typography, Whitespace, Dividers, Subtle surfaces, Strong hierarchy. Cards only where the content represents a meaningful object.

#### 8. Global Data Rule

ZERO fake production data. Remove mock tasks, projects, calendar events, books, podcasts, analytics, progress, notifications, activity, sessions, fake charts, hardcoded counts. If no real data exists: SHOW EMPTY STATE. Never fabricate data to make the page look populated.

#### 9. Global Interaction Rule

Every visible button must work: Create, Edit, Delete, Save, Cancel, Complete, Archive, Restore, Search, Filter, Sort, Move, Start, Pause, Resume, Continue, Open, Close, Previous, Next — must perform a real action. No dead buttons. No fake interactions.

#### 10. Dashboard — Upgrade

Dashboard is the DECISION CENTER. Show: Today's Tasks, Current Focus, Active Projects, Today's Progress, Daily Work Graph, Today's Priorities, Upcoming, Project Pulse, Learning Pulse, Recent Activity.

Optional: Active Book, Now Listening — only show learning widgets when actual data exists.

New features: Quick Task, Quick Project, Quick Note, Quick Idea, Quick Goal, Quick Calendar Event, Start Focus, Continue Reading, Resume Podcast.

Dashboard metrics must derive from actual data. Clicking any metric must open its related page.

#### 11. Focus — Upgrade

Dedicated execution environment. NO PAGE SCROLL.

Focus requires actual work: Task/Project/Work → Focus Session → Time → Completion → Progress.

Features: Start, Pause, Resume, Complete, Cancel, Change Work, Session Notes. Persist sessions, refresh-safe, realtime-safe.

Show: Current Work, Timer, Session duration, Today's focus time, Recent sessions, Session history.

New feature: Focus session notes.

#### 12. Tasks — Upgrade

REAL execution board.

Views: Kanban, List.

Kanban stages: Backlog, To Do, In Progress, Review, Completed. REAL drag and drop.

New features: Subtasks, Dependencies, Priority, Due date, Estimate, Tracked time, Tags, Project, Goal, Focus, Notes, Attachments, Recurring task, Task reminders.

Task detail: Overview, Description, Subtasks, Activity, Time, Notes, Relations.

Task actions: Start Focus, Complete, Move, Edit, Duplicate, Archive, Delete.

#### 13. Kanban

REAL drag/drop. Persist immediately. Optimistic UI. Rollback on failure. Realtime synchronization.

- Desktop: columns visible, internally scroll.
- Mobile: horizontal board.

Do not make the whole page scroll.

#### 14. Projects — Upgrade

Real project management workspace.

Views: Grid, List.

Project card: Name, Status, Priority, Deadline, Progress, Tasks, Completed Tasks, Tracked Time, Last Activity.

Project detail: Overview, Tasks, Timeline, Progress, Goals, Notes, Files, Activity, Time.

New features: Milestones, Project health, Deadline status, Project priority, Project notes, Project files, Project activity, Project focus.

Progress derived from real tasks.

#### 15. Calendar — Upgrade

Fully interactive.

Views: Month, Week, Day, Agenda.

Controls: Today, Previous, Next, View switch.

- Click date: select date.
- Click event: open event detail.
- Click empty space: create event.

Features: Tasks, Deadlines, Reminders, Focus sessions, Project deadlines, Goals.

Must NOT create browser scrolling — only calendar content may internally scroll when required.

Month view must correctly navigate previous/next month and year. Never hardcode dates.

#### 16. Notes — Upgrade

Real knowledge workspace.

Features: Create, Edit, Delete, Archive, Pin, Tags, Search, Favorites.

Relationships: Task, Project, Goal, Book, Podcast, Journal.

Add: Recently edited, Pinned, Tags, Linked content.

#### 17. Journal — Upgrade

Daily reflection workspace.

Features: Daily entries, Search, Calendar navigation, Tags, Mood/context if already supported, Goals, Tasks, Focus summary, Learning summary.

Journal entry can reference Tasks, Projects, Goals, Books, Podcasts. Do not create sensitive analytics unless explicitly required.

#### 18. Ideas — Upgrade

Idea inbox.

Statuses: Captured, Exploring, Planned, Building, Converted, Archived.

Features: Create, Edit, Tag, Search, Convert.

Conversion: Idea → Task, or Idea → Project, or Idea → Goal. Use real database relationships.

#### 19. Goals — Upgrade

Goals become the strategic layer.

Goal: Outcome, Deadline, Progress, Milestones.

Connect: Goals → Projects → Tasks → Focus. Also Goals → Books, Podcasts, Habits.

New features: Milestones, Goal health, Deadline status, Related work, Progress history.

#### 20. Progress — Upgrade

Progress must explain actual execution.

Filters: Today, Week, Month, Custom.

Metrics: Tasks completed, Focus time, Work time, Projects progressed, Goals progressed, Learning time, Habits completed.

Graphs: Daily work, Task completion, Focus time, Project progress, Goal progress, Learning.

Metric toggle must change actual data. Click graph data → related records.

#### 21. Books — Upgrade

First-class Learning module.

Statuses: Want to Read, Reading, Paused, Completed, Abandoned.

Features: Book library, Active book, Reading progress, Current page, Target page, Reading sessions, Reading history, Notes, Highlights, Rating, Review.

New: Reading goals, Reading streak, Pages read today, Reading time this week. All calculated from real data.

#### 22. Podcasts — Upgrade

First-class Learning module.

Features: Podcasts, Episodes, Now Listening, Queue, Saved, History.

Track: Current position, Duration, Completion, Listening sessions.

New: Continue Listening, Recently Played, Queue management, Episode notes, Saved episodes. No fake podcast data.

#### 23. Library — Upgrade

Files/resources.

Features: Upload, Folders, Tags, Search, Preview, Download, Archive, Delete.

Connect files to: Tasks, Projects, Goals, Notes, Books, Podcasts.

#### 24. Reminders — Upgrade

Features: Create, Edit, Complete, Snooze, Delete, Recurring.

Reminder can connect to: Task, Project, Goal, Book, Podcast, Calendar.

#### 25. Habits — Upgrade

Features: Create, Frequency, Target, Completion, History, Streak, Pause, Archive.

New: Habit calendar, Weekly completion, Monthly completion, Goal relationship. Never fake streaks.

#### 26. Time Tracking — Upgrade

Track: Tasks, Projects, Focus, Reading, Listening.

Views: Today, Week, Month.

Features: Manual entry where supported, Session history, Edit entry, Delete entry. Every total must derive from real sessions.

#### 27. Analytics — Upgrade

Must answer: Where did my time go? What did I complete? What am I spending time on? What is improving?

Metrics: Execution, Projects, Focus, Learning, Habits, Goals. Use actual historical records.

#### 28. Activity — Upgrade

Real activity feed.

Events: Task created, Task completed, Project changed, Focus completed, Goal updated, Book updated, Podcast updated, Habit completed, Note created, Calendar event created.

Filters: All, Tasks, Projects, Learning, Goals, System.

#### 29. Search — Upgrade

Global search covering: Tasks, Projects, Goals, Notes, Journal, Ideas, Books, Podcasts, Episodes, Calendar, Library, Habits, Reminders.

Features: Cmd/Ctrl+K, Recent searches, Keyboard navigation, Filters, Grouped results, Search highlighting. No fake results.

#### 30. Archive — Upgrade

Show archived: Tasks, Projects, Notes, Ideas, Goals, Books, Podcasts.

Actions: Restore, Delete permanently where allowed.

#### 31. Profile

Name, Avatar, Account, Workspace, Activity summary. Preserve existing account architecture.

#### 32. Settings

Sections: Account, Appearance, Workspace, Notifications, Privacy, Security, Data, Preferences. All settings must persist.

#### 33. Notification Center

Real notification system.

Types: Task reminder, Deadline, Project update, Goal update, Calendar reminder, System notification.

Features: Unread, Read, Mark all read, Open related content, Dismiss.

#### 34. AI Assistant

If AI integration exists: connect it properly.

Possible actions: Summarize tasks, Plan work, Summarize project, Summarize notes, Analyze progress.

If AI is unavailable: show honest unavailable state. NEVER simulate AI.

#### 35. Automation

Real automation framework where supported.

Structure: Trigger, Condition, Action, Execution.

Features: Create, Edit, Enable, Disable, Execution history. Do not claim execution unless it actually happened.

#### 36. Integrations

Show Connected / Not Connected — real connection state. Do not fake integrations.

#### 37. Command Center

High-level execution control surface.

Show: Current Work, Pending Tasks, Upcoming Deadlines, Active Projects, Current Focus, Quick Actions, Attention Required. Do not duplicate the entire Dashboard.

#### 38. New Cross-Page Features

**Global Quick Create (+):** Task, Project, Note, Idea, Goal, Calendar Event, Reminder, Book, Podcast. Desktop: center popup. Mobile: bottom sheet.

**Global Command Search (Cmd/Ctrl+K):** Search + actions, e.g. Create task, Open project, Start focus, Open calendar, Add note.

**Smart Relationships:** Everything should be linkable — Task ↔ Project ↔ Goal ↔ Calendar ↔ Focus ↔ Notes; Book ↔ Goal ↔ Notes ↔ Reading Sessions; Podcast ↔ Goal ↔ Notes ↔ Listening Sessions.

#### 39. Realtime System

Use specific events:

```
TASK_CREATED, TASK_UPDATED, TASK_COMPLETED, TASK_DELETED
PROJECT_CREATED, PROJECT_UPDATED, PROJECT_COMPLETED
CALENDAR_EVENT_CREATED, CALENDAR_EVENT_UPDATED, CALENDAR_EVENT_DELETED
FOCUS_STARTED, FOCUS_PAUSED, FOCUS_RESUMED, FOCUS_COMPLETED
BOOK_CREATED, BOOK_UPDATED, READING_STARTED, READING_UPDATED, READING_COMPLETED
PODCAST_CREATED, EPISODE_PROGRESS_UPDATED, LISTENING_STARTED, LISTENING_COMPLETED
GOAL_UPDATED
HABIT_COMPLETED
NOTIFICATION_CREATED
```

Do not use `WORKSPACE_UPDATED` as a universal event.

#### 40. Realtime Performance

Do not wait for socket connection before rendering.

Correct: Load data → render → socket background connection → realtime synchronization.

Prevent: duplicate listeners, duplicate events, reconnect loops, unnecessary refetches.

#### 41. Performance

Do NOT fetch all 32 pages on startup. Use page-specific queries and existing caching. Use optimistic mutations where appropriate. Avoid `fetchEverything` / `refetchEverything` / full page reload.

#### 42. Loading / Empty / Error States

Every page must support Loading, Empty, Error, Success. Empty states should explain the next action (e.g. "No projects yet. [ Create Project ]" — not "No data.").

#### 43. Accessibility

Add: Keyboard navigation, Focus states, ARIA labels, Accessible buttons/dialogs/dropdowns, Accessible drag/drop alternatives. Do not make drag-and-drop the ONLY way to move tasks.

#### 44. Mobile

Optimize 360, 375, 390, 393, 412, 420, 430. Desktop: 1024, 1280, 1440, 1600, 1920.

No: horizontal page overflow, content behind bottom navigation, header overlap, double scrollbar, tiny touch targets.

#### 45. Dark / Light Theme

Preserve both themes.

Dark: `#0B0B0C`, `#141416`, `#18181A`. Gold: `#D8A52B` — indicates active/selected/progress/primary action, not applied to the entire UI.

Dark theme: NO WHITE BORDERS. Light theme: correct contrast.

#### 46. Human-Designed Rule

Before adding any UI component ask: "Does this improve the user's ability to understand or execute work?" If not: REMOVE IT. Do not add UI merely because the page looks empty.

#### 47. Bug Rectification Loop

REPRODUCE → IDENTIFY ROOT CAUSE → FIX → TYPE CHECK → LINT → TEST → REGRESSION → CONTINUE.

Never hide bugs with `any`, `@ts-ignore`, `eslint-disable`, `display:none`, `overflow:hidden` unless genuinely justified and documented.

#### 48. Regression Test

After all upgrades test: Dashboard, Focus, Tasks, Projects, Calendar, Notes, Journal, Ideas, Goals, Progress, Books, Podcasts, Library, Reminders, Habits, Time Tracking, Analytics, Activity, Search, Archive, Profile, Settings, AI Assistant, Automation, Integrations, Command Center, Task Detail, Project Detail, Book Detail, Podcast Detail, Goal Detail, Notification Center.

#### 49. Final Definition of Done

- [ ] All pages work
- [ ] All routes work
- [ ] All buttons work
- [ ] All mutations persist
- [ ] No mock data
- [ ] No fake data
- [ ] No dead buttons
- [ ] No broken links
- [ ] Tasks work
- [ ] Drag/drop works
- [ ] Projects work
- [ ] Project details work
- [ ] Calendar works
- [ ] Previous/Next works
- [ ] Today works
- [ ] Date selection works
- [ ] Events work
- [ ] Focus works
- [ ] Timer persists
- [ ] Books work
- [ ] Reading sessions work
- [ ] Podcasts work
- [ ] Listening sessions work
- [ ] Notes work
- [ ] Journal works
- [ ] Ideas work
- [ ] Goals work
- [ ] Habits work
- [ ] Time tracking works
- [ ] Progress works
- [ ] Analytics works
- [ ] Search works
- [ ] Library works
- [ ] Reminders work
- [ ] Notifications work
- [ ] Settings work
- [ ] Workspace switching works
- [ ] Realtime works
- [ ] Internal scrolling works
- [ ] Header stays fixed
- [ ] Sidebar stays fixed
- [ ] Mobile bottom nav stays fixed
- [ ] Focus has no page scroll
- [ ] Calendar has no page scroll
- [ ] Tasks use internal Kanban scrolling
- [ ] Desktop works
- [ ] Mobile works
- [ ] Dark theme works
- [ ] Light theme works
- [ ] No white dark-theme borders
- [ ] No horizontal overflow
- [ ] No duplicate socket listeners
- [ ] No unnecessary WORKSPACE_UPDATED events
- [ ] No known runtime errors
- [ ] No known TypeScript errors
- [ ] No known build errors

#### 50. Final Execution Strategy

DO NOT attempt to make every page visually different. Create a shared professional design system:

Shared PageShell, PageHeader, Toolbar, Search, Filter, EmptyState, LoadingState, ErrorState, Dialog, BottomSheet, DetailPanel, DataTable, Kanban, Timeline, ActivityFeed, ProgressIndicator.

Then specialize each page around its actual purpose.

#### 51. Implementation Order

1. Audit entire codebase.
2. Fix global shell.
3. Fix header/sidebar/mobile navigation.
4. Fix data architecture and mock data.
5. Fix Dashboard.
6. Fix Tasks + Kanban.
7. Fix Projects + Project Details.
8. Fix Focus.
9. Fix Calendar.
10. Fix Notes + Journal + Ideas.
11. Fix Goals + Progress.
12. Implement Books + Reading.
13. Implement Podcasts + Listening.
14. Fix Library + Reminders.
15. Fix Habits + Time Tracking.
16. Fix Analytics + Activity.
17. Fix Search + Archive.
18. Fix Profile + Settings.
19. Fix Notifications.
20. Fix AI + Automation + Integrations + Command Center.
21. Connect realtime.
22. Remove remaining mocks.
23. Responsive QA.
24. Functional QA.
25. Regression QA.
26. Production build.

#### Final Command

READ `ui.md`. AUDIT THE EXISTING APPLICATION. THEN UPGRADE THE ENTIRE PERSONAL WORKSPACE.

Do not only fix the screenshots shown — inspect and upgrade ALL pages. Add missing professional features. Connect pages together. Use real data, real persistence, real realtime events, real interactions.

Fix the global layout. Fix the fixed header. Fix internal scrolling. Fix Tasks. Implement real drag-and-drop. Fix Projects. Add Project Details. Fix Progress. Add detailed progress drill-down. Fix Calendar. Implement previous/next navigation. Implement date selection. Implement event creation/editing. Fix Focus. Implement real reading sessions. Implement real podcast listening. Upgrade Notes, Journal, Ideas, Goals, Habits, Time Tracking, Analytics, Library, Reminders, Search, Notifications and all remaining modules.

Make the entire Personal Workspace feel like ONE product. Do not leave isolated demo pages, mock data, dead controls, or known bugs.

If a bug is discovered: FIX IT AND RETEST.
If a feature already works: PRESERVE IT.
If a feature is incomplete: COMPLETE IT.
If a feature is missing: IMPLEMENT IT.
If a feature is slow: PROFILE AND FIX THE ROOT CAUSE.

**FINAL RESULT:** A COMPLETE, REAL, PROFESSIONAL, HUMAN-DESIGNED, REALTIME, MOBILE + DESKTOP OPTIMIZED MANMADHAN PROGRESS PERSONAL WORKSPACE.

---

## PART 3 — Tasks Page Scroll Architecture Fix

### MANMADHAN PROGRESS — TASKS PAGE SCROLL ARCHITECTURE FIX

**IMPORTANT:** Fix the EXISTING Tasks page.

- DO NOT redesign the entire application.
- DO NOT remove existing functionality.
- DO NOT hide scrollbars as a workaround.
- DO NOT use arbitrary negative margins.
- DO NOT hardcode viewport heights that break other screen sizes.

The screenshot shows that the Tasks page still has incorrect scroll behavior.

#### Current Problems

1. Global application header is not actually fixed.
2. The Tasks page itself is creating a vertical browser scrollbar.
3. Kanban is extending beyond the available viewport.
4. Kanban has horizontal overflow.
5. The first Kanban column is partially clipped on the left.
6. The column containers are unnecessarily tall.
7. The page content is not correctly constrained to the available application viewport.
8. Header, toolbar and Kanban are participating in the same document scroll.

THIS MUST BE FIXED AT THE LAYOUT ARCHITECTURE LEVEL.

#### 1. Required Final Structure

```
BODY
└── APP ROOT
    └── APP SHELL
        ├── FIXED SIDEBAR
        │
        └── MAIN SHELL
            ├── FIXED GLOBAL HEADER
            │
            └── PAGE VIEWPORT
                └── TASK PAGE
                    ├── TASK HEADER
                    ├── TASK TOOLBAR
                    └── KANBAN VIEWPORT
                        └── KANBAN BOARD
                            ├── COLUMN
                            ├── COLUMN
                            ├── COLUMN
                            └── COLUMN
```

The browser/body must NOT scroll.

#### 2. Global Header

The existing application header must be OUTSIDE the page scroll container.

Correct:
```
AppShell
  ├── Sidebar
  └── Main
       ├── Header
       └── Content
```

NOT:
```
Main
  └── ScrollContainer
       ├── Header
       └── Content
```

The header must remain visible while Tasks scroll. Use the existing header component. DO NOT duplicate the header. DO NOT create a second header.

#### 3. App Shell Height

Use `height: 100dvh` for the application shell.

Important: Every flex child that contains a scroll area must use `min-height: 0;`

This is critical. A common cause of the current problem is `display:flex` combined with a child that has `min-height:auto`, which prevents the child from shrinking and creates page-level overflow. Fix this properly.

#### 4. Main Shell

```
Main shell:
height: 100dvh
display: flex
flex-direction: column
min-width: 0
min-height: 0
overflow: hidden

Global Header:
flex-shrink: 0

Page viewport:
flex: 1
min-height: 0
min-width: 0
overflow: hidden
```

This means the page cannot push the global shell beyond the viewport.

#### 5. Task Page

```
TaskPage
height: 100%
min-height: 0
display: flex
flex-direction: column
overflow: hidden

Structure:
TaskPage
├── PageHeader
├── TaskToolbar
└── KanbanViewport
      └── KanbanBoard

PageHeader:      flex-shrink: 0
Toolbar:         flex-shrink: 0
KanbanViewport:  flex: 1; min-height: 0; min-width: 0
```

#### 6. Task Header

Keep: WORKSPACE / Tasks / "Real tasks from the selected workspace."

Make the header compact. Do not waste vertical space.

Recommended: Page header 72–100px depending on viewport.

The header is part of the Tasks page content, NOT the global application header.

#### 7. Create Task

Current: "Create a task..." [ + Create ]

Keep the functionality but make it compact. It should not consume excessive vertical height. Use the existing task creation workflow. No mock creation.

#### 8. Kanban Viewport

The Kanban area must consume all remaining available height.

```
KanbanViewport: height: available remaining space; overflow: hidden
KanbanBoard: height: 100%; display: flex
```

#### 9. Kanban Horizontal Scroll

Horizontal scrolling is allowed ONLY for the Kanban board if the number of columns exceeds available width. It must NOT create page-level horizontal scrolling.

```
KanbanViewport:
overflow-x: auto
overflow-y: hidden
```

OR, preferably: `overflow: auto` with the Kanban board sized appropriately.

Important: The horizontal scrollbar must belong to the Kanban viewport, not the entire application page. The sidebar/header/page content must remain fixed.

#### 10. First Column Clipping Bug

Current screenshot shows the first column partially cut off. This means the Kanban board is offset or overflowing incorrectly.

Fix:
```
KanbanViewport: padding-inline: appropriate value
KanbanBoard: margin: 0
```

Do NOT use negative margin, translateX, or absolute positioning.

The first column must begin completely inside the viewport.

Expected: `| TO DO | ACCEPTED | IN PROGRESS | REVIEW | COMPLETED |` — no clipped column.

#### 11. Kanban Columns

Each column should have fixed/minimum width, e.g. `min-width: 280px; max-width: 360px` depending on available space.

On desktop: fit as many columns as possible. If all columns cannot fit: horizontal scroll ONLY inside Kanban.

#### 12. Column Height

Each column must use `height: 100%` or `max-height: 100%` within the Kanban viewport.

Do NOT set `height: 600px / 700px / 100vh` on individual columns. The column height must derive from the available Kanban viewport.

#### 13. Column Internal Scroll

THIS IS IMPORTANT. The Kanban column itself should be the vertical scrolling region when it contains many tasks.

```
Column
├── Column Header       FIXED
└── Task List           SCROLLABLE

Column:         display:flex; flex-direction:column; min-height:0; height:100%
Column Header:  flex-shrink:0
Task List:      flex:1; min-height:0; overflow-y:auto
```

Therefore: the application does NOT scroll, the Tasks page does NOT scroll, the Kanban board does NOT vertically scroll as a whole. Only the individual task column scrolls vertically.

#### 14. Final Task Layout

```
┌──────────────────────────────────────────────────────────┐
│ GLOBAL HEADER                         FIXED              │
├──────────────────────────────────────────────────────────┤
│ WORKSPACE                                                │
│ Tasks                                                    │
│ Real tasks from the selected workspace.                  │
│                                                          │
│ Create a task...                         + Create        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ TO DO       ACCEPTED      IN PROGRESS   REVIEW  COMPLETE │
│ ┌───────┐   ┌───────┐     ┌───────┐    ┌─────┐ ┌─────┐  │
│ │ Task  │   │ Task  │     │ Task  │    │     │ │     │  │
│ │ Task  │   │ Task  │     │ Task  │    │     │ │     │  │
│ │   ↕   │   │   ↕   │     │   ↕   │    │  ↕  │ │  ↕  │  │
│ └───────┘   └───────┘     └───────┘    └─────┘ └─────┘  │
└──────────────────────────────────────────────────────────┘
```

ONLY task lists scroll vertically. If the board is wider than the viewport: horizontal Kanban scroll only. The entire application does NOT scroll.

#### 15. Drag and Drop

Preserve/implement real drag and drop.

Dragging a task: Column A → Column B → optimistic UI → persist status → database → realtime event. If request fails: rollback.

Provide accessible alternative: "Move to..." for keyboard/mobile users.

#### 16. Task Card

Task cards must contain real data. Show where available: Title, Priority, Due date, Project, Goal, Estimate, Tracked time, Subtasks.

Click Task → Task Detail. Actions: Complete, Edit, Move, Delete, Start Focus — all must work.

#### 17. No Mock Data

Remove all fake tasks. Do not use "Draft Q3 Budget Allocation", "Finalize Q3 Architecture Docs", "Design System Audit" unless those actually exist in the selected workspace.

If database is empty: show "No tasks yet. Create your first task to get started."

#### 18. Selected Workspace

Tasks must use the currently selected workspace. Personal Workspace shows Personal Workspace tasks; ManMadhan Workspace shows ManMadhan Workspace tasks. Do not mix records. Workspace switch must update the task board.

#### 19. Realtime

Do not use `WORKSPACE_UPDATED` for every task interaction.

Use specific events: `TASK_CREATED`, `TASK_UPDATED`, `TASK_MOVED`, `TASK_COMPLETED`, `TASK_DELETED`.

Other clients should update without refreshing. Do not emit timer ticks. Do not create duplicate socket listeners.

#### 20. No Artificial Delay

The page must render immediately when data is available. Do NOT use `setTimeout()`, artificial loading delay, or fake skeleton delay. Socket connection must happen in background.

Correct: fetch tasks → render board → connect realtime → synchronize.

#### 21. Responsive Desktop

Test: 1024×768, 1280×720, 1280×768, 1440×900, 1600×900, 1920×1080.

At every size:
- [ ] Header fixed
- [ ] No browser vertical scrollbar
- [ ] No body horizontal scrollbar
- [ ] First column fully visible
- [ ] Kanban works
- [ ] Columns usable
- [ ] Task list internally scrolls
- [ ] Horizontal board scroll stays inside Kanban

#### 22. Mobile

At 360, 375, 390, 393, 412, 420, 430: do NOT force all Kanban columns into the screen. Use horizontal Kanban scrolling.

Mobile: Fixed header + Task toolbar + Kanban viewport + Fixed bottom navigation. No page-level scroll caused by Kanban. Task creation should use the existing mobile bottom sheet.

#### 23. Dark Theme

Preserve global dark theme. No white borders. Do not introduce `border-white`, bright gray borders, unnecessary outlines. Use existing theme tokens.

Gold only for: active state, primary action, selected state, progress.

#### 24. Light Theme

Maintain the existing light theme. Ensure text contrast. Ensure borders are subtle.

#### 25. Important CSS/Flex Check

Inspect ALL parent containers above Tasks. Look for:
```
min-height:auto
height:100vh
height:100%
overflow:auto / overflow-y:auto / overflow-x:auto
position:relative
flex children without min-height:0
```

Correct every relevant container.

The most important rule: every flex parent containing a scrollable child must have `min-height: 0;`. Every scrollable flex child must have `min-height: 0;`. Every width-constrained flex child must have `min-width: 0;`.

#### 26. Do Not Patch Only Tasks

If the root cause exists in AppShell, MainShell, PageShell, Layout, Header, Sidebar — FIX IT THERE. Do not add random CSS only to Tasks to compensate for a broken global shell.

The same architecture must work for: Dashboard, Focus, Tasks, Projects, Calendar, Progress, Books, Podcasts, Notes, Journal, Ideas, Goals, Habits, Analytics, Library, Reminders, etc.

#### 27. Regression

After fixing Tasks, test: Dashboard, Focus, Projects, Calendar, Progress, Books, Podcasts.

Ensure the global header remains fixed on all pages. Ensure no page accidentally creates body scrollbar, nested scrollbar, or horizontal page overflow.

#### 28. Final Acceptance

- [ ] Global header remains fixed.
- [ ] Sidebar remains fixed.
- [ ] Body does not scroll.
- [ ] Tasks page does not vertically scroll.
- [ ] Kanban does not vertically scroll as a whole.
- [ ] Task columns scroll internally.
- [ ] Kanban can horizontally scroll when necessary.
- [ ] Horizontal scrollbar stays inside Kanban.
- [ ] First column is completely visible.
- [ ] No clipped content.
- [ ] No giant empty column height.
- [ ] Create Task works.
- [ ] Drag/drop works.
- [ ] Task movement persists.
- [ ] Task updates are realtime.
- [ ] No mock task data.
- [ ] Mobile works.
- [ ] Desktop works.
- [ ] Dark theme works.
- [ ] Light theme works.

#### Final Command

Inspect the current DOM/layout hierarchy first. Find the ACTUAL container responsible for the browser scrollbar. Fix the parent layout architecture. Do NOT hide the scrollbar. Do NOT simply add overflow-hidden to Tasks.

Make the global application shell: 100dvh, fixed header, fixed sidebar, internal page viewport. Then make Tasks: fixed page header, fixed toolbar, flexible Kanban viewport. Then make each Kanban column: fixed column header, internally scrollable task list.

Implement real drag/drop and real data. Test all viewport sizes. If another parent causes overflow, trace upward and fix the root cause. Do not stop until the browser scrollbar and layout clipping issues are genuinely resolved.

---

## PART 4 — Routing + Task Creation Final Fix

### MANMADHAN PROGRESS — ROUTING + TASK CREATION FINAL FIX

READ ui.md AND INSPECT THE EXISTING CODEBASE FIRST.

This is an upgrade of the EXISTING application.

- DO NOT rebuild the application.
- DO NOT replace the router unnecessarily.
- DO NOT break existing routes.
- DO NOT remove existing functionality.
- DO NOT use mock data.
- DO NOT simulate task creation.

Fix the actual architecture.

#### 1. Routing — Current Problem

Navigation between Personal Workspace pages currently feels like the entire page is moving/reloading.

Examples: Dashboard → Tasks, Tasks → Projects, Projects → Calendar, Calendar → Focus.

The transition must feel like ONE APPLICATION, not separate websites. The global SIDEBAR, HEADER, WORKSPACE CONTEXT, BOTTOM NAVIGATION must remain mounted while the page content changes.

#### 2. Required Application Architecture

```
AppShell
├── Sidebar                    persistent
└── MainShell                  persistent
    ├── GlobalHeader           persistent
    └── PageViewport           changes
         └── CurrentPage
```

Navigation should replace/update ONLY the PageViewport content. DO NOT remount the entire application shell for every route.

#### 3. Routing Performance

Inspect the existing routing architecture. If using Next.js App Router: use shared layouts correctly. The application shell should live in the appropriate persistent layout. Do NOT put the entire shell inside individual page components.

Avoid unnecessary `window.location`, `window.location.href`, `location.reload`, full page redirects for internal navigation. Use the application's router/navigation APIs.

#### 4. Internal Navigation

Sidebar click (Tasks) should perform client-side navigation. Do NOT perform a full browser reload. Same for all pages: Dashboard, Focus, Tasks, Projects, Calendar, Notes, Journal, Ideas, Goals, Progress, Books, Podcasts, Library, Reminders, Habits, Time Tracking, Analytics, Activity, Search, Archive, Profile, Settings.

#### 5. Preserve Shell State

When moving Dashboard → Tasks → Projects → Calendar, preserve: sidebar state, workspace selection, theme, notifications state, user profile, global search state where appropriate. Do not recreate the entire application state on every route.

#### 6. Loading Transition

Navigation should feel fast. Use a subtle page transition/loading state ONLY inside the PageViewport if needed. Do NOT animate sidebar, header, bottom navigation during normal navigation. Avoid large page slide animations. Do not make the entire screen move.

Recommended: current page → subtle opacity/content transition → new page. Duration: ~120–180ms. No exaggerated animation.

#### 7. Scroll Position

Each page must have its own internal scroll container. When navigating Dashboard → Tasks, Tasks should start at the correct scroll position. When returning to a page where restoration is appropriate, preserve its internal scroll position. Do NOT allow the browser itself to control page scrolling.

#### 8. No Layout Shift

The following must NOT move during navigation: Sidebar, Header, Main shell boundaries. Avoid layout shift, content jumping, horizontal movement, header movement, sidebar movement. The PageViewport is the only changing region.

#### 9. Task Creation — Current Problem

The current Tasks page only shows "Create a task..." and "+ Create". This is NOT sufficient. Task creation needs a proper creation form.

#### 10. Create Task UI

Desktop: Open a centered modal/dialog.
Mobile: Open a bottom sheet/full-screen task creation surface.

Title: Create Task

Fields:
1. Task title
2. Description
3. Deadline / Due date
4. Due time (optional)
5. Priority
6. Project
7. Goal
8. Estimated time
9. Tags
10. Reminder (optional)

Required: Task title, Deadline/due date. Other fields can be optional.

#### 11. Deadline Field

The task creation form MUST have a real deadline field. Label: "Deadline" or "Due date".

Provide: Date picker, Optional time picker. Examples: Today, Tomorrow, This weekend, Custom date.

The actual stored value must be a real timestamp/date. DO NOT store a display string such as "Tomorrow" as the database deadline. Store a proper date/time value.

#### 12. Deadline Behavior

Tasks should support: No deadline, Deadline today, Future deadline, Overdue deadline.

Display correctly: Today, Tomorrow, Aug 12, Overdue — but internally store actual date/time.

#### 13. Priority

Priority: Low, Medium, High, Urgent. Persist it. Use the existing design system. Do not overuse colors.

#### 14. Project Relation

Allow selecting "No project" or an existing project. If project selected: `task.projectId` must be persisted. Project detail should show the linked task.

#### 15. Goal Relation

Allow "No goal" or an existing goal. Persist `goalId` if supported by the existing schema.

#### 16. Estimate

Allow estimated effort: 15 min, 30 min, 45 min, 1 hour, 2 hours, Custom. Persist actual duration/estimate. This must later connect to Focus, Time Tracking, Progress.

#### 17. Create Task Validation

Before submitting: Title cannot be empty. Deadline must be valid if supplied. Project must exist if selected. Goal must exist if selected. Show inline validation. Do not submit invalid data.

#### 18. Real Create Flow

```
User clicks + New Task
↓
Task Creation Modal
↓
User enters Title, Deadline, Priority, etc.
↓
Submit
↓
API request
↓
Database transaction
↓
Task created
↓
Return created task
↓
Optimistically/locally update board
↓
Realtime event
↓
Close modal
↓
Task appears in correct column
```

NO PAGE RELOAD.

#### 19. Task Status

New tasks should enter the appropriate initial status, e.g. TO DO, or existing default status defined by the application. Do NOT invent a new status if the database already has a status system.

#### 20. Task Deadline Display

Task cards should show the deadline when present, e.g. "[calendar icon] Today", "Tomorrow", "Aug 14". Overdue should be clearly identifiable. Do not make the entire task card red — use subtle priority/deadline indication.

#### 21. Task Detail

Clicking a task should open Task Detail showing: Title, Description, Status, Priority, Deadline, Project, Goal, Estimate, Tracked time, Subtasks, Notes, Activity.

Actions: Edit, Complete, Move, Start Focus, Delete, Archive.

#### 22. Edit Task

Edit must use the same proper form. Allow changing: Title, Description, Deadline, Priority, Project, Goal, Estimate, Tags. Changes persist immediately after save. No page reload.

#### 23. Task Deadline → Calendar

A task with a deadline should appear in Calendar (Task → Deadline → Calendar). Clicking the calendar task/deadline should open the Task Detail. Do not create a duplicate calendar event unless the existing business rules require one.

#### 24. Task Deadline → Dashboard

Upcoming section on Dashboard should include relevant task deadlines, e.g. "Today — Finish dashboard", "Tomorrow — Complete documentation". Click → Task Detail.

#### 25. Task Deadline → Notifications

If reminders are supported, deadline reminder must be connected to the real task. Do not create fake notifications.

#### 26. Task Deadline → Progress

Progress should be able to calculate: Completed before deadline, Completed after deadline, Overdue, Upcoming — only from actual task records.

#### 27. Kanban

After creating a task, it must immediately appear in TO DO or the correct initial status. Drag TO DO → IN PROGRESS → REVIEW → COMPLETED must persist at each step.

#### 28. Realtime Task Events

Use specific events: `TASK_CREATED`, `TASK_UPDATED`, `TASK_MOVED`, `TASK_COMPLETED`, `TASK_DELETED`. Do NOT emit `WORKSPACE_UPDATED` for every task action.

#### 29. No Duplicate Events

Audit socket listeners. Make sure navigating between pages does not create duplicate listeners.

Example problem: Navigate Tasks → Projects → Tasks. If listeners are registered again without cleanup, one task update could trigger multiple UI updates. Fix cleanup properly.

#### 30. Routing + Realtime

Navigation should NOT require reconnecting the entire socket.

Correct: App starts → Workspace socket connects → Navigation changes page → Socket remains connected. Do NOT reconnect unnecessarily on every route.

#### 31. Routing + Workspace

When switching Personal Workspace ↔ ManMadhan Workspace, update workspace context, data queries, permissions, socket room — but do NOT destroy/recreate the entire application shell.

#### 32. Mobile Task Creation

On mobile: + button or New Task opens a bottom sheet with Task title, Deadline, Priority, Project, Goal, Estimate, Description. Use proper mobile date picker.

The sheet must: fit viewport, respect safe areas, allow keyboard input, scroll internally if necessary. Do NOT let the entire page move.

#### 33. Desktop Task Creation

Desktop: centered dialog, max width ~520–600px. Do not create an enormous modal.

Use: header, form, footer. Footer: Cancel, Create Task (primary action).

#### 34. Date Picker

Use the existing date picker/library if present. Do not implement an unreliable custom calendar unless necessary. Must support Today, Tomorrow, Custom date. Correct timezone handling — do not accidentally shift dates because of UTC conversion.

#### 35. Error Handling

If task creation fails: keep form open, show error, do not lose entered data, provide Retry. If successful: close form.

#### 36. Loading State

During creation: "Create Task" → "Creating...". Disable duplicate submissions. Do not create duplicate tasks if the user clicks twice.

#### 37. Success

After successful creation: task appears immediately, modal closes, Kanban count updates, Dashboard metrics update where applicable, Calendar deadline updates, Activity updates, realtime event emitted. No reload.

#### 38. Routing Acceptance Test

Test: Dashboard → Tasks → Projects → Calendar → Focus → Books → Podcasts → Notes → Goals → Progress.

Verify:
- [ ] No full browser reload
- [ ] Header remains stationary
- [ ] Sidebar remains stationary
- [ ] Workspace remains selected
- [ ] Theme remains selected
- [ ] Socket remains connected
- [ ] Page content changes smoothly
- [ ] No layout jump
- [ ] No horizontal movement
- [ ] Correct page loads

#### 39. Task Acceptance Test

Create: Title "Finish dashboard", Deadline "Tomorrow", Priority "High", Project (select existing), Estimate "2 hours".

Expected: Task created, appears in To Do, deadline displayed, project linked, Dashboard updated, Calendar shows deadline, Progress can reference task, Focus can start from task.

#### 40. No Mock Data

Do not use sample "Draft Q3 Budget Allocation", "Weekly Planning" etc. unless those records actually exist. The selected workspace determines actual data.

#### 41. Performance

Navigation should feel immediate. Do not introduce artificial delays, setTimeout loading, full page reloads, unnecessary API refetches. Use client-side navigation, cached data where appropriate, targeted API requests, optimistic updates.

#### 42. Final Architecture

```
APP
├── Persistent Sidebar
└── Persistent Main Shell
    ├── Persistent Header
    └── Page Viewport
         ├── Dashboard
         ├── Tasks
         ├── Projects
         ├── Calendar
         ├── Focus
         └── Other pages

Navigation changes ONLY: Page Viewport.

Task creation: UI → API → Database → Realtime → UI
Deadline: Task → Calendar → Dashboard → Reminder → Progress
```

#### Final Command

Inspect the current routing implementation and DOM/layout hierarchy. Find why navigation causes visible page movement/reload behavior. Fix the persistent application shell first. Then implement the complete real Task Creation flow.

The Create Task flow MUST include a real Deadline/Due Date. Do not just add a visual date field — persist the deadline. Connect it to Task, Calendar, Dashboard, Progress, Reminders where supported.

Then test: routing, task creation, task editing, deadline, Kanban, realtime, workspace switching, desktop, mobile. Fix every discovered bug. Do not stop at the UI.

**FINAL RESULT:** Smooth application-level navigation, persistent header/sidebar, real task creation, real deadline support, real Kanban, real persistence, real realtime updates, and no unnecessary page reloads.

---

## PART 5 — Books Module: Real Personal Library Upgrade

### MANMADHAN PROGRESS — BOOKS MODULE — REAL PERSONAL LIBRARY UPGRADE

READ ui.md FIRST. This is an EXISTING application.

- Do not rebuild the application.
- Do not create a generic AI book dashboard.
- Do not create a fake book discovery page.
- Do not populate the page with demo books.
- Do not use fictional book information.

The Books module must become a REAL PERSONAL BOOK LIBRARY.

#### 1. Product Definition

Books is NOT: an AI book recommendation page, a generic book marketplace, a public book catalog, a fake reading dashboard, a collection of random sample books.

Books IS: THE USER'S PERSONAL BOOK LIBRARY. Think "My Bookshelf" — where the user can manage the books they personally own, are reading, want to read, paused, or completed.

#### 2. Primary Book States

Support: OWNED, WANT TO READ, READING, PAUSED, COMPLETED, ABANDONED.

The user should be able to move a book between states, e.g. Want to Read → Owned → Reading → Completed, or Owned → Reading → Paused → Reading → Completed.

#### 3. Book Entity

A Book must be a REAL persistent database entity.

Recommended fields: id, title, subtitle, author, authors, isbn10, isbn13, publisher, publicationDate, edition, language, pageCount, description, genres, coverUrl, externalUrl, purchaseUrl, source, format, ownershipStatus, readingStatus, currentPage, progressPercent, rating, review, notes, startedAt, completedAt, targetDate, createdAt, updatedAt.

Do NOT add fields blindly if an equivalent existing schema already exists. Use the existing database architecture.

#### 4. Personal Ownership

This is extremely important. The Book record must belong to the current user/workspace (userId, workspaceId where supported).

Books from Personal Workspace must NOT appear in ManMadhan Workspace unless explicitly created/shared there according to existing workspace rules.

The page title should communicate "My Books" or "Books" — not "AI Book Library".

#### 5. Book List

The Books page should have "MY BOOKS" with useful filters.

Primary filters: All, Owned, Want to Read, Reading, Paused, Completed, Abandoned.
Secondary filters: Author, Genre, Format, Rating.
Sort: Recently Added, Recently Updated, Title, Author, Progress, Date Started, Date Completed.

Do not overwhelm the interface.

#### 6. Book Card

Show: Cover, Title, Author, Status, Progress, Current page / total pages, Rating where available.

Example:
```
┌──────────────────────────────┐
│ [ REAL BOOK COVER ]          │
│ Atomic Habits                │
│ James Clear                  │
│ Reading                      │
│ ███████████░░ 72%            │
│ 198 / 274 pages              │
└──────────────────────────────┘
```

Do NOT add random metrics. Do NOT show "AI Score", "Productivity Score", "AI Recommendation", "Fake Rating" unless the user explicitly has such data.

#### 7. Add Book

Create a real "+ Add Book" action.

Desktop: centered dialog. Mobile: bottom sheet.

Form should support: Book title, Author, ISBN, Status, Format, Current page, Target date, Rating, Notes.

The user should NOT be forced to manually enter every metadata field.

#### 8. Real Book Lookup

Add an optional "Find Book" workflow. The user can search using ISBN, ISBN-13, or Title + Author.

Use a legitimate book metadata provider/API where available. The purpose is to retrieve REAL metadata: Title, Author, Cover, Publisher, Publication date, ISBN, Page count, Description, Language, Genres.

After finding the book: USER CONFIRMS → Book becomes THEIR personal book record. Do not automatically add search results to the library.

#### 9. External Book Link

Each book should have ONE canonical external book link. Field: `externalUrl` or `purchaseUrl` depending on the existing schema.

The UI should show "View Book" or "Book Link". Do not add Amazon/Flipkart/Goodreads/Google Books/Publisher/10 different stores as separate noisy buttons. ONE PRIMARY EXTERNAL LINK.

#### 10. Amazon Link

If the user provides or selects an Amazon book link: store that exact canonical link. Do not fabricate Amazon URLs. Do not create fake affiliate links. Do not guess an ASIN.

If Amazon is unavailable: allow another canonical book/publisher link, e.g. "[ View Book ↗ ]" opening the real external page in a new tab.

The external link is supplementary. The Personal Books page remains the source of truth for: ownership, reading status, progress, notes, rating, review, sessions.

#### 11. Book Detail Page

Clicking a book must open a REAL Book Detail page.

Structure:
```
BOOK DETAIL
┌────────────────────────────────────────────┐
│ Cover                                      │
│ Title / Author / Status                    │
│ [ Start Reading ]   [ View Book ↗ ]        │
└────────────────────────────────────────────┘

ABOUT THE BOOK — Description
BOOK DETAILS — Author, Publisher, Published, Edition, ISBN, Pages, Language, Format, Genre
MY PROGRESS — Current page, Total pages, Progress %, Started, Target date, Completed
MY NOTES — Personal notes
MY REVIEW — Rating, Review
READING ACTIVITY — Reading sessions
ACTIVITY — Book history
```

#### 12. Separate Real Book Data From Personal Data

This is CRITICAL. Do not mix public metadata and personal information.

PUBLIC BOOK DATA: Title, Author, ISBN, Publisher, Cover, Description, Pages, Publication date, Genre.
PERSONAL USER DATA: Owned, Reading, Current page, Progress, Started, Completed, Rating, Review, Notes, Target date, Reading sessions.

Architecture:
```
Book
├── Metadata
└── User/Workspace Book Record
     ├── Ownership
     ├── Reading Status
     ├── Progress
     ├── Notes
     └── Sessions
```

This allows the same real book metadata to exist without turning the application into a public catalog.

#### 13. Reading Session

Implement REAL reading sessions.

Start Reading → Reading session begins. Track: startedAt, endedAt, duration. Optional: startingPage, endingPage.

Example: "Reading Session — 19:20 → 20:05 — 45 minutes — Pages 120 → 142." This must be persistent.

#### 14. Reading Progress

Progress should be calculated from `currentPage / pageCount` (e.g. 150/300 = 50%). Do not manually store an arbitrary "50%" when it can be derived.

If pageCount is unavailable: show "Progress unavailable" and allow time-based tracking if the existing design supports it.

#### 15. Update Reading Progress

Allow "Update Page" (e.g. Current page: 198 → Save). Then progress recalculates. Dashboard, Progress, Analytics should update from the real value.

#### 16. Reading Goal

Allow optional target completion date (e.g. "Finish by: September 15"). Show "Days remaining" ONLY when actual dates exist. Do not fabricate deadlines.

#### 17. Book Notes

Users should be able to add personal notes to a book: Chapter notes, Important ideas, Quotes, Takeaways, Action items. Notes belong to Book + User/Workspace — they should not become public book metadata.

#### 18. Book Review

After reading or at any point: Rating (1–5), Review (personal review). This is user-generated data. Do not automatically generate reviews.

#### 19. Book Format

Allow: Physical, eBook, Audiobook.

- Physical: optional Owned / location/shelf.
- eBook: optional external link.
- Audiobook: reading/listening tracking can use the existing audio model where appropriate.

#### 20. My Shelf

Add a useful personal shelf view. Sections: Currently Reading, Want to Read, Recently Completed, Paused. The page should feel like a personal bookshelf. Do NOT show hundreds of generic books.

#### 21. Empty State

If the user has no books:
```
MY BOOKS
Your personal bookshelf is empty.
Add a book you own or want to read.
[ + Add Book ]  [ Find Book ]
```
Do not display fake books.

#### 22. Real Data Only

Remove mockBooks, sampleBooks, demoBooks, hardcoded covers, fake authors, fake progress, fake ratings, fake reading sessions.

Search the codebase for: mock, dummy, sample, demo, placeholder. Remove production usage.

#### 23. Book Search vs My Books

These must be separate concepts.

MY BOOKS: User's personal library.
FIND BOOK: Search external metadata.

Flow: Find Book → Search real metadata → Select result → Review metadata → Add to My Books → Personal record created.

Do NOT mix search results directly into My Books.

#### 24. Book → Task

Allow "Create Task from Book" (e.g. Book: "Designing Data-Intensive Applications" → [Create Task] → Task: "Read Chapter 5"). The task should contain `bookId` where supported.

#### 25. Book → Goal

Allow linking a book to a Goal (e.g. Goal: "Read 12 books this year", Book: "Book #4"). Progress should contribute to the goal according to the existing goal calculation rules.

#### 26. Book → Notes

Book notes should be accessible from Book Detail and Notes. The note should show "Linked Book" → click → Book Detail.

#### 27. Book → Progress

Progress should include real learning metrics: Books completed, Pages read, Reading time, Current books, Completion trend — only from real records.

#### 28. Book → Dashboard

Dashboard can show "CURRENTLY READING": Book title, Author, Progress, Current page. Action: "Continue Reading". Do not show this section if there is no active book.

#### 29. Book → Focus

If the user wants a focused reading session, "Start Focus" should create a real focus/reading session relationship (e.g. Focus: Reading, Book: Clean Architecture). This should appear in Focus, Time Tracking, Progress, Book Detail according to existing architecture.

#### 30. Book Realtime

Use specific events: `BOOK_CREATED`, `BOOK_UPDATED`, `BOOK_DELETED`, `READING_STARTED`, `READING_PAUSED`, `READING_RESUMED`, `READING_COMPLETED`, `READING_PROGRESS_UPDATED`. Do NOT use `WORKSPACE_UPDATED` for every page interaction.

#### 31. Book Page Performance

Do not load every book's full metadata on the initial page.

- List view: load necessary fields.
- Detail page: load complete metadata.
- Sessions: load when needed.

Avoid `fetchAllBookData()`.

#### 32. Book Page UI

Remove generic dashboard-style cards. Use a real library layout:
```
┌───────────────────────────────────────────────┐
│ Books                           + Add Book     │
│ Your personal library                         │
├───────────────────────────────────────────────┤
│ All  Reading  Want to Read  Completed         │
├───────────────────────────────────────────────┤
│ [Cover]  [Cover]  [Cover]  [Cover]            │
│ Title    Title    Title    Title              │
│ Author   Author   Author   Author             │
│ Progress Progress ...                         │
└───────────────────────────────────────────────┘
```
Keep it clean.

#### 33. Book Detail UI

Book Detail should feel closer to a personal library record than an analytics dashboard. Use: large real cover, strong typography, metadata, personal progress, notes, reading activity. Avoid excessive cards.

#### 34. Mobile Books

Mobile: Book list — 2-column grid OR compact list. Book detail — cover, title, author, status, progress, actions, metadata, notes. External link: "[ View Book ↗ ]". Add Book: bottom sheet. Find Book: search interface. No horizontal page overflow.

#### 35. Real Book Cover

If external metadata returns a cover, use it. If unavailable, show a tasteful generated text cover based on title/author. Do NOT use random stock images.

#### 36. Data Integrity

A book must never be duplicated simply because the user searched for it again. Use identifiers where available: ISBN-13, ISBN-10.

Before creating: check existing personal library. If already exists: show "This book is already in your library. [ Open Book ]".

#### 37. Duplicate Handling

Same book / same ISBN should not create duplicate personal records unless the user explicitly owns multiple editions/copies and the system supports that. If editions differ, allow separate edition records when appropriate.

#### 38. Global Personal Workspace Consistency

After fixing Books, audit the other modules using the SAME RULE: each page must represent a REAL personal object/work surface — Tasks (real tasks), Projects (real projects), Calendar (real events), Books (real personal books), Podcasts (real subscriptions/episodes/listening), Notes (real notes), Goals (real goals), Ideas (real ideas), Habits (real habits). Do not let any page become a generic mock dashboard.

#### 39. "Still Many Are Not Correct" — Full Audit

Do not assume Books is the only broken module. Audit every page in ui.md.

For every page check:
1. Is the data real?
2. Is the route correct?
3. Is the page connected to the database?
4. Does create work?
5. Does edit work?
6. Does delete/archive work?
7. Does detail work?
8. Are relationships correct?
9. Is realtime correct?
10. Is mobile correct?
11. Is the header fixed?
12. Is internal scrolling correct?
13. Are empty states correct?
14. Are loading states correct?
15. Are error states correct?
16. Are buttons actually functional?
17. Is there mock/demo data?
18. Is there unnecessary UI?
19. Does it connect to other modules?
20. Does it preserve existing functionality?

Fix every discovered issue.

#### 40. Final QA

Test:
- Desktop: 1024, 1280, 1440, 1600, 1920
- Mobile: 360, 375, 390, 393, 412, 420, 430
- Light / Dark
- Personal Workspace / ManMadhan Workspace

Verify: No page-level accidental scrolling, Fixed header, Fixed sidebar, Fixed mobile navigation, Internal content scrolling, No horizontal overflow, No fake data, No dead buttons, No broken routes, No duplicate realtime listeners, No unnecessary WORKSPACE_UPDATED events.

#### Final Command

Do NOT just redesign the Books page. Turn Books into a REAL PERSONAL BOOK LIBRARY.

A book must represent an actual book. The user owns or tracks that book. Real metadata can be retrieved from a legitimate book metadata source. The user can optionally store ONE canonical external book link, including an Amazon link supplied/selected by the user.

The application remains the user's personal source of truth for: ownership, status, reading progress, pages, sessions, notes, rating, review, goals, tasks.

Then audit ALL remaining Personal Workspace pages and correct anything that still behaves like a mock, generic, or incomplete implementation. Do not stop when the Books page looks better. Continue until the entire Personal Workspace follows the same real-data, real-workflow standard.

---

## PART 6 — Projects + Documents: Real Workspace Upgrade

### MANMADHAN PROGRESS — PROJECTS + DOCUMENTS — REAL WORKSPACE UPGRADE

READ `ui.md` FIRST. This is an upgrade of the EXISTING application.

- DO NOT rebuild the application.
- DO NOT replace working architecture unnecessarily.
- DO NOT remove existing functionality.
- DO NOT create mock projects.
- DO NOT create fake progress.
- DO NOT hardcode project percentages.
- DO NOT create decorative project cards.

Projects must become REAL WORKSPACES for actual execution.

#### 1. Project Definition

A Project is a real body of work. It must contain: Identity, Plan, Deadline, Tasks, Milestones, Progress, Documents, Notes, Time, Activity, Goals, Calendar, Focus.

The project page should answer: What am I building? Why am I building it? What is the plan? When is it due? What needs to be done? What has been completed? What documents belong to it? How much time has been spent? What is currently blocking it?

#### 2. Project Entity

Use the existing database schema if equivalent fields already exist.

A Project should support: id, workspaceId, name, description, status, priority, startDate, deadline, plan, objectives, progress, ownerId, createdAt, updatedAt, completedAt.

Do NOT blindly add duplicate fields. Use existing naming conventions.

#### 3. Project Status

Support meaningful statuses: PLANNING, ACTIVE, ON HOLD, COMPLETED, ARCHIVED. If the existing system already has equivalent statuses, preserve them. Status must be real persisted data.

#### 4. Project Priority

Support: LOW, MEDIUM, HIGH, URGENT. Persist it. Use subtle visual treatment. Do not make the entire project card brightly colored.

#### 5. Project Plan

Every project should have a real planning area: Objective, Expected Outcome, Scope, Milestones, Key Tasks, Deadline, Dependencies, Notes.

Example:
```
PROJECT: ManMadhan Progress
OBJECTIVE: Build and launch the Personal Workspace.
OUTCOME: Complete functional Personal Workspace V1.
DEADLINE: September 15, 2026
MILESTONES: 1. Core shell 2. Task system 3. Project system 4. Calendar 5. Learning 6. QA
```
This is actual project information. Do NOT use generic placeholder text.

#### 6. Project Creation

Create Project. Desktop: centered dialog. Mobile: bottom sheet.

Fields: Project Name *, Description, Objective, Start Date, Deadline, Priority, Status, Goal, Plan. Optional: Tags, Color/icon if already supported.

Required: Project Name. If deadline is provided: store a real date/time.

#### 7. Project Deadline

Deadline must be a real date. Do NOT store "Next week" as the database value. Store an ISO/date/time value and format it for display: Today, Tomorrow, Aug 15, Sep 15 — depending on the actual date.

#### 8. Project Deadline States

Automatically calculate: Upcoming, Due Today, Due Soon, Overdue, Completed. Do not manually set these labels.

Example: Deadline August 15, Today August 9 → Upcoming. If August 15 passes → Overdue. If project completed → Completed.

#### 9. Project Plan + Deadline

The project plan should be deadline-aware. Milestones can have their own deadlines building toward the project deadline. The system should clearly show whether milestones are on track.

#### 10. Milestones

Add real Project Milestones.

Fields: Name, Description, Deadline, Status, Order, CompletedAt. Statuses: Pending, Active, Completed.

Milestones belong to the project. Project Detail shows a PLAN section with checkboxes for each milestone.

#### 11. Project Progress

Do NOT manually hardcode percentages. Project progress should derive from actual work.

Default calculation: Completed Tasks ÷ Total Tasks. If milestones are used, optionally calculate milestone progress according to existing business rules.

Show: Tasks (e.g. 8/12 completed), Milestones (e.g. 3/5 completed), Overall progress (calculated). Do not invent numbers.

#### 12. Project Health

Add a useful Project Health indicator, calculated from: deadline, progress, overdue tasks, milestone status, recent activity.

Possible states: ON TRACK, AT RISK, OVERDUE, COMPLETED. This must be derived from actual data — never random.

#### 13. Project Tasks

A project must have a real task relationship (Project → Tasks). Tasks show: Title, Status, Priority, Deadline, Assignee where supported, Tracked Time. Actions: Create Task, Open Task, Complete, Move, Edit.

Creating a task from Project Detail should automatically link `projectId`.

#### 14. Project Task Plan

Project Detail should include a TASK PLAN with columns Backlog, To Do, In Progress, Review, Completed. Use the existing task/Kanban architecture. Do NOT create a separate fake project task system — use the real Task entities.

#### 15. Project Deadline → Tasks

Project deadline should be visible while viewing tasks. If a task deadline exceeds the project deadline, show a warning. Do not automatically modify the task without user confirmation.

#### 16. Project → Calendar

Project deadline should appear in Calendar. Project milestones can also appear in Calendar. Click Project deadline → Project Detail. Click Milestone → Project Detail / Milestone Detail. Do not create duplicate events unnecessarily.

#### 17. Project → Dashboard

Dashboard Project Pulse should use real project data (Project, Status, Deadline, Progress). Click → Project Detail. If no active projects, show a proper empty state.

#### 18. Project → Focus

From Project Detail, "[ Start Focus ]" must create a focus session linked to the project. If a specific task is selected, Focus should link to Task + Project. Time must later appear in Project Time, Task Time, Focus, Progress, Analytics.

#### 19. Project Time Tracking

Project Detail TIME section: Today, This Week, Total — show actual tracked time only if those values come from actual sessions.

#### 20. Project Documents

ADD A FIRST-CLASS DOCUMENTS section to every Project. Documents are NOT the same as Notes — they are actual project files/resources: PRD, TRD, Architecture, Design Specification, Research PDF, Meeting Document, Spreadsheet, Presentation, Reference Material, Project Report.

#### 21. Document Entity

Use the existing Library/File architecture if available.

A document should support: id, projectId, workspaceId, name, fileName, fileType, mimeType, size, storageUrl, previewUrl, description, uploadedBy, createdAt, updatedAt.

Do NOT duplicate the file storage system. Connect Project Documents to the existing Library/Files system.

#### 22. Project Documents UI

Project Detail: DOCUMENTS [ + Add Document ]. Show: Document name, Type, Size, Updated, Owner.

#### 23. Document Actions

Support where existing storage allows: Open, Preview, Download, Rename, Move, Delete, Archive. All actions must work. Do not create fake preview buttons — if preview is unavailable, show "Open Document" or "Download".

#### 24. Add Document

Desktop: file picker/modal. Mobile: bottom sheet/action sheet.

Allow: Upload file, Select existing Library file. If selecting an existing Library file, link it to the project — do NOT duplicate the physical file.

#### 25. Project Document Relationship

Documents should belong to Project and Workspace where supported. Do not make them globally visible across workspaces unless existing permissions explicitly allow it.

#### 26. Document → Library

A project document should also be discoverable from Library (Library → Projects → ManMadhan Progress → Documents). Click → Project Detail. This should be a relationship, not a duplicated file.

#### 27. Document → Search

Global Search should find Project documents by Name, File name, Type, Project. Click → document/project.

#### 28. Document → Activity

Activity should record: Document uploaded, Document linked, Document renamed, Document deleted using specific events (`DOCUMENT_UPLOADED`, `DOCUMENT_LINKED`, `DOCUMENT_UPDATED`, `DOCUMENT_DELETED`). Do not use `WORKSPACE_UPDATED` for everything.

#### 29. Project Notes

Documents and Notes are different. Notes: quick thoughts, decisions, meeting notes, ideas. Documents: actual files. Both can exist under a project (NOTES and DOCUMENTS sections in Project Detail).

#### 30. Project Activity

Project activity should show real events: Project created/updated, Task created/completed, Milestone completed, Document uploaded/updated, Focus session completed, Deadline changed, Project completed. Newest first.

#### 31. Project Timeline

Add TIMELINE — chronological events (e.g. "Aug 9 — Project created", "Aug 10 — Core Shell completed"). This must come from real activity records.

#### 32. Project Detail Page

Final Project Detail structure:
```
PROJECT HEADER — Name, Status, Priority, Deadline, Health
Actions: Edit, Start Focus, Add Task, Add Document, More
OVERVIEW — Description, Objective, Outcome
PLAN — Plan, Milestones, Dependencies
PROGRESS — Task progress, Milestone progress, Timeline progress
TASKS — Project task board/list
DOCUMENTS — Project files
NOTES — Project notes
TIME — Tracked time
CALENDAR — Deadlines, Milestones
ACTIVITY — Project activity
```
This should be one coherent workspace.

#### 33. Project List Page

Project list should support: All, Active, Planning, On Hold, Completed, Archived. Sort: Recently Updated, Deadline, Created, Priority, Progress. Search. Filter. No excessive dashboard cards.

#### 34. Project Card

Show: Project name, Status, Priority, Deadline, Progress, Task count, Recent activity. Do not show irrelevant metrics.

#### 35. Project Empty State

If no projects: "No projects yet. Create a project to organize your work, tasks, deadlines, and documents. [ + Create Project ]". Do not show fake projects.

#### 36. Project Realtime

Specific events: `PROJECT_CREATED`, `PROJECT_UPDATED`, `PROJECT_COMPLETED`, `PROJECT_ARCHIVED`, `MILESTONE_CREATED`, `MILESTONE_UPDATED`, `MILESTONE_COMPLETED`, `PROJECT_DOCUMENT_ADDED`, `PROJECT_DOCUMENT_UPDATED`, `PROJECT_DOCUMENT_REMOVED`. Do NOT use `WORKSPACE_UPDATED` for every project change.

#### 37. Realtime Project Updates

If a task changes, Project progress should update. If a milestone completes, Project progress/health should update. If deadline changes, Calendar should update. If document is added, Project Documents should update. If focus session completes, Project time should update. No full page reload.

#### 38. Project Deadline Warnings

If project is approaching deadline, show subtle "Due soon". If passed, "Overdue". If completed, "Completed". Do not create annoying notifications unless notification rules support them.

#### 39. Project Dependencies

Where appropriate, support Task dependency and Milestone dependency (e.g. Task B depends on Task A). If Task A is incomplete, show "Blocked". Do not automatically prevent work unless existing business rules require it.

#### 40. Project Plan Editor

Allow the project plan to be edited using a clean structured editor. Sections: Objective, Scope, Expected Outcome, Milestones, Dependencies, Notes. Do not require a complex rich-text editor unless already available. Keep it usable.

#### 41. Project + Goals

Project can be linked to a Goal. Goal Detail shows Related Projects; Project Detail shows Related Goal. Clicking either opens the related record.

#### 42. Project + Library

Project documents should be visible from Project, Library, Search without duplicating files.

#### 43. Project + Notes

Project notes should appear in Project Detail and Notes with a linked-project indicator.

#### 44. Project + Calendar

Calendar should show Project Deadline, Milestone Deadline, Task Deadline with distinct but subtle indicators. Click → related object.

#### 45. Project + Progress

Progress page should aggregate real project data: Project progress, Project time, Completed tasks, Milestones, Deadline health. Click project metric → Project Detail.

#### 46. Project + Analytics

Analytics can show: Time by project, Completed tasks by project, Project completion trend — all real data.

#### 47. Project Mobile

Mobile Project Detail: Header, Project status, Deadline, Progress, Tabs/sections (Overview, Plan, Tasks, Documents, Notes, Time, Activity). Avoid excessive nested cards. Documents: tap → preview/open. Add document: bottom sheet.

#### 48. Project Desktop

Desktop should use the available viewport efficiently — do not leave 70% of the screen blank.

Suggested: Project header + main content area. Left: Overview, Plan, Tasks. Right: Deadline, Progress, Milestones, Documents, Activity. Only use this if it fits the existing design system.

#### 49. No Fake Data

Remove all mock: projects, tasks, milestones, documents, deadlines, progress, activity, time. Search codebase for: mock, dummy, demo, sample, placeholder. Production behavior must use real data.

#### 50. Global Audit

After implementing Projects, audit every remaining page: Dashboard, Focus, Tasks, Projects, Calendar, Notes, Journal, Ideas, Goals, Progress, Books, Podcasts, Library, Reminders, Habits, Time Tracking, Analytics, Activity, Search, Archive, Profile, Settings, AI, Automation, Integrations, Command Center.

For each: Is it real? Is data persistent? Does create/edit/delete work? Does navigation work? Does realtime work? Does it connect to related modules? Does it work on mobile? Does it respect fixed header? Does it use internal scrolling?

Fix anything incorrect.

#### 51. Layout

Global: 100dvh. Fixed: Sidebar, Header. Internal scrolling: Page content, Kanban columns, Document lists where necessary. No browser-level accidental scrolling.

#### 52. Final Project Workflow

```
Create Project → Define Objective → Create Plan → Set Start Date → Set Deadline
→ Create Milestones → Create Tasks → Attach Documents → Work / Focus → Track Time
→ Update Progress → Complete Milestones → Complete Tasks → Complete Project → Project History
```
Everything must persist.

#### Final Command

Upgrade the Projects module into a REAL project workspace. Every project must support: PLAN, DEADLINE, MILESTONES, TASKS, PROGRESS, TIME, DOCUMENTS, NOTES, CALENDAR, GOALS, ACTIVITY.

Add real Project Documents using the existing Library/File architecture. Do NOT create a duplicate file system — make documents linkable to projects.

Make project deadlines real and date-driven. Make progress derived from actual work. Make project health derived from deadline + execution. Make project updates propagate to Dashboard, Calendar, Progress, Analytics, Activity.

Then audit every other Personal Workspace page and fix anything that still behaves like a mock or incomplete implementation. No fake data. No dead buttons. No decorative metrics. No broken routing. No accidental page scroll. No unnecessary realtime events.

If a bug is found: REPRODUCE → ROOT CAUSE → FIX → TEST → REGRESSION. Do not stop until the Project Workspace and its connected features are genuinely functional.

---

## PART 7 — Real Project Creation Model: Database + API + UI + Workflow

### MANMADHAN PROGRESS — REAL PROJECT CREATION MODEL — DATABASE + API + UI + WORKFLOW

READ ui.md AND INSPECT THE EXISTING CODEBASE BEFORE CHANGING ANYTHING.

**IMPORTANT:** This is NOT a visual-only task. The current Project creation is incomplete.

Build the complete REAL Project Creation Model from: UI → validation → API → database → relationships → realtime → Project Detail → Tasks → Milestones → Documents → Calendar → Goals → Progress → Activity.

- DO NOT use mock data.
- DO NOT create fake success messages.
- DO NOT create a frontend-only project.
- DO NOT hardcode projects.
- DO NOT rebuild the existing architecture unnecessarily.

Reuse existing database, API, authentication, workspace and realtime architecture wherever possible.

#### 1. Real Project Creation

When the user clicks "+ New Project", open the real Project Creation interface.

Desktop: Centered modal/dialog. Mobile: Bottom sheet/full-screen creation page.

Title: Create Project. Subtitle: "Plan and organize a real piece of work."

#### 2. Project Creation Form

The form must contain:

**BASIC INFORMATION** — Project Name *, Description, Objective
**PLANNING** — Start Date, Deadline, Priority, Status
**ORGANIZATION** — Goal, Tags
**EXECUTION** — Initial Plan, Milestones
**OPTIONAL** — Project icon/color if already supported.

Do not add unnecessary fields.

#### 3. Project Name

Required. Validation: empty → error, minimum sensible length, maximum database-supported length, trim whitespace. Do not allow "   " as a valid project.

#### 4. Description

Optional. Store real project description. Do not use placeholder text as stored data.

#### 5. Objective

Optional but strongly recommended (e.g. "Build the first production version of ManMadhan Progress."). Store as actual project objective. This is different from Description — Description is what the project is; Objective is what it's intended to achieve.

#### 6. Start Date

Optional. Use a real date. Store `startDate`. Do NOT store "Today" / "Next Monday" etc. — display friendly labels only in the UI.

#### 7. Deadline

Support a REAL deadline. Field: Deadline *. Use a real date/time value (e.g. 2026-09-15). Do not store display text. Support: No deadline, Specific date, Specific date + optional time. If no deadline: `deadline = null`.

#### 8. Deadline Validation

If startDate exists, deadline should normally be >= startDate. If deadline is before start date, show "Deadline cannot be before the project start date." Do not submit invalid project data.

#### 9. Priority

Use: Low, Medium, High, Urgent. Persist the value. Use the application's existing enum/model if available.

#### 10. Status

New projects should normally start as PLANNING unless existing business logic defines another valid initial status. Supported: PLANNING, ACTIVE, ON_HOLD, COMPLETED, ARCHIVED. Use existing enums if present.

#### 11. Goal Relationship

Allow "No Goal" or "Select Goal". If selected, `goalId` must be stored. Do not store the goal name as plain text if a real Goal entity exists. Relationship: Goal ↕ Project.

#### 12. Tags

Allow optional project tags. Reuse existing tag architecture. Do not create a separate incompatible tagging system.

#### 13. Initial Project Plan

Allow the user to define the initial project plan while creating the project (Objective, Scope, Expected Outcome). Store this as structured project planning data using the existing schema where possible. Do not force the user to fill every section.

#### 14. Milestone Creation During Project Creation

The user should be able to create initial milestones (e.g. Milestone 1: Core Workspace, Deadline Aug 20; Milestone 2: Task System, Deadline Aug 27; etc.). Each milestone must become a REAL database record. Relationship: Project → Milestones.

#### 15. Milestone Model

Use existing schema if present. Otherwise support: id, projectId, name, description, deadline, status, order, completedAt, createdAt, updatedAt. Do not store milestones as an unstructured frontend-only array unless the existing architecture explicitly requires it.

#### 16. Database Project Model

Inspect the existing Project model first. If a Project model already exists, EXTEND IT. Do not create `ProjectV2`, `ProjectNew`, `ProjectRecord` unless absolutely necessary.

The real model should support at minimum: id, workspaceId, ownerId where applicable, name, description, objective, status, priority, startDate, deadline, goalId where applicable, createdAt, updatedAt, completedAt, plan data according to existing architecture. Use proper foreign keys.

#### 17. Project Relationships

A project should be able to relate to: Workspace, User/Owner, Goal, Tasks, Milestones, Documents, Notes, Calendar/deadline references, Focus Sessions, Time Entries, Activity.

Do NOT duplicate related entities (e.g. use `Task.projectId`, NOT `Project.tasksJson`, if a real Task model already exists).

#### 18. API

Implement/verify a real endpoint using the existing API architecture. Conceptually `POST /projects` with request body `{ name, description, objective, startDate, deadline, priority, status, goalId, plan, milestones }`. Do not blindly use this exact route if the project already has a different API convention — follow the existing API structure.

#### 19. Server Validation

Do not rely only on frontend validation. Validate on the server: authenticated user, workspace access, project name, dates, priority, status, goal relationship, milestone dates. Reject invalid requests.

#### 20. Workspace Security

Project creation must happen inside the CURRENT workspace. Never accept an arbitrary `workspaceId` from the client without checking authorization. The server must determine/validate the workspace from the authenticated context.

#### 21. Permissions

Respect existing workspace roles and permissions. Before creating, verify the current user can create projects in the selected workspace. If unauthorized, return a proper authorization error. Do not simply hide the button and assume security.

#### 22. Transaction

Project creation involving milestones and relationships should use a database transaction where supported: BEGIN → create project → create milestones → create relationships → create activity → COMMIT. If anything fails: ROLLBACK. Do not leave "Project created but milestones missing" without intentionally supporting partial creation.

#### 23. Success Response

Return the actual created project including project id, name, status, deadline, progress, milestones, relationships as appropriate. Do not return `success: true` only — the frontend needs the actual created record.

#### 24. Frontend Flow

```
User: + New Project
↓ Create Project form
↓ User enters Name, Description, Objective, Start, Deadline, Priority, Goal, Plan, Milestones
↓ Validation
↓ POST API
↓ Database transaction
↓ Return actual Project
↓ Update local/project state
↓ Realtime event
↓ Navigate to Project Detail
```
NO FULL PAGE RELOAD.

#### 25. Realtime

Emit `PROJECT_CREATED` with the actual project payload/id. Do not emit generic `WORKSPACE_UPDATED` for project creation. Other connected clients in the workspace should receive the new project.

#### 26. Project List

After creation, the project must immediately appear in Projects without refreshing the browser. Project count should update. Filters should update. Search should find it.

#### 27. Project Detail

After successful creation, navigate to `/projects/:projectId` using the existing client-side router. Do not use `window.location.href` or `location.reload()`. Do not recreate the entire application shell — global header and sidebar must remain mounted.

#### 28. Initial Project Detail

Immediately after creation, Project Detail should show: PROJECT NAME, DESCRIPTION, OBJECTIVE, STATUS, PRIORITY, START DATE, DEADLINE, PROJECT PLAN, MILESTONES, TASKS, DOCUMENTS, NOTES, TIME, ACTIVITY. If there is no data for a section, show a useful empty state. Do not invent content.

#### 29. Project Progress

New project: 0% unless initial tasks/milestones were created and completed. Do NOT hardcode 50%/65%/78% — progress must be derived (e.g. 0 completed / 5 total = 0%).

#### 30. Task Creation From Project

Project Detail "+ Add Task" must open the REAL task creation flow, automatically setting `projectId = current project`. The user should not need to manually select the project again. Task deadline can be independent, but validate that it does not create an invalid relationship with the project where applicable.

#### 31. Milestone Creation After Project Creation

Project Detail "+ Add Milestone" must create a real milestone with Name, Description, Deadline, Status. Persist. Update Project Detail immediately.

#### 32. Document Creation / Linking

Project Detail "+ Add Document" must allow Upload new file OR Select existing Library document. If existing, link it — do NOT duplicate physical storage. The document must appear in Project Documents and remain accessible from Library.

#### 33. Project Notes

Project Detail "+ Add Note" creates a real Note linked to `projectId`. Do not store notes only in local component state.

#### 34. Project Deadline → Calendar

When a project is created with a deadline, Calendar must be able to display it using the existing Calendar model. Do not create duplicate calendar records if the project deadline itself can be rendered by Calendar. Click Calendar Project Deadline → Project Detail.

#### 35. Project Deadline → Dashboard

If project is upcoming, Dashboard Upcoming / Project Pulse can show it. Click → Project Detail. Only show actual projects.

#### 36. Project → Goal

If Goal selected during creation, Goal Detail should show Related Projects, and Project Detail should show Related Goal. Both must reference the actual Goal entity.

#### 37. Project → Focus

Project Detail "Start Focus" creates a REAL focus session linked to `projectId`. If started from a task, `projectId` + `taskId` must be available.

#### 38. Project → Time Tracking

Focus sessions linked to the project must contribute to Project Time. Do not hardcode project time — calculate from real sessions.

#### 39. Project → Progress

Progress should respond to Task completion, Milestone completion, Project completion. Do not manually update a percentage from the frontend — use actual source records.

#### 40. Project Activity

Creation should generate `PROJECT_CREATED`. Activity should include projectId, userId, timestamp, action, metadata where supported.

Later events: `PROJECT_UPDATED`, `PROJECT_DEADLINE_CHANGED`, `MILESTONE_CREATED`, `MILESTONE_COMPLETED`, `TASK_CREATED`, `TASK_COMPLETED`, `DOCUMENT_ADDED`, `FOCUS_COMPLETED`, `PROJECT_COMPLETED`. Use specific activity/event types.

#### 41. Edit Project

Project Detail "Edit" must open a real form allowing changes to Name, Description, Objective, Plan, Start Date, Deadline, Priority, Status, Goal. Changes: UI → API → Database → Realtime → UI. No page reload.

#### 42. Delete Project

Delete must NOT happen accidentally. Use confirmation. Show consequences (e.g. "This project contains X tasks, X milestones, X documents"). Choose appropriate existing cascade/archive behavior. Prefer archive if the product's business rules require preserving history. Do not silently delete related production data.

#### 43. Archive

Support "Archive Project". Archived projects should disappear from the active project list but remain accessible through Archived unless existing product rules define otherwise.

#### 44. Duplicate Submission

During creation: "Create Project" → "Creating...". Disable the submit button. Prevent double-click from creating duplicate projects.

#### 45. Error Handling

If API/database creation fails: DO NOT close the form, DO NOT show fake success. Show a useful error. Keep entered values. Allow Retry.

#### 46. Loading

No artificial delay. Do NOT use `setTimeout()` to make creation look realistic. Use proper loading state only while the request is executing.

#### 47. Real Empty State

If there are no projects: "No projects yet. [ + Create Project ]". Do not show fake cards, sample projects, fake progress, fake deadlines.

#### 48. Mobile Creation

Mobile project creation: Bottom sheet/full screen. Must support keyboard, safe area, internal form scrolling. The global page must not scroll. Footer (Cancel, Create Project) must remain accessible.

#### 49. Desktop Creation

Desktop: max-width around 560–680px. Do not create an oversized modal. Use sections: Basic, Planning, Execution. Progressive but simple.

#### 50. Date/Timezone

Use the application's existing timezone strategy. Do not convert 2026-09-15 into the previous/next date because of UTC conversion. Date-only deadlines should remain date-only where appropriate.

#### 51. API / Database Error Audit

Inspect existing project creation code. Identify: frontend-only state, mock APIs, hardcoded responses, missing database insert, incorrect workspace IDs, missing foreign keys, incorrect date handling, missing transaction, missing realtime, duplicate listeners. Fix root causes.

#### 52. Routing Audit

Project creation must not cause full reload, header movement, sidebar remount, socket reconnect, theme reset, or workspace reset. Correct: Persistent AppShell + Client-side Project navigation.

#### 53. Real Data Audit

Search the project codebase for: mockProjects, sampleProjects, demoProjects, fakeProjects, placeholderProjects. Remove production usage. If seed data exists for development, keep it isolated from production behavior.

#### 54. Project Creation Acceptance Test

Test this exact scenario:
1. Open Personal Workspace.
2. Open Projects.
3. Click + New Project.
4. Enter: Name "ManMadhan Progress V1", Description "Personal execution workspace.", Objective "Build a complete real personal productivity workspace.", Start "Today", Deadline "September 15, 2026", Priority "High", Status "Planning".
5. Add milestones: Core Shell, Task System, Calendar, Documents, Final QA.
6. Select an existing Goal.
7. Submit.

EXPECTED: Project is actually inserted into database. Project receives real ID. Milestones are actually inserted. Goal relationship exists. Deadline is stored correctly. Project appears in Projects. Project Detail opens. Progress is 0% because nothing is completed. Calendar can display project deadline. Goal shows related project. Activity shows Project Created. Other workspace clients receive PROJECT_CREATED. No browser reload. No fake success.

#### 55. Second Test

Create a task from the new Project Detail.

EXPECTED: `Task.projectId` points to the created project. Task appears in project task list. Task appears in Tasks. Project task count updates. Project progress updates when task completes.

#### 56. Third Test

Upload/link a document.

EXPECTED: Document exists in Library. Document is linked to project. Project Documents updates. No duplicate physical file. Activity records document addition.

#### 57. Fourth Test

Start Focus from Project Detail.

EXPECTED: Focus session created. `projectId` stored. Timer works. Completed session contributes to Project Time. Project Activity updates.

#### 58. Fifth Test

Change Project Deadline.

EXPECTED: Database updates. Project Detail updates. Calendar updates. Dashboard upcoming data updates. Realtime event `PROJECT_DEADLINE_CHANGED`. No page reload.

#### 59. Final Data Relationship

```
WORKSPACE
   └── PROJECT
        ├── PLAN
        ├── DEADLINE
        ├── GOAL
        ├── MILESTONES
        ├── TASKS
        │    └── FOCUS
        │         └── TIME
        ├── DOCUMENTS
        │    └── LIBRARY
        ├── NOTES
        ├── CALENDAR
        ├── PROGRESS
        └── ACTIVITY
```
Everything must use REAL relationships.

#### Final Command

Do not stop at making the Project creation modal look correct. Inspect and implement the complete Project creation MODEL.

Verify: UI → Validation → API → Database → Transaction → Relationships → Realtime → Project Detail → Tasks → Milestones → Documents → Calendar → Goals → Focus → Time → Progress → Activity.

If any layer is missing, implement it using the EXISTING architecture. If an existing model/API already supports the feature, reuse it instead of creating duplicate architecture.

If a bug is found: REPRODUCE → FIND ROOT CAUSE → FIX → TEST → REGRESSION TEST. Do not use mock data to make the UI appear functional.

The final Project creation must create a REAL project that survives refresh, belongs to the correct workspace, has real relationships, and immediately becomes usable throughout the Personal Workspace.

---

## PART 8 — Complete Personal Workspace: Real Internal Pages

### MANMADHAN PROGRESS — COMPLETE PERSONAL WORKSPACE — REAL INTERNAL PAGES

READ `ui.md` FIRST.

**IMPORTANT:** The current application has many pages that visually resemble simple card-based dashboards. THIS IS NOT THE FINAL PRODUCT.

Upgrade EVERY internal page into a REAL FUNCTIONAL WORK SURFACE. Do NOT make pages simply Title + 3 cards + statistics + empty space. Every page must have a clear PURPOSE and REAL ACTIONS. The application must feel like one professional Personal Execution Workspace.

#### 1. Core Rule

EVERY PAGE MUST HAVE:
1. Real data
2. Real creation flow
3. Real editing
4. Real deletion/archive where appropriate
5. Real detail view
6. Real relationships
7. Real persistence
8. Real loading state
9. Real empty state
10. Real error state
11. Real search/filter where useful
12. Real realtime updates where applicable
13. Mobile behavior
14. Desktop behavior

DO NOT create a page that only displays information.

#### 2. Page Design Philosophy

Each page must answer: What is this page for? What can I do here? What data do I manage here? What can I create? What can I edit? What can I open? What other modules does it connect to?

Do not force every page into the same card layout. Use the correct interface for the content:

Tasks → Kanban/List; Projects → Workspace; Calendar → Calendar; Notes → Editor; Journal → Timeline/Editor; Books → Personal Library; Podcasts → Player/Library; Goals → Goal planning; Progress → Analytics; Library → File manager; Habits → Tracker; Time → Time log; Search → Search interface; Settings → Settings forms.

#### 3. Global Internal Page Shell

Every page lives inside FIXED GLOBAL HEADER + PAGE VIEWPORT. The global header remains fixed. The browser body must not scroll. Page-specific content may internally scroll.

Use `100dvh`, `min-height: 0`, `min-width: 0`. Do NOT stack multiple 100vh containers.

#### 4. Dashboard

Dashboard is a DECISION SURFACE, not a collection of cards.

Include: Today's priorities, Current focus, Active tasks, Active projects, Upcoming deadlines, Calendar items, Daily work graph, Learning activity, Recent activity.

Real actions: Create Task, Create Project, Start Focus, Add Note, Add Idea, Add Goal, Add Event, Add Book, Add Podcast.

Clicking a record opens the actual record. Dashboard should adapt to actual user activity. If there is no data: show useful empty states.

#### 5. Focus

Focus is an EXECUTION SURFACE. Must support: Select Work, Start, Pause, Resume, Complete, Change Work, Cancel, Session Notes.

Show: Current work, Timer, Session duration, Today's focus time, Recent sessions, Session history. Timer must be persistent.

Focus must connect to: Task, Project, Book, Goal, Time Tracking, Progress. NO PAGE SCROLL.

#### 6. Tasks

Tasks must be a REAL TASK MANAGEMENT WORKSPACE.

Views: Kanban, List. Kanban: Backlog, To Do, In Progress, Review, Completed.

Features: Create Task, Edit, Delete, Archive, Complete, Reopen, Drag & Drop, Priority, Deadline, Project, Goal, Tags, Estimate, Subtasks, Dependencies, Reminder, Notes, Attachments, Focus.

Task Detail must contain: Overview, Description, Subtasks, Deadline, Relations, Time, Activity, Notes.

#### 7. Task Creation

Create Task form: Title *, Description, Deadline, Due time, Priority, Project, Goal, Estimate, Tags, Reminder.

Creation must: validate, persist, return actual task, update UI, emit realtime event. No mock task creation.

#### 8. Projects

Projects must be REAL WORKSPACES.

Project list: Active, Planning, On Hold, Completed, Archived.

Each project supports: Plan, Objective, Scope, Deadline, Priority, Milestones, Tasks, Documents, Notes, Goals, Calendar, Focus, Time, Progress, Activity.

#### 9. Project Detail

Project Detail must NOT be a card page.

```
PROJECT HEADER — Name, Status, Priority, Deadline, Health
Actions: Edit, Start Focus, Add Task, Add Milestone, Add Document, Add Note
Sections: Overview, Plan, Milestones, Tasks, Documents, Notes, Timeline, Time, Calendar, Activity
```

#### 10. Project Plan

Real editable plan. Sections: Objective, Expected Outcome, Scope, Execution Plan, Dependencies, Milestones. Allow editing. Persist changes.

#### 11. Project Milestones

Real milestone records. Features: Create, Edit, Complete, Reopen, Delete. Each: Name, Description, Deadline, Status, Order. Project progress should use real milestone/task data.

#### 12. Project Documents

Documents are first-class project resources. Support: Upload, Select existing Library file, Preview, Open, Download, Rename, Remove link, Delete where permitted. Do NOT create a second file system — use existing Library/storage architecture.

#### 13. Calendar

Calendar must be a REAL scheduling surface.

Views: Month, Week, Day, Agenda. Controls: Today, Previous, Next.

Features: Create Event, Edit Event, Delete Event, Move Event, Task Deadline, Project Deadline, Milestone, Reminder.

Click date: show that day's records. Click event: open actual detail. Calendar must work without page scrolling.

#### 14. Calendar Event Creation

Fields: Title *, Date *, Start, End, Description, Related Task, Related Project, Reminder. Persist. Realtime update. No page reload.

#### 15. Notes

Notes must be a REAL EDITOR. Not cards.

Features: Create, Edit, Delete, Archive, Pin, Favorite, Tags, Search.

Editor: Title, Content, Tags, Related objects. Relationships: Task, Project, Goal, Book, Podcast, Journal.

Autosave only if the existing architecture supports safe autosave. Otherwise explicit Save.

#### 16. Note Detail

Open a note as a real document/editor. Show: Title, Content, Tags, Created, Updated, Related objects. Actions: Edit, Pin, Archive, Delete, Link to Project, Link to Task.

#### 17. Journal

Journal must be a DAILY PERSONAL RECORD.

Views: Calendar, Timeline, Entry. Features: Create Entry, Edit Entry, Delete Entry, Search, Filter by date.

Entry: Date, Title, Content, Linked tasks, Linked projects, Linked goals, Learning activity, Focus summary.

Do not make every journal entry a card. Use an actual writing surface.

#### 18. Ideas

Ideas must be an IDEA INBOX.

Views: Inbox, Exploring, Planned, Building, Converted, Archived. Features: Capture Idea, Edit, Tag, Search, Convert.

Conversion: Idea → Task, Idea → Project, Idea → Goal. When converted: create a REAL linked entity.

#### 19. Goals

Goals are the STRATEGIC LAYER.

Goal Detail: Outcome, Why, Deadline, Progress, Milestones, Projects, Tasks, Habits, Books, Podcasts, Activity.

Features: Create Goal, Edit, Archive, Complete, Add Milestone, Link Project, Link Task. Progress must derive from actual linked work.

#### 20. Goal Milestones

Real goal milestones. Fields: Name, Deadline, Status, Description. Features: Create, Edit, Complete, Reopen, Delete.

#### 21. Progress

Progress must be a REAL ANALYTICS WORKSPACE. NOT a collection of statistic cards.

Include: Date range, Daily work, Task completion, Focus time, Project progress, Goal progress, Learning, Habits, Time distribution.

Graphs must use real data. Allow selecting metrics. Click graph data: open actual underlying records.

#### 22. Progress Detail

Every metric must be explainable — e.g. click "Focus Time: Today 2h 30m" → show actual focus sessions; click "Tasks: 12 completed" → show completed tasks; click "Project: 68%" → open Project Detail.

#### 23. Books

Books = MY PERSONAL BOOKSHELF. NOT a generic book catalog.

Views: All, Owned, Want to Read, Reading, Paused, Completed, Abandoned.

Features: Add Book, Find Book, Edit, Update Progress, Start Reading, Pause, Resume, Complete, Add Note, Add Review, Add Rating, Set Target Date, View External Book Link.

Each book must be a REAL personal record.

#### 24. Book Detail

Real cover, Title, Author, Metadata, Ownership, Status, Current page, Total pages, Progress, Target date, Reading sessions, Notes, Review, Rating.

External: "[ View Book ↗ ]" — one canonical external link. Do not turn Books into an Amazon clone.

#### 25. Reading Session

Real session: Start, Pause, Resume, Complete. Track: Start time, End time, Duration, Starting page, Ending page. Connect to: Book, Focus, Time Tracking, Progress.

#### 26. Podcasts

Podcasts = PERSONAL LISTENING WORKSPACE.

Views: Podcasts, Episodes, Now Listening, Queue, Saved, History.

Features: Add Podcast, Add Episode, Play, Pause, Resume, Queue, Save, Remove, Track Progress, Episode Notes. Do not show fake podcast data.

#### 27. Podcast Detail

Podcast: Title, Description, Episodes, Saved, Latest Episodes. Episode: Title, Description, Duration, Progress, Notes, Played state. Real listening history.

#### 28. Library

Library = FILE MANAGEMENT WORKSPACE. Not file cards only.

Features: Folders, Files, Upload, Search, Filter, Sort, Preview, Download, Rename, Move, Archive, Delete.

Support: Documents, PDF, Images, Spreadsheets, Presentations, Other supported files. Use actual storage.

#### 29. File Detail

File detail: Preview, Name, Type, Size, Created, Updated, Owner, Location, Linked Project, Linked Task. Actions: Open, Download, Rename, Move, Delete.

#### 30. Reminders

Reminders must be a REAL reminder manager.

Views: Today, Upcoming, Completed. Features: Create, Edit, Complete, Snooze, Reschedule, Delete, Recurring.

Connect reminders to: Task, Project, Goal, Book, Podcast, Calendar.

#### 31. Habits

Habits = REAL DAILY TRACKER.

Features: Create Habit, Edit, Pause, Archive, Complete Today, Undo. Settings: Frequency, Target, Start Date, Goal.

Views: Today, Week, Month, History. Calculate Streak, Completion rate, Weekly performance from actual records.

#### 32. Time Tracking

Time Tracking = REAL TIME LOG.

Views: Today, Week, Month. Show actual entries. Features: Start, Stop, Edit, Delete, Manual Entry where supported.

Filters: Task, Project, Focus, Reading, Podcast. Do not show fake hours.

#### 33. Analytics

Analytics must provide actual analysis.

Sections: Execution, Projects, Focus, Learning, Habits, Goals.

Charts: Work distribution, Task completion, Focus trend, Project time, Learning time, Habit consistency. All derived from real data.

#### 34. Activity

Activity is a REAL chronological event stream.

Events: Task created, Task completed, Project created, Milestone completed, Focus completed, Book updated, Podcast played, Goal updated, Habit completed, Document uploaded, Calendar event created.

Filters: All, Work, Learning, Goals, System. Click activity: open related object.

#### 35. Search

Search is a REAL GLOBAL SEARCH SYSTEM.

Search: Tasks, Projects, Goals, Notes, Journal, Ideas, Books, Podcasts, Calendar, Files, Habits, Reminders.

Features: Cmd/Ctrl+K, Recent searches, Filters, Keyboard navigation, Grouped results. Result click: open actual object.

#### 36. Archive

Archive must be a real recovery area.

Show archived: Tasks, Projects, Notes, Ideas, Goals, Books, Podcasts, Files. Actions: Restore, Delete permanently where allowed.

#### 37. Profile

Profile must be a real account surface. Show: Account, Profile, Workspace, Preferences, Activity. Allow editing supported profile fields.

#### 38. Settings

Settings must use real forms. Sections: Account, Appearance, Workspace, Notifications, Privacy, Security, Data, Preferences. Changes must persist.

#### 39. Notifications

Notification Center: Unread, All, Read. Actions: Open, Mark Read, Mark All Read, Dismiss. Notifications must link to actual records.

#### 40. AI Assistant

If connected: Real AI operations only. Examples: Summarize Project, Plan Tasks, Summarize Notes, Analyze Progress, Create Draft Plan.

AI output must never pretend to have executed an action unless the action actually happened.

#### 41. Automation

Real automation interface: Trigger, Condition, Action, Execution History. Features: Create, Edit, Enable, Disable, Delete, Run where supported.

#### 42. Integrations

Real connection state. Show: Connected, Disconnected, Available. Do not fake connected services.

#### 43. Command Center

Command Center is the EXECUTION CONTROL SURFACE.

Show: Current Work, Urgent Tasks, Upcoming Deadlines, At-Risk Projects, Current Focus, Pending Decisions, Quick Actions. Actions open the actual underlying records. Do not duplicate Dashboard.

#### 44. Detail Page Rule

Every major entity needs a real detail surface:

Task → Task Detail; Project → Project Workspace; Goal → Goal Detail; Book → Book Detail; Podcast → Podcast Detail; Note → Note Editor; File → File Detail; Event → Event Detail; Habit → Habit Detail; Reminder → Reminder Detail.

The user should be able to OPEN an object and work on it.

#### 45. Create / Edit Pattern

Every major entity must follow: CREATE → VALIDATE → API → DATABASE → REALTIME → UI UPDATE → DETAIL PAGE.

Edit: DETAIL → EDIT → VALIDATE → API → DATABASE → REALTIME → UI UPDATE.

No frontend-only objects.

#### 46. Real Relationships

The application must connect entities:

```
Task ↔ Project ↔ Goal ↔ Calendar ↔ Focus ↔ Notes
Project ↔ Goal ↔ Tasks ↔ Milestones ↔ Documents ↔ Calendar ↔ Focus ↔ Time ↔ Activity
Book ↔ Goals ↔ Tasks ↔ Notes ↔ Focus ↔ Reading Sessions
Podcast ↔ Goals ↔ Tasks ↔ Notes ↔ Listening Sessions
Goal ↔ Projects ↔ Tasks ↔ Habits ↔ Learning
```

#### 47. No Simple Card Pages

Do NOT implement: Page → Header → 4 statistic cards → 6 object cards → Done. That is explicitly NOT acceptable. Every page must provide a meaningful working surface.

#### 48. No Mock Data

Search the codebase for: mock, dummy, sample, demo, placeholder, fake. Remove production usage. If there is no data: show an empty state.

#### 49. Realtime

Use specific events:

```
TASK_CREATED, TASK_UPDATED, TASK_MOVED, TASK_COMPLETED
PROJECT_CREATED, PROJECT_UPDATED, PROJECT_COMPLETED
MILESTONE_CREATED, MILESTONE_COMPLETED
CALENDAR_EVENT_CREATED, CALENDAR_EVENT_UPDATED, CALENDAR_EVENT_DELETED
FOCUS_STARTED, FOCUS_PAUSED, FOCUS_RESUMED, FOCUS_COMPLETED
BOOK_CREATED, BOOK_UPDATED, READING_STARTED, READING_UPDATED, READING_COMPLETED
PODCAST_CREATED, EPISODE_PROGRESS_UPDATED, LISTENING_STARTED, LISTENING_COMPLETED
DOCUMENT_UPLOADED, DOCUMENT_UPDATED, DOCUMENT_DELETED
GOAL_UPDATED
HABIT_COMPLETED
NOTIFICATION_CREATED
```

Do not use `WORKSPACE_UPDATED` for everything.

#### 50. Routing

The application shell remains mounted. Sidebar: fixed. Header: fixed. Page content: changes. Use client-side routing. No `window.location.href`. No `location.reload()`. No full application remount.

#### 51. Scrolling

Body: NO SCROLL. Global: 100dvh. Header: FIXED. Sidebar: FIXED. Page: INTERNAL SCROLL.

Special pages: Focus — no page scroll. Tasks — Kanban internal scroll. Calendar — calendar internal region. Project — detail content internal scroll. Library — file list internal scroll.

#### 52. Mobile

Mobile must not simply shrink desktop. Optimize: 360, 375, 390, 393, 412, 420, 430.

Use: bottom navigation, bottom sheets, full-screen details, horizontal Kanban, mobile calendar agenda/day, touch-friendly controls. All important actions: minimum 44px touch target.

#### 53. Desktop

Optimize: 1024, 1280, 1440, 1600, 1920. Use available viewport efficiently. No giant empty areas. No unnecessary horizontal scrolling.

#### 54. Dark Theme

Use existing dark theme. Gold: `#D8A52B` for active, selected, primary action, progress. Do not turn the entire interface gold. No white borders.

#### 55. Light Theme

Maintain proper text, background, border, button, muted text contrast.

#### 56. Loading

Every data-driven page: Loading → Skeleton appropriate to content. Do not show a generic loading spinner for everything.

#### 57. Empty

Every page needs a useful empty state, e.g. "No projects yet. Create your first project to start organizing work. [ Create Project ]" — not "No data."

#### 58. Error

API failure: Show "Something went wrong. [ Retry ]". Do not lose form data. Do not show fake success.

#### 59. Accessibility

Support: Keyboard navigation, Focus states, ARIA labels, Accessible dialogs, Accessible dropdowns, Keyboard task movement alternative. Drag-and-drop must not be the only way to move tasks.

#### 60. Final Page Audit

For EVERY page in ui.md answer internally:

What is the primary purpose? What can the user create? What can the user edit? What can the user complete? What can the user open? What data does it use? What data does it create? What other modules does it connect to? What is the detail view? What happens when there is no data? What happens when the API fails?

If any answer is missing: IMPLEMENT IT.

#### 61. Implementation Order

1. Audit all existing pages.
2. Fix global shell and routing.
3. Fix database/API/data relationships.
4. Dashboard.
5. Tasks + Task Detail.
6. Projects + Project Detail + Plan + Milestones.
7. Calendar + Event Detail.
8. Focus + Sessions.
9. Notes + Journal + Ideas.
10. Goals + Goal Detail.
11. Books + Book Detail + Reading Sessions.
12. Podcasts + Episode Detail + Listening Sessions.
13. Library + File Detail + Documents.
14. Reminders + Habits.
15. Time Tracking + Progress + Analytics.
16. Activity + Search + Archive.
17. Profile + Settings + Notifications.
18. AI + Automation + Integrations + Command Center.
19. Realtime.
20. Responsive QA.
21. Functional QA.
22. Regression QA.

#### 62. Final Definition of Done

- [ ] No page is merely a card dashboard
- [ ] Every major page has real functionality
- [ ] Every major entity has a detail surface
- [ ] Create works
- [ ] Edit works
- [ ] Delete/archive works
- [ ] Data persists
- [ ] Relationships work
- [ ] Realtime works
- [ ] Search works
- [ ] Filters work
- [ ] Empty states work
- [ ] Error states work
- [ ] Loading states work
- [ ] Routing is smooth
- [ ] Header remains fixed
- [ ] Sidebar remains fixed
- [ ] Mobile navigation remains fixed
- [ ] Internal scrolling works
- [ ] No browser-level accidental scroll
- [ ] No mock data
- [ ] No fake metrics
- [ ] No dead buttons
- [ ] No placeholder production content
- [ ] Desktop works
- [ ] Mobile works
- [ ] Dark theme works
- [ ] Light theme works
- [ ] Build passes
- [ ] Type check passes
- [ ] Lint passes
- [ ] Existing functionality remains intact

#### Final Command

READ ui.md. AUDIT THE ENTIRE EXISTING PERSONAL WORKSPACE. DO NOT ONLY MAKE THE PAGES LOOK BETTER. TURN EVERY INTERNAL PAGE INTO A REAL PRODUCT SURFACE.

Tasks must manage work. Projects must manage projects. Calendar must manage time. Focus must manage execution sessions. Notes must provide real writing/editing. Journal must provide real daily records. Ideas must provide real idea capture and conversion. Goals must manage outcomes. Books must manage a personal bookshelf and reading. Podcasts must manage listening. Library must manage real files. Habits must track actual habits. Time Tracking must track actual time. Progress must explain actual execution. Analytics must analyze actual records. Search must search actual records. Reminders must manage actual reminders. Notifications must represent actual events. AI/Automation/Integrations must never simulate functionality.

Every major object must be creatable, editable, openable, relatable and persistent. Do not create another generic dashboard. Build the COMPLETE PERSONAL WORKSPACE.

---

## END-TO-END MASTER CHECKLIST (ALL PARTS COMBINED)

This checklist aggregates every acceptance/regression criterion from Parts 1–8. Nothing here should be skipped.

**Global Shell & Routing**
- [ ] `100dvh` application shell; browser/body never scrolls
- [ ] Fixed sidebar (desktop) / fixed header + bottom nav (mobile)
- [ ] Persistent AppShell — sidebar/header never remount on navigation
- [ ] Client-side routing only — no `window.location.href`, no `location.reload()`
- [ ] Every flex parent with a scrollable child has `min-height: 0`
- [ ] No nested `100vh` containers; use `100dvh` and `calc()`
- [ ] No scrollbar-hiding hacks anywhere

**Sidebar / Navigation**
- [ ] Books & Podcasts are first-class LEARNING sidebar items (desktop) and under More → Learning (mobile)
- [ ] Full sidebar order preserved exactly as specified
- [ ] Active state, deep links, back/forward, refresh all work correctly

**Focus Page**
- [ ] No page scroll; fits 100dvh; timer, work label, controls, recent sessions all fit
- [ ] Real persisted sessions (Start/Pause/Resume/Complete/Skip)
- [ ] Recent sessions from real data; horizontal scroll only on mobile strip

**Tasks / Kanban**
- [ ] Fixed page header + toolbar; only Kanban columns scroll internally (vertical)
- [ ] Kanban board scrolls horizontally only within its own viewport; first column never clipped
- [ ] Real drag-and-drop with optimistic update + rollback on failure
- [ ] Real Create Task modal/sheet with title, description, deadline (real date), priority, project, goal, estimate, tags, reminder
- [ ] Task Detail, Edit, realtime events (`TASK_*`), no `WORKSPACE_UPDATED` spam

**Projects**
- [ ] Real Project entity: plan, objective, deadline, priority, status, milestones, tasks, documents, notes, time, activity, goal link
- [ ] Progress and health always derived from real data, never hardcoded
- [ ] Full Project Creation Model: UI → validation → API → DB transaction → relationships → realtime → Project Detail
- [ ] Project Documents integrated with existing Library/File system (no duplicate storage)
- [ ] Milestones are real records with deadlines/status

**Calendar**
- [ ] Month/Week/Day/Agenda views; Today/Previous/Next fully functional with real date math (no hardcoded dates)
- [ ] Click date → day detail; click event → event detail; click empty slot → create event
- [ ] No page-level scroll; only internal calendar region scrolls

**Books**
- [ ] Real personal library (not a catalog); ownership/reading states; real metadata via lookup + user confirmation
- [ ] One canonical external link only; real reading sessions; progress derived from current/total pages
- [ ] No duplicate books (ISBN-based dedupe)

**All Remaining Pages** (Podcasts, Notes, Journal, Ideas, Goals, Progress, Library, Reminders, Habits, Time Tracking, Analytics, Activity, Search, Archive, Profile, Settings, Notifications, AI Assistant, Automation, Integrations, Command Center)
- [ ] Each is a real functional work surface, not a card dashboard
- [ ] Real create/edit/delete/detail flows and real relationships to other modules

**Data & Realtime**
- [ ] Zero mock/dummy/sample/demo/fake data anywhere in production paths
- [ ] Specific realtime events per entity type; no universal `WORKSPACE_UPDATED`
- [ ] No duplicate socket listeners across navigation
- [ ] Data render immediately from source; socket connects in background; no artificial `setTimeout` delays

**Responsive**
- [ ] Desktop: 1024, 1280, 1440, 1600, 1920 — no overflow, no clipping
- [ ] Mobile: 360, 375, 390, 393, 412, 420, 430 — no horizontal overflow, 44px touch targets
- [ ] Tablet: 768, 820, 1024

**Theming**
- [ ] Dark theme tokens preserved (`#0B0B0C`, `#141416`, `#18181A`), gold `#D8A52B` used sparingly, no white borders
- [ ] Light theme contrast preserved

**Quality Gates**
- [ ] Type check passes, lint passes, build passes
- [ ] No `any`/`@ts-ignore`/`eslint-disable` used to hide bugs
- [ ] Full regression pass across every page listed above after each phase of work

---

## FINAL MASTER COMMAND

Read `ui.md` as the canonical specification and inspect the entire existing ManMadhan Progress codebase before changing anything. This is a non-destructive, incremental UPGRADE of an existing production application — never a rebuild, never a replacement of working architecture, database, authentication, or realtime infrastructure.

Work through every section of Parts 1–8 above, in the order: global shell & routing fixes → sidebar (Books/Podcasts) → Focus layout → Tasks/Kanban scroll architecture and real task creation with deadlines → Projects (plan, milestones, documents, real creation model) → Books (real personal library) → every remaining page (Podcasts, Notes, Journal, Ideas, Goals, Progress, Library, Reminders, Habits, Time Tracking, Analytics, Activity, Search, Archive, Profile, Settings, Notifications, AI Assistant, Automation, Integrations, Command Center).

For every feature: if it works, preserve it; if it's mock, connect it to real data; if it's broken, find the root cause and fix it; if it's missing, implement it using the existing architecture. No fake data, no dead buttons, no mock interactions, no artificial delays, no `WORKSPACE_UPDATED` catch-all events, no accidental browser/body scrolling anywhere, no white borders in dark theme, no unresolved bugs.

After every phase, run the End-to-End Master Checklist above in full before moving to the next phase. Do not stop until every checklist item is genuinely true across desktop, mobile, dark theme, and light theme, and the entire application behaves as ONE coherent, real, professional, human-designed, realtime Personal Execution Workspace.