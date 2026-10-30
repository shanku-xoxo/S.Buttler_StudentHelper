# S.BUTLER — FRONTEND PRODUCT REQUIREMENTS DOCUMENT

**Project Type:** Web Application (Frontend)
**Companion Document:** Student Academic Assistant — Backend PRD
**Design Reference:** Canva Prototype — "Presentation - Assistant Prototype"
https://www.canva.com/d/ZY8Pu4_rHnc5qDc

---

## 1. PURPOSE OF THIS DOCUMENT

This PRD defines the frontend implementation requirements for **S.Butler**, the student-facing web client for the Student Academic Assistant platform. It translates the approved UI prototype (dark, Notion-inspired workspace) and the backend PRD's functional scope into concrete frontend screens, components, states, and interaction rules that a development agent can implement directly.

The backend PRD remains the source of truth for data models, services, and business rules. This document does not redefine backend behavior — it defines how that behavior is presented and interacted with in the browser.

---

## 2. PRODUCT CONTEXT

S.Butler unifies four modules behind one navigation shell:

1. AI Assistant (chat)
2. Calendar & Deadlines
3. Todo & Planner
4. Notes & Document Manager

A Dashboard acts as the landing/home screen summarizing all four.

**Core interaction principle (carried over from backend PRD, Section 20):**
The AI can understand, suggest, and summarize, but it must never silently write to persistent data. Every AI-proposed action (save note, add calendar event, update progress) must render as an explicit confirmation UI element that the student approves before the backend is called.

```
AI understands → AI proposes action (UI card/chip) → Student confirms → Frontend calls backend → UI reflects updated state
```

This principle governs component design across every screen and is a hard frontend requirement, not just a backend one.

---

## 3. DESIGN SYSTEM

### 3.1 Visual Direction
Dark, minimal, workspace-style UI inspired by Notion — restrained color, thin dividers instead of heavy shadows/borders, generous whitespace, content-first layout.

### 3.2 Color Palette

| Token | Usage | Value (reference) |
|---|---|---|
| `bg-base` | App background | Near-black, `#111214` |
| `bg-surface` | Sidebar, cards, panels | Charcoal, `#1B1C1F` |
| `bg-surface-raised` | Hover/active surface | `#232427` |
| `border-hairline` | Dividers, card outlines | 1px, `#2C2D30` |
| `text-primary` | Headings, primary content | Off-white, `#EDEDED` |
| `text-secondary` | Metadata, labels, timestamps | Muted gray, `#9B9B9E` |
| `accent` | Primary actions, active states, progress | Single muted accent (blue or green — confirm with brand) |
| `accent-subtle` | Accent at low opacity for backgrounds/pills | Accent @ 12–16% opacity |
| `status-exam` / `status-assignment` / `status-class` / `status-study` | Calendar/event color coding | Distinct low-saturation hues, consistent across Calendar and Planner |
| `priority-high` / `priority-medium` / `priority-low` | Task priority flags | Distinct low-saturation hues, reserved from event colors |

Only one true accent color is used for primary actions and emphasis; everything else stays neutral. Event/priority colors are functional coding, not decorative — reuse the same hue mapping in both Calendar and Planner.

### 3.3 Typography
- Single sans-serif family, clean and highly legible at small sizes (e.g. Inter, or system UI font stack).
- Scale: H1 24–28px / H2 18–20px / Body 14px / Caption/meta 12px.
- Weight used for hierarchy over size where possible (Notion-style restraint) — avoid more than 3 weight/size combinations per screen.

### 3.4 Spacing & Layout
- Base spacing unit: 8px grid.
- Sidebar width: fixed, ~240px desktop, collapsible to icon-only rail (~64px).
- Content max-width on wide screens to avoid line-length/card-stretch issues; center content area with side padding.
- Card/row separation via `border-hairline` dividers by default; avoid stacked drop shadows. Shadows, when used (e.g. floating action button), stay subtle.

### 3.5 Core Components (shared across screens)

| Component | Notes |
|---|---|
| **Sidebar Nav** | Logo mark + "S.Butler" wordmark, 6 nav items (Dashboard, AI Assistant, Calendar, Planner, Notes, Settings), active item shown via subtle background highlight bar, not a hard border. Collapsible. |
| **Top Bar** | Contextual per screen — greeting/search on Dashboard, breadcrumb on Notes, toolbar on Calendar/Planner. Profile avatar persists top-right. |
| **Summary Card / DB-style block** | Charcoal surface, thin border, small icon, label, value. Used on Dashboard. |
| **Confirmation Chip/Button** | Pill-shaped, outline style in accent color. Used for "Save as Note," "Add to Calendar," "Update Progress." Must always appear in pairs of Confirm / Edit-or-Dismiss — never a single silent-accept action. |
| **List Row** | Text row with thin divider, used for upcoming events, document lists, context labels. Replaces heavy card UI where content is list-like. |
| **Tag/Pill** | Subject tags, event-type tags, priority flags — accent-subtle background, small rounded pill. |
| **Progress Bar** | Slim, single accent color fill, used on Dashboard and Planner. |
| **Kanban Card** | Dark rounded rectangle, subject tag, title, estimated hours, priority flag icon. |
| **Floating Action Button (FAB)** | Circular, accent-filled, bottom-right, used for "Add Task." |
| **Callout Block** | Thin left accent border + text, used for AI responses in chat (Notion callout style). |
| **Modal/Drawer** | Used for Add Event, Add Task, and any confirmation requiring edits before commit. |

---

## 4. INFORMATION ARCHITECTURE

```
S.Butler
├── Dashboard (/)
├── AI Assistant (/assistant)
├── Calendar (/calendar)
├── Planner (/planner)
│   ├── Daily
│   ├── Monthly
│   ├── Semester
│   └── Academic Year
├── Notes (/notes)
│   └── Semester → Subject → Module → Documents
└── Settings (/settings)
```

Persistent left sidebar navigation across all authenticated routes. Active route is always visually indicated in the sidebar.

---

## 5. SCREEN SPECIFICATIONS

### 5.1 Dashboard — Home Overview

**Purpose:** Single-glance summary of everything due, planned, and recent.

**Layout:**
- Sidebar (persistent).
- Top bar: "Welcome back" + current semester label, search input, profile avatar.
- 4 summary blocks in a row: Upcoming Deadlines, Tasks Due Today, Hours Planned This Week, Recent Notes. Each is clickable and routes to the relevant module filtered appropriately.
- Weekly progress bar: % of planned hours completed this week.
- Right panel: next 3 upcoming calendar events (subject tag + date), each row links to Calendar with that date focused.

**States:**
- Empty state per summary block (e.g., "No deadlines this week") — must not show broken/zero UI.
- Loading skeletons for each block independently (data may arrive at different times from different services).

**Data sources (per backend PRD services):** Calendar Service, Task/Planner Service, Document/Notes Service.

---

### 5.2 AI Assistant — Chat Screen

**Purpose:** Primary conversational interface; central interaction layer per backend PRD Section 7.

**Layout:**
- Sidebar (AI Assistant active).
- Center: conversation thread. User messages as simple left-aligned text blocks. AI responses as callout-style blocks (thin left accent border).
- Action chips render **inline, directly under the specific AI message that triggered them** (not globally) — e.g. "Save as Note," "Add to Calendar," "Update Progress" — only when the AI has detected a relevant proposal in that message.
- Input bar (bottom, fixed): text field, attachment icon (upload document as context), send button.
- Right context panel: currently referenced Subject / Module (read-only labels), updates as the conversation focuses on different material.

**Interaction rules (critical — maps to backend PRD Sections 7.7, 7.8, 13):**
1. AI text responses are **never** auto-saved. There is no persistent state change until a chip is tapped.
2. Tapping a proposal chip (e.g. "Add to Calendar") opens a **pre-filled confirmation modal/drawer** showing the detected fields (event title, date, time / task, module) which the student can edit before confirming.
3. Only after explicit "Confirm"/"Save" in that modal does the frontend call the backend.
4. After confirmation, show an inline success indicator in the chat thread (e.g. small "✓ Added to Calendar" tag replacing the chip) so the student has a persistent record of what was actioned from that message.
5. If the student dismisses a proposal, the chip is replaced with a neutral "Dismissed" state — it does not disappear silently (avoids confusion about whether it was actioned).

**States:** empty conversation (first-time prompt suggestions), AI "typing" indicator, attachment upload progress, error/retry state for failed AI response.

---

### 5.3 Calendar — Deadlines and Events

**Purpose:** Answers "when is something due" (backend PRD Section 8.3).

**Layout:**
- Sidebar (Calendar active).
- Toolbar: month/year label, prev/next arrows, "Add Event" (outline button, opens modal).
- Full month grid, thin 1px gridlines, colored dot indicators per event type (Exam / Assignment / Class / Study Session — consistent color tokens from Section 3.2).
- Selected-date right panel: event details (title, subject, time) + **linked planner tasks** for that event (per backend PRD Section 8.3 — a calendar event may link to one or more planner tasks). Clicking a linked task deep-links to Planner.
- Legend row at bottom mapping dot colors to event types.

**Interactions:**
- Create/Edit/Delete event via modal — matches backend CRUD (Section 8.1).
- Manual event creation and AI-proposed event creation (from Assistant) use the **same modal component** for consistency — the only difference is the modal opens pre-filled when arriving from an AI proposal.
- Deleting an event that has linked planner tasks should surface a warning (does not delete the tasks, but the student should know the link will break) — confirm exact backend behavior before finalizing this microcopy.

**States:** empty month (no events), day with multiple overlapping event types (stacked dots, not overlapping), event conflict indicator (future enhancement per backend PRD Section 18 — do not build in MVP, but leave visual room for it).

---

### 5.4 Todo & Planner — Task Board

**Purpose:** Answers "what do I need to do" and reflects dynamic replanning (backend PRD Sections 9.3–9.7).

**Layout:**
- Sidebar (Planner active).
- Tab switcher: Daily / Monthly / Semester / Academic Year — same underlying task data, different aggregation (per backend PRD Section 9.1). Switching tabs must not feel like a page reload; keep it a client-side filter/re-render where feasible.
- Progress summary bar (top): total remaining hours, recommended hours/day — recalculated value from Planner service, must visibly update after any progress change (Section 9.4).
- Kanban board: To Do / In Progress / Completed columns. Cards show subject tag, title, estimated hours, priority flag.
- FAB (bottom-right, circular, accent) — Add Task.

**Interactions:**
- Drag-and-drop between columns updates task status; this is a direct student action (not AI-mediated) so it does **not** require the confirm-chip pattern — it commits immediately, consistent with backend PRD's distinction between direct user edits and AI-proposed edits (Section 13 concerns AI actions specifically).
- Marking a task complete recalculates the progress summary bar and remaining-hours estimate **without a full page reload** — reflect the "Progress changes → Tasks update → Planner recalculates" loop from backend PRD Section 20 visibly and immediately.
- AI-proposed progress updates (from Assistant chat) land here as a distinct visual state on the affected task card (e.g. a pending badge) until confirmed, then resolve into the normal task state.

**States:** empty column, task overdue (visual flag, e.g. accent-colored due date), task partially estimated (missing estimated hours — should not block card creation but should be visually flagged as incomplete data).

---

### 5.5 Notes & Document Manager

**Purpose:** Structured storage per Semester → Subject → Module → Documents hierarchy (backend PRD Section 10).

**Layout:**
- Sidebar (Notes active).
- Breadcrumb: Semester 3 / DBMS / Module 2 (clickable at each level).
- Left inner panel: collapsible tree of Semester → Subject → Module, Notion-style page tree with folder/document icons. Must support arbitrary, user-defined module names (backend PRD explicitly states modules are not fixed to mod1/mod2 — the tree UI must not assume a naming convention).
- Main content: grid/list of document cards — file-type icon (PDF/DOCX/PPT/PPTX), file name, last modified date. The module's default `notes.txt` (backend PRD Section 7.4) should be visually distinguished (e.g. pinned first, distinct icon) since it's the default AI-append target.
- Top-right: search input, "Upload Document" (outline button).

**Interactions:**
- Upload, rename, move, delete, download — standard file-manager affordances (backend PRD Section 10.2). Move should support drag-to-tree-node or an explicit "Move to..." picker (drag-only is not sufficient for accessibility).
- Opening `notes.txt` or any text-based document opens an in-app text viewer/editor (per backend PRD "edit supported text-based documents"); PDF/DOCX/PPT open as preview/download rather than in-app edit for MVP.
- Search operates within current module scope by default, with an option to broaden to "search everywhere" (keyword search per backend PRD Section 10.4 MVP scope — no semantic search UI needed yet, but don't design the search bar in a way that blocks adding it later).
- When the AI generates notes and the student taps "Save as Note" (from Assistant chat), the frontend should route/append into this same data structure and, ideally, offer a toast/link ("View in Notes →") so the student can immediately verify where it landed.

**States:** empty module (no documents yet — prompt to upload or ask AI to generate notes), upload progress/failure per file, search-no-results.

---

## 6. CROSS-CUTTING FRONTEND REQUIREMENTS

### 6.1 Confirmation Pattern (Global Component)
Build one reusable **Confirmation Modal/Drawer** component used identically for:
- AI → Calendar event proposal
- AI → Progress update proposal
- AI → Save-as-Note proposal

Each instance pre-fills detected data, allows inline editing, and only calls the backend on explicit confirm. This should be a single shared component, not three bespoke ones, to guarantee consistent behavior per backend PRD Section 13.

### 6.2 Data Freshness / Single Source of Truth
Per backend PRD Section 12, the frontend must not cache/derive its own copies of task, progress, or event state beyond normal client-side caching for rendering. After any confirm action, re-fetch (or optimistically update, then reconcile with) the backend response rather than assuming the local state is authoritative — especially important for Planner's recalculated hours.

### 6.3 Loading, Empty, and Error States
Every screen in Section 5 must define all three explicitly before implementation sign-off; none should be left as "just show blank." Skeleton loaders preferred over spinners for card/list-based screens.

### 6.4 Responsiveness
- Primary target: desktop/laptop web (students studying at a desk).
- Sidebar collapses to icon rail below ~1024px; Kanban board becomes horizontally scrollable single-row-visible on narrow viewports; Calendar grid remains usable down to tablet width, with a list/agenda fallback view for narrow/mobile widths.
- Full mobile-app-grade UX is out of scope for MVP (backend PRD Section 18 lists mobile app as a future enhancement) — but the web UI must remain usable, not broken, on a phone browser.

### 6.5 Accessibility
- All interactive elements (chips, FAB, tree nodes, kanban cards) keyboard-navigable and screen-reader labeled.
- Color is never the sole indicator for event type/priority — pair with icon or label, since the palette is intentionally low-saturation/dark and some coding may be hard to distinguish for color-vision-deficient users.
- Sufficient contrast between `text-secondary` and `bg-base`/`bg-surface` — verify against WCAG AA given the dark theme's muted-gray text usage.

### 6.6 Component Reuse
The same Event/Task modal, Tag/Pill, and Confirmation components must be shared across Dashboard, Calendar, Planner, and Assistant — do not fork per-screen variants. This keeps the "one workspace" philosophy (backend PRD Section 20.1) visually and functionally consistent.

---

## 7. OUT OF SCOPE (FRONTEND MVP)

Matches backend PRD Section 18 — do not build UI for:
- Semantic document search
- Automatic document categorization
- Recurring calendar events
- Schedule conflict detection UI
- Push/in-app notifications system
- OCR upload flow
- Analytics dashboard
- Exam-performance prediction UI
- Native mobile app

Leave layout affordances (e.g. spacing for a future notification bell icon in the top bar) where low-cost, but do not implement the underlying features.

---

## 8. SUGGESTED TECH APPROACH (for implementing agent)

Not prescribed by the backend PRD, but recommended for a Notion-style, component-heavy, dark-themed SPA:
- Component framework: React (or equivalent) with a design-token-driven theme (CSS variables per Section 3.2 palette) so dark mode values are centralized, not hardcoded per component.
- State/data-fetching: a query/cache layer (e.g. React Query or equivalent) that supports the re-fetch-after-confirm pattern in Section 6.2.
- Drag-and-drop: needed for Kanban (Section 5.4) and optionally Notes tree move (Section 5.5).
- Routing matches the IA in Section 4, with the Planner tab state reflected in the URL (e.g. `/planner?view=daily`) so views are shareable/bookmarkable.

Final framework choice should be confirmed with the team/tooling constraints before implementation begins.

---

## 9. OPEN QUESTIONS FOR PRODUCT/DESIGN SIGN-OFF

1. Exact accent color (blue vs. green vs. other) — needs a final decision before component tokens are locked.
2. Behavior when deleting a Calendar event with linked Planner tasks (Section 5.3).
3. Whether Planner drag-and-drop status changes should also route through an AI-style confirmation, or remain instant (currently specified as instant — confirm this is correct).
4. Mobile web support level — "usable but not optimized" vs. a dedicated responsive pass.
