# CRM Platform — Comprehensive System Documentation & Role Architecture

> **Complete Reference Guide**: Architecture, Roles, Permissions, Component Anatomy, UI Controls, and Operational Workflows.

---

## 1. Executive Summary & Technology Stack

The CRM Platform is an enterprise-grade, multi-tenant Customer Relationship Management system designed with strict Role-Based Access Control (RBAC), tenant isolation, dynamic custom fields, pipeline stage automation, and platform administration capabilities.

### Technology Architecture
- **Frontend Layer**: Built using React 19, Next.js (App Router), TypeScript, TailwindCSS, and Lucide React icons. Includes an optional standalone client preview powered by Vite.
- **Backend API Layer**: Developed using NestJS 11, Fastify framework, JWT (JSON Web Tokens) with 15-minute access token expiration and 30-day rotation refresh tokens, Argon2id password hashing, and RxJS handlers.
- **Database Layer**: PostgreSQL (with single-file SQLite developer fallback) driven by Prisma ORM 6.19.
- **Security & Authorization**: Centralized RBAC matrix with resource-level permission scoping (`resource.action`) and fine-grained data visibility scoping (`OWN`, `TEAM`, `DEPARTMENT`, `COMPANY`, `ALL`).

---

## 2. Complete Role Architecture & Capabilities Matrix

The platform segregates users into **Platform Administration** (service provider staff) and **Workspace Tenant Users** (customer staff). Tenant users are governed by 5 hierarchical roles.

```
       [ Platform Admin ] (Service Provider Super-Admin)
               │
               ▼
┌────────────────────────────────────────────────────────┐
│                   Tenant Workspace                     │
├────────────┬────────────┬────────────┬─────────────────┤
│   Owner    │   Admin    │  Manager   │    Sales Rep    │   Viewer
│  (Rank 1)  │  (Rank 2)  │  (Rank 3)  │    (Rank 4)     │  (Rank 5)
└────────────┴────────────┴────────────┴─────────────────┘
```

---

### Role 1: Platform Admin (`PlatformAdmin`)
- **Scope**: Platform-Wide (Isolated from tenant customer data).
- **Authentication Route**: `http://localhost:3000/admin/login`
- **Data Access Scope**: `ALL` (Access to system tenant metrics, audit logs, and customer account statuses).

#### Responsibilities & Capabilities:
- View all registered customer Tenants, subscription plans, created dates, and active user counts.
- **Tenant Lifecycle Control**: Activate, suspend, or cancel tenant customer accounts.
- **Workspace Impersonation**: Impersonate any customer tenant without requiring customer passwords. When impersonating, an `ImpersonationBanner` appears across the UI.
- Execute database maintenance, RBAC syncs, and initial workspace provisioning.

#### Forbidden Actions:
- Cannot access tenant workspace operations as a customer user without explicitly starting an impersonation session.

---

### Role 2: Owner (`Role: Owner`)
- **Scope**: Workspace Tenant Scoped.
- **Hierarchy Rank**: 1 (Highest Workspace Authority).
- **Data Access Scope**: `COMPANY` (Can view and manipulate all data across the company).
- **Permissions**: `ALL_PERMISSIONS` (Full catalogue access).

#### Responsibilities & Capabilities:
- **Full Workspace Governance**: Unlimited control over all CRM modules (Contacts, Companies, Leads, Deals, Tasks, Activities, Pipelines, Custom Fields, Reports, Settings).
- **RBAC & Security Administration**: Create, modify, and delete custom workspace roles and assign permissions (`RolesPanel.tsx`).
- **User Management**: Invite new team members, edit user roles, change user statuses, or delete members from the tenant (`SettingsClient.tsx`).
- **API Keys & Integrations**: Generate, view, and revoke programmatic API key credentials (`ApiKeysPanel.tsx`).
- **Workspace Configuration**: Modify company name, brand colors, currency, timezones, and custom fields.

---

### Role 3: Admin (`Role: Admin`)
- **Scope**: Workspace Tenant Scoped.
- **Hierarchy Rank**: 2.
- **Data Access Scope**: `COMPANY`.
- **Permissions**: `contacts.*`, `companies.*`, `leads.*`, `deals.*`, `tasks.*`, `activities.*`, `pipelines.*`, `custom_fields.*`, `reports.*`, `users.*`, `roles.view`, `settings.*`.

#### Responsibilities & Capabilities:
- **Day-to-Day Operations**: Create, view, update, and delete any CRM record (Contacts, Companies, Leads, Deals, Tasks, Activities).
- **Pipeline & Field Administration**: Create and reorder pipeline stages, construct dynamic custom fields for records.
- **Team Management**: Invite new team members, edit basic user profile details, and deactivate members.
- **View Roles**: Inspect the RBAC permissions matrix.

#### Forbidden Actions:
- ❌ Cannot edit or redefine RBAC role permission definitions.
- ❌ Cannot issue, view, or revoke API Keys for integrations.

---

### Role 4: Manager (`Role: Manager`)
- **Scope**: Workspace Tenant Scoped.
- **Hierarchy Rank**: 3.
- **Data Access Scope**: `COMPANY`.
- **Permissions**: `contacts.*`, `companies.*`, `leads.*`, `deals.*`, `tasks.*`, `activities.*`, `pipelines.view`, `custom_fields.view`, `reports.*`, `users.view`, `roles.view`, `settings.view`.

#### Responsibilities & Capabilities:
- **Complete CRM Visibility & Record Management**: View, create, update, and delete all Contacts, Companies, Leads, Deals, Tasks, and Activities across the entire company.
- **Reporting & Performance Analytics**: Build, view, and export sales reports and leaderboard analytics.
- **Read-Only System Views**: View team members list, pipeline stage configurations, and workspace settings.

#### Forbidden Actions:
- ❌ Cannot invite, edit, or delete team members.
- ❌ Cannot modify pipeline stages or custom fields.
- ❌ Cannot change workspace settings or access RBAC management.

---

### Role 5: Sales Rep (`Role: Sales Rep`)
- **Scope**: Workspace Tenant Scoped.
- **Hierarchy Rank**: 4.
- **Data Access Scope**: `OWN` (Strictly scoped to records owned by or assigned to the specific user).
- **Permissions**: `contacts.view`, `contacts.create`, `contacts.update`, `companies.view`, `companies.create`, `companies.update`, `leads.view`, `leads.create`, `leads.update`, `deals.view`, `deals.create`, `deals.update`, `tasks.view`, `tasks.create`, `tasks.update`, `activities.view`, `activities.create`, `pipelines.view`, `custom_fields.view`, `settings.view`.

#### Responsibilities & Capabilities:
- **Personal Pipeline Management**: View, create, and update own assigned Leads, Deals, Contacts, Companies, and Tasks.
- **Activity Logging**: Log calls, emails, notes, and scheduled meetings for owned records.
- **Status Updates**: Advance lead and deal stages through the Kanban board for owned items.

#### Forbidden Actions:
- ❌ Cannot view records owned by other team members.
- ❌ Cannot delete any CRM record (Contacts, Leads, Deals, Companies, Tasks).
- ❌ Cannot access User management, Roles, Custom Field configurations, Reports, or API Keys.

---

### Role 6: Viewer (`Role: Viewer`)
- **Scope**: Workspace Tenant Scoped.
- **Hierarchy Rank**: 5.
- **Data Access Scope**: `COMPANY` (Read-only view across the company).
- **Permissions**: `contacts.view`, `companies.view`, `leads.view`, `deals.view`, `tasks.view`, `activities.view`, `pipelines.view`, `custom_fields.view`, `reports.view`, `settings.view`.

#### Responsibilities & Capabilities:
- **Read-Only Inspection**: View all company Contacts, Companies, Leads, Deals, Tasks, Activities, Reports, and Settings without modification.

#### Forbidden Actions:
- ❌ Cannot create any new record.
- ❌ Cannot edit or update any record.
- ❌ Cannot delete any record or execute administrative commands.

---

## 3. Exhaustive Component & UI Elements Breakdown

### 3.1. Core Layout & Shell Components

#### 1. `Sidebar.tsx` ([apps/web/src/components/layout/Sidebar.tsx](file:///d:/Santhosh/CRM/apps/web/src/components/layout/Sidebar.tsx))
- **Description**: Main left-hand navigation navigation panel.
- **Child UI Elements & Buttons**:
  - **Logo Branding Header**: Displays tenant logo and company name.
  - **Collapse / Expand Toggle Button**: Toggles sidebar width between expanded (240px) and collapsed icon-only view (64px).
  - **Navigation Links**:
    - `Dashboard`: Navigates to `/dashboard`.
    - `Leads`: Navigates to `/leads` (shows live badge count of open leads).
    - `Deals`: Navigates to `/deals` (shows badge count of active pipeline deals).
    - `Contacts`: Navigates to `/contacts`.
    - `Companies`: Navigates to `/companies`.
    - `Tasks`: Navigates to `/tasks` (shows badge count of pending tasks).
    - `Calendar`: Navigates to `/calendar`.
    - `Communications`: Navigates to `/communications` (WhatsApp/Email/SMS log).
    - `Automation`: Navigates to `/automation` (Workflow triggers).
    - `Reports`: Navigates to `/reports`.
    - `Settings`: Navigates to `/settings`.
    - `Admin Portal`: Link visible **only** to Platform Admins, navigating to `/admin`.

#### 2. `Topbar.tsx` ([apps/web/src/components/layout/Topbar.tsx](file:///d:/Santhosh/CRM/apps/web/src/components/layout/Topbar.tsx))
- **Description**: Universal header bar across all CRM views.
- **Child UI Elements & Buttons**:
  - **Global Search Bar Input**: Live search box (`Cmd+K` / `Ctrl+K`) that queries leads, contacts, deals, and companies simultaneously.
  - **Tenant Workspace Switcher Dropdown**: Allows users with multi-tenant access to switch between active organizations.
  - **Notification Bell Icon & Dropdown Button**: Displays badge count of unread notifications. Clicking opens a dropdown showing recent activity alerts with "Mark all as read" button.
  - **Dark Mode Toggle Button**: Switches UI theme between Light and Dark mode.
  - **User Profile Menu Avatar & Dropdown**:
    - Shows user initial avatar, full name, email, and current role badge (`Owner`, `Admin`, etc.).
    - `My Profile` button: Opens profile settings.
    - `Sign Out` button: Invalidates active session, clears refresh cookies, and redirects to `/login`.

#### 3. `ImpersonationBanner.tsx` ([apps/web/src/components/layout/ImpersonationBanner.tsx](file:///d:/Santhosh/CRM/apps/web/src/components/layout/ImpersonationBanner.tsx))
- **Description**: High-visibility yellow banner displayed across the top of the interface when a Platform Admin is impersonating a tenant account.
- **Child UI Elements & Buttons**:
  - **Status Indicator Text**: Displays `Impersonating workspace [Tenant Name] as [Platform Admin Name]`.
  - **"Exit Impersonation" Button**: Terminates the impersonation token and returns the Platform Admin to `/admin/customers`.

#### 4. `AdminShell.tsx` ([apps/web/src/app/admin/AdminShell.tsx](file:///d:/Santhosh/CRM/apps/web/src/app/admin/AdminShell.tsx))
- **Description**: Layout shell for Platform Admins on `/admin`.
- **Child UI Elements & Buttons**:
  - **Admin Navigation Tabs**: `Overview`, `Customers / Tenants`, `Subscriptions & Plans`, `Platform Audit Logs`.
  - **Platform Admin Profile Dropdown**: Shows platform admin email with "Return to CRM" and "Sign Out" buttons.

---

### 3.2. Authorization & Utility UI Controls

#### 1. `Can.tsx` ([apps/web/src/components/ui/Can.tsx](file:///d:/Santhosh/CRM/apps/web/src/components/ui/Can.tsx))
- **Description**: RBAC wrapper component that evaluates the current user's role permissions against required permission strings (`I="leads.create"`).
- **Behavior**: Hides child elements completely if the logged-in user lacks the target permission.

#### 2. `PageHeader.tsx` ([apps/web/src/components/ui/PageHeader.tsx](file:///d:/Santhosh/CRM/apps/web/src/components/ui/PageHeader.tsx))
- **Description**: Standardized page title header used across all module views.
- **Child UI Elements**: Title text, Subtitle summary, Breadcrumbs navigation, and Action button slot container.

#### 3. `Field.tsx` & `CustomFieldInputs.tsx` ([apps/web/src/components/ui/CustomFieldInputs.tsx](file:///d:/Santhosh/CRM/apps/web/src/components/ui/CustomFieldInputs.tsx))
- **Description**: Form renderers for standard and dynamic tenant custom fields.
- **Child Elements**:
  - **Text Input**: Standard text input control.
  - **Long Text Input**: Multi-line textarea control.
  - **Number Input**: Numeric value field.
  - **Currency Input**: Money field formatted in tenant currency (e.g. INR / USD).
  - **Date Picker**: Calendar date selection widget.
  - **Dropdown Selector**: Single-choice select picker.
  - **Multi-Select Checkboxes**: Multi-option checkbox group.
  - **Boolean Toggle**: Yes/No switch button.

#### 4. `PipelineStageSelect.tsx` ([apps/web/src/components/ui/PipelineStageSelect.tsx](file:///d:/Santhosh/CRM/apps/web/src/components/ui/PipelineStageSelect.tsx))
- **Description**: Pipeline stage selector dropdown and status progress bar.
- **Child UI Buttons**: Stage pill buttons (`New`, `Contacted`, `Qualified`, `Proposal`, `Negotiation`, `Won`, `Lost`) allowing 1-click stage advancement.

#### 5. `RecordSelect.tsx` ([apps/web/src/components/ui/RecordSelect.tsx](file:///d:/Santhosh/CRM/apps/web/src/components/ui/RecordSelect.tsx))
- **Description**: Auto-complete search modal picker for linking Contacts or Companies to Leads/Deals.

---

### 3.3. Module Views, Screens & Action Buttons

---

#### Module 1: Dashboard (`/dashboard`)
- **Components**: `DashboardView.tsx`
- **UI Elements & Interactive Buttons**:
  - **Metric Summary Cards**:
    - `Total Revenue Card`: Displays total won deal values and growth percentage.
    - `Active Deals Card`: Displays number of open deals in pipeline.
    - `Conversion Rate Card`: Displays percentage of qualified leads converted to won deals.
    - `Open Tasks Card`: Displays count of pending tasks due today.
  - **Revenue Pipeline Chart**: Visual bar/line chart displaying monthly sales performance.
  - **Recent Activity Feed**: Real-time stream of recent calls, notes, stage changes, and task completions.
  - **Quick Action Buttons**:
    - `+ Add Lead` Button (Wrapped in `<Can I="leads.create">`): Opens new lead modal.
    - `+ Add Deal` Button (Wrapped in `<Can I="deals.create">`): Opens new deal modal.
    - `+ Add Task` Button (Wrapped in `<Can I="tasks.create">`): Opens task creation drawer.

---

#### Module 2: Leads Management (`/leads`)
- **Components**: `LeadsView.tsx`, `LeadDetailClient.tsx`
- **UI Elements & Interactive Buttons**:
  - **View Toggle Buttons**: `Kanban Board View` vs `Table List View`.
  - **Search Input Field**: Filters leads in real-time by name, email, or company.
  - **Stage Filter Dropdown**: Filters displayed leads by stage (`New`, `Contacted`, `Qualified`, etc.).
  - **Owner Filter Dropdown**: Filters leads by assigned sales representative.
  - **`+ Add Lead` Button**: Opens Lead creation modal with fields: Lead Title, Contact Name, Email, Phone, Company, Source, Lead Value, Assigned User, and Notes.
  - **`Export CSV` Button**: Downloads filtered leads as a CSV file.
  - **Kanban Board Stage Columns**:
    - Drag-and-drop card handles to move leads between stages.
    - Lead card click: Opens `Lead Detail Drawer`.
  - **Table View Action Buttons per Row**:
    - `Edit Lead` Button: Opens edit drawer.
    - `Delete Lead` Button (Wrapped in `<Can I="leads.delete">`): Displays confirmation modal to delete lead record.
  - **Lead Detail Drawer**:
    - `Convert to Deal` Button (`POST /leads/:id/convert`, requires `leads.update` + `deals.create`): Opens a confirmation dialog pre-filled from the lead, then creates an open Deal carrying over the linked Contact, Company, owner, value and expected close date. The lead is stamped `converted` and linked to the new deal; a lead can only be converted once. Also available per row in the table view and on Kanban cards.
    - `Log Call / Note` Button: Adds activity entry to timeline.

---

#### Module 3: Deals & Pipeline (`/deals`)
- **Components**: `DealsView.tsx`, `DealDetailClient.tsx`
- **UI Elements & Interactive Buttons**:
  - **Pipeline Selector Dropdown**: Switch between different sales pipelines (e.g. "Default Sales", "Enterprise Sales").
  - **Kanban Pipeline Board**: Displays stage columns with total monetary value and weighted win probability summary at the top of each column.
  - **`+ New Deal` Button**: Opens deal creation modal with fields: Deal Name, Associated Company, Associated Contact, Stage, Deal Value, Win Probability, Expected Close Date, Assigned Rep.
  - **`Mark Won` Button**: Instantly advances deal to `Won` stage with green success animation.
  - **`Mark Lost` Button**: Advances deal to `Lost` stage with loss reason popup input.
  - **Deal Detail Drawer**:
    - `Activity History`: View calls, emails, and meetings.
    - `Associated Tasks`: Displays linked follow-up tasks with `+ Add Task` button.

---

#### Module 4: Contacts Management (`/contacts`)
- **Components**: `ContactsView.tsx`
- **UI Elements & Interactive Buttons**:
  - **Search Bar Input**: Live search contacts by First Name, Last Name, Email, or Phone.
  - **Status Filter Dropdown**: Filter by `Active` / `Inactive` contacts.
  - **`+ Add Contact` Button**: Opens Contact creation modal (First Name, Last Name, Email, Phone, Position, Company Name).
  - **`Export CSV` Button**: Exports contact list.
  - **Contact Table Row Controls**:
    - Avatar preview icon.
    - Email mailto link button.
    - Phone click-to-call button.
    - `Edit Contact` Button.
    - `Delete Contact` Button (Wrapped in `<Can I="contacts.delete">`).

---

#### Module 5: Companies Directory (`/companies`)
- **Components**: `CompaniesView.tsx`
- **UI Elements & Interactive Buttons**:
  - **Industry Filter Dropdown**: Filter companies by sector (e.g. Technology, Healthcare, Finance).
  - **`+ Add Company` Button**: Modal form (Company Name, Industry, Website, Phone, City, Country, Employees, Annual Revenue).
  - **Company Detail Drawer**: Displays company summary, primary contacts list, open deals list, and activity timeline.

---

#### Module 6: Tasks & Follow-ups (`/tasks`)
- **Components**: `TasksView.tsx`
- **UI Elements & Interactive Buttons**:
  - **Task Grouping Tabs**: `Overdue Tasks`, `Due Today`, `Upcoming`, `Completed`.
  - **Priority Filter**: Filter tasks by `Urgent`, `High`, `Medium`, `Low`.
  - **`+ Add Task` Button**: Modal form (Task Title, Description, Due Date, Priority, Assigned User, Related Entity).
  - **Task Status Checkbox Toggle**: Clicking checkbox toggles task status between `Pending` and `Completed`.

---

#### Module 7: Automation (`/automation`)
- **Components**: `AutomationClient.tsx`, `WorkflowBuilder.tsx`, vocabulary in `apps/web/src/lib/workflows/vocabulary.ts`
- **Engine**: `WorkflowEngineService` (`apps/api/src/workflows/workflow-engine.service.ts`). Record services (leads, deals, contacts, companies, tasks) call `dispatch()` after every create, update and delete. Dispatch is fire-and-forget and swallows its own errors, so a broken rule can never fail the request that triggered it. The engine writes through Prisma rather than the record services, which is what stops a rule from retriggering itself.
- **Rule shape**: a trigger (record type + event), optional conditions (all must hold), and an ordered list of actions.
- **Triggers**: `record_created`, `record_updated`, `field_changed` (watches one field), `stage_changed` (leads and deals, optionally narrowed to arrivals at one stage via `triggerConfig.toStage`), `record_deleted`. `time_based` is listed but disabled — scheduled runs need a background scheduler the API does not run.
- **Status is not Stage**: leads and deals carry a `status` enum *and* a pipeline `stageId`, and they move independently — the Kanban board only ever changes the stage. A rule watching `status` will not fire when a card is dragged. The builder shows this warning on the field itself, and any saved rule that watches `status` carries it on its card.
- **Actions**: `create_task`, `assign_record`, `update_field` (whitelisted fields only), `move_stage`, `notify_user`, `webhook` (POST, 5s timeout), `send_email` (nodemailer; skipped with a reason unless `SMTP_USER` / `SMTP_PASS` are set). `send_whatsapp` is disabled — no provider is connected.
- **Templating**: action text supports `{{label}}` for the record's name and `{{anyField}}` for its values.
- **UI Elements & Interactive Buttons**:
  - **How-it-works strip**: three-step explanation of trigger → conditions → actions.
  - **Recipe cards**: four one-click templates that pre-fill the builder.
  - **Guided builder**: numbered steps, per-action config forms generated from the vocabulary, and a live plain-English summary of the rule.
  - **Workflow cards**: plain-English description, run count, last run, and warnings when a rule uses a trigger or action this deployment cannot run.
  - **`Runs` Button**: expands the run history — a "Waiting for: …" line stating in plain English what must happen for the rule to fire, then every execution with its status, the record that triggered it, per-action detail, and the reason a skipped run was skipped. Executions are only recorded once the trigger matches, so a rule watching the wrong thing shows no rows at all.
  - **`Test against a real record` Button** (`POST /workflows/:id/simulate`): dry run against the most recent matching record showing which conditions hold and what would run. Executes nothing.
  - **`Active` / `Paused` Toggle**: paused rules are never dispatched.

---

#### Module 8: Settings & Workspace Administration (`/settings`)
- **Components**: `SettingsClient.tsx`, `RolesPanel.tsx`, `CustomFieldsPanel.tsx`, `ApiKeysPanel.tsx`
- **Tabs & Child Components**:

##### Tab 1: Workspace Profile (`SettingsClient.tsx`)
- **UI Controls**:
  - `Company Name` input field.
  - `Brand Color` color picker widget.
  - `Currency` dropdown selector (INR, USD, EUR, GBP).
  - `Timezone` dropdown selector.
  - `Save Settings` Button: Persists workspace configuration.

##### Tab 2: Team Members (`SettingsClient.tsx`)
- **UI Controls**:
  - **Members Table**: Displays member avatar, full name, email, role badge, status badge (`Active`/`Invited`/`Suspended`), and last login date.
  - **`Invite Member` Button** (Wrapped in `<Can I="users.create">`): Opens modal to send invite with Email, First Name, Last Name, and assigned Role.
  - **`Change Role` Dropdown**: Select new role for member.
  - **`Suspend / Activate` Button**: Toggles user account status.
  - **`Delete User` Button** (Wrapped in `<Can I="users.delete">`): Permanently removes user account.

##### Tab 3: Roles & Permissions Matrix (`RolesPanel.tsx`)
- **UI Controls**:
  - **Roles Selector List**: Select role (`Owner`, `Admin`, `Manager`, `Sales Rep`, `Viewer`) or click `+ Create Custom Role`.
  - **Permission Checkboxes Grid**: Resource-by-action checkboxes matrix (Contacts, Companies, Leads, Deals, Tasks, Activities, Reports, Users, Roles, Settings, API Keys).
  - **Data Scope Selector**: Radio buttons (`OWN`, `TEAM`, `DEPARTMENT`, `COMPANY`).
  - **`Save Role Permissions` Button** (Only accessible to `Owner`).

##### Tab 4: Custom Fields Builder (`CustomFieldsPanel.tsx`)
- **UI Controls**:
  - **Entity Selector Tabs**: `Contacts`, `Companies`, `Leads`, `Deals`.
  - **`+ Add Custom Field` Button**: Opens field creator (Field Label, Field Name, Field Type [Text, Number, Date, Dropdown, Checkbox], Required toggle).
  - **`Delete Custom Field` Button**: Deletes custom column from entity records.

##### Tab 5: API Keys for Integrations (`ApiKeysPanel.tsx`)
- **UI Controls**:
  - **API Keys Table**: Displays Key Name, Key Prefix (e.g. `crm_live_8f...`), Created Date, Last Used Date, and Scopes.
  - **`+ Generate New API Key` Button** (Only accessible to `Owner`): Generates key and presents raw key string in copyable modal.
  - **`Revoke Key` Button**: Immediately deactivates target API key.

---

#### Module 9: Platform Administration Portal (`/admin`)
- **Components**: `page.tsx`, `AdminShell.tsx`, `CustomerDetailClient.tsx`
- **Access Scope**: Restricted exclusively to `PlatformAdmin` credentials (`santhosh@envisiontechsol.in`).
- **UI Elements & Action Buttons**:
  - **Platform Summary Metrics Cards**: Total Workspaces, Active Customers, Monthly Recurring Revenue, Total Platform Users.
  - **Tenants Management Table**:
    - Columns: Workspace Name, Slug, Plan, Status, Created Date, Users Count.
    - **`Impersonate` Button**: Opens target customer workspace in impersonation mode.
    - **`Suspend / Reactivate Tenant` Toggle Button**: Suspends or enables target tenant workspace.
    - **`View Details` Button**: Opens tenant detail page showing features enabled, domain mappings, and audit logs.
  - **`+ Create Platform Admin` Script**: Command-line utility (`pnpm admin:create`).

---

## 4. Comprehensive Role-to-Component Action Mapping Matrix

| Component / Feature | Action / Button | Platform Admin | Owner | Admin | Manager | Sales Rep | Viewer |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Global Navigation** | Sidebar `/admin` Link | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Global Search** | Topbar Search Bar | ❌ | ✅ (All) | ✅ (All) | ✅ (All) | ✅ (Own) | ✅ (All) |
| **Leads Page** | `+ Add Lead` Button | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Leads Page** | Move Kanban Stage | ❌ | ✅ | ✅ | ✅ | ✅ (Own) | ❌ |
| **Leads Page** | `Delete Lead` Button | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Leads Page** | `Export CSV` Button | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Deals Page** | `+ New Deal` Button | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Deals Page** | `Mark Won` / `Mark Lost` | ❌ | ✅ | ✅ | ✅ | ✅ (Own) | ❌ |
| **Contacts Page** | `+ Add Contact` Button | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Contacts Page** | `Delete Contact` Button | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Tasks Page** | Status Checkbox Toggle | ❌ | ✅ | ✅ | ✅ | ✅ (Own) | ❌ |
| **Settings Page** | Workspace Profile Edit | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Settings Page** | `Invite Member` Button | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Settings Page** | `Delete User` Button | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Settings Page** | Edit RBAC Role Matrix | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Settings Page** | `+ Add Custom Field` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Settings Page** | `Generate API Key` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Admin Portal** | `Impersonate Workspace` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Admin Portal** | `Suspend Tenant` Toggle | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 5. System Execution & Management Commands

### Database Reset & Clean Admin Provisioning
Wipes all database records and seeds `santhosh@envisiontechsol.in` with `pass: santhosh@2003` as Platform Admin and Workspace Admin.
```bash
# Executed inside apps/api
node src/platform/reset-database.cjs
```

### RBAC Matrix Synchronization
Updates permission definitions across all existing tenant workspaces.
```bash
pnpm --filter @crm/api rbac:sync
```

### Create Standalone Platform Admin
Script for creating new platform administration accounts.
```bash
pnpm --filter @crm/api admin:create -- admin@envisiontechsol.in password123
```
