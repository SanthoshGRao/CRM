# Multi-Tenant CRM Platform — Complete Implementation Plan

## 1. Project Overview

Build a professional, web-based, multi-tenant CRM platform that can be used as a base CRM for multiple client companies.

The platform should allow the service provider to:

- Create and manage client companies
- Provision a CRM for each company
- Configure fields, pipelines, workflows, roles, permissions, branding, and integrations
- Keep every company's data strictly isolated
- Add new CRM features without rebuilding the application for every client
- Support future AI, WhatsApp, calling, automation, billing, and white-label capabilities

The core principle is:

> The code defines what the CRM can do. Tenant configuration defines how each company's CRM behaves.

---

# 2. Architecture

```text
                         CRM PLATFORM
                              |
        ------------------------------------------------
        |                      |                       |
    FRONTEND                BACKEND                 SERVICES
        |                      |                       |
   Next.js / React         NestJS / Node.js        Redis
   TypeScript              TypeScript              BullMQ
   Tailwind CSS            PostgreSQL              Storage
   shadcn/ui               Prisma                  Email
   TanStack Query          REST API                WhatsApp
   Zustand                 Auth                    Calling
                              |
                         AI / Automation
```

## Recommended Stack

| Component | Technology |
|---|---|
| Frontend | Next.js + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Client State | Zustand |
| Server State | TanStack Query |
| Backend | NestJS + TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Cache | Redis |
| Background Jobs | BullMQ |
| Authentication | JWT + Refresh Tokens |
| Password Hashing | Argon2id |
| Storage | S3-compatible object storage |
| API Documentation | Swagger/OpenAPI |
| Validation | class-validator / Zod |
| Testing | Jest + Playwright |
| Deployment | Docker |
| Reverse Proxy | Nginx |
| Monitoring | Sentry + structured logging |

---

# 3. Product Structure

The system should consist of two major areas:

```text
CRM Platform
│
├── Platform Admin
│
└── Client CRM
    │
    ├── Company A
    ├── Company B
    ├── Company C
    └── Company D
```

## Platform Admin

Used by the service provider.

Features:

- Client companies
- Client users
- CRM templates
- Plans and subscriptions
- Feature flags
- Usage
- Billing
- Integrations
- System configuration
- Audit logs
- System health

## Client CRM

Used by each client company.

Features:

- Dashboard
- Leads
- Contacts
- Companies
- Deals
- Tasks
- Activities
- Calendar
- Communications
- Reports
- Automation
- Users
- Teams
- Settings

---

# 4. Multi-Tenant Architecture

Each client company is a tenant.

Example:

```text
Tenant 1
ABC Realty

Tenant 2
XYZ Finance

Tenant 3
PQR Education
```

Every business record must contain a `tenant_id`.

Example:

```text
leads
--------------------------------
id
tenant_id
name
phone
email
status
assigned_to
created_at
updated_at
```

## Critical Rule

Never trust a `tenant_id` supplied by the frontend.

The backend must derive the tenant from the authenticated session.

Request flow:

```text
User
  ↓
Session
  ↓
Authenticated User
  ↓
Tenant Context
  ↓
Permissions
  ↓
Resource
```

The database should also use PostgreSQL Row Level Security where appropriate for an additional tenant-isolation layer.

---

# 5. Frontend Architecture

Use Next.js App Router with TypeScript.

```text
frontend/
│
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   ├── reset-password/
│   │   ├── verify-email/
│   │   └── verify-otp/
│   │
│   ├── dashboard/
│   ├── leads/
│   ├── contacts/
│   ├── companies/
│   ├── deals/
│   ├── activities/
│   ├── tasks/
│   ├── calendar/
│   ├── communications/
│   ├── reports/
│   ├── automation/
│   │
│   ├── settings/
│   │   ├── profile/
│   │   ├── company/
│   │   ├── users/
│   │   ├── roles/
│   │   ├── teams/
│   │   ├── custom-fields/
│   │   ├── pipelines/
│   │   ├── integrations/
│   │   └── security/
│   │
│   └── admin/
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── tables/
│   ├── forms/
│   ├── modals/
│   ├── charts/
│   └── crm/
│
├── features/
│   ├── auth/
│   ├── leads/
│   ├── contacts/
│   ├── companies/
│   ├── deals/
│   ├── tasks/
│   ├── reports/
│   └── automation/
│
├── lib/
│   ├── api/
│   ├── auth/
│   ├── permissions/
│   └── utils/
│
├── stores/
│
└── types/
```

---

# 6. Professional UI Requirements

The CRM should have a clean enterprise SaaS design.

## Design Principles

- No emojis
- No unnecessary gradients
- No excessive animations
- No decorative elements that reduce usability
- Consistent spacing
- Clear typography
- Compact professional tables
- Strong visual hierarchy
- Accessible colors
- Responsive layout
- Desktop-first but responsive
- Consistent buttons and form controls
- Clear empty states
- Proper loading states
- Proper error states
- Confirmation dialogs for destructive operations

## Layout

```text
┌─────────────────────────────────────────────────────────────┐
│ Logo                  Search                 User Profile    │
├───────────────┬─────────────────────────────────────────────┤
│               │                                             │
│ Dashboard     │ Dashboard                                   │
│               │                                             │
│ Leads         │ KPI Cards                                   │
│ Contacts      │                                             │
│ Companies     │ Sales Pipeline                              │
│ Deals         │                                             │
│ Tasks         │ Recent Activities                           │
│ Calendar      │                                             │
│               │                                             │
│ Reports       │                                             │
│ Automation    │                                             │
│               │                                             │
│ Settings      │                                             │
└───────────────┴─────────────────────────────────────────────┘
```

---

# 7. Authentication

Authentication should support:

- Email/password login
- Registration
- Email verification
- Forgot password
- Reset password
- Change password
- Logout
- Logout all devices
- Session management
- Optional phone OTP
- Optional Google OAuth
- Optional Microsoft OAuth
- Future enterprise SSO

---

# 8. Authentication Token Architecture

Use:

```text
Short-lived Access Token
+
Long-lived Refresh Token
```

Recommended:

```text
Access Token: 10–15 minutes
Refresh Token: 7–30 days
```

Store refresh tokens securely.

Prefer:

```text
HttpOnly
Secure
SameSite
```

cookies.

Avoid storing long-lived authentication tokens in `localStorage`.

---

# 9. Login Flow

```text
User
  ↓
Email + Password
  ↓
POST /api/v1/auth/login
  ↓
Validate credentials
  ↓
Check account status
  ↓
Resolve tenant
  ↓
Resolve roles and permissions
  ↓
Generate access token
  ↓
Generate refresh token
  ↓
Set secure cookies
  ↓
Return session information
```

Then:

```text
GET /api/v1/auth/me
```

returns:

```json
{
  "user": {},
  "tenant": {},
  "roles": [],
  "permissions": []
}
```

---

# 10. Registration Flow

```text
Register
   ↓
Create Tenant
   ↓
Create User
   ↓
Create Owner Role
   ↓
Assign User as Tenant Owner
   ↓
Create Default Settings
   ↓
Create Default Pipeline
   ↓
Create Default Dashboard
   ↓
Send Verification Email
   ↓
User enters CRM
```

---

# 11. Password Security

Use Argon2id or bcrypt.

Recommended:

```text
Argon2id
```

Never store plaintext passwords.

Implement:

- Password hashing
- Password reset tokens
- Email verification tokens
- Login rate limiting
- Failed login tracking
- Account lockout where appropriate
- Session revocation
- Refresh token rotation

---

# 12. Database Architecture

## Tenant

```text
tenants
tenant_settings
tenant_features
tenant_domains
```

## Authentication

```text
users
sessions
refresh_tokens
password_resets
email_verifications
```

## Authorization

```text
roles
permissions
role_permissions
user_roles
```

## Organization

```text
teams
departments
team_members
```

## CRM

```text
contacts
companies
leads
deals
pipelines
pipeline_stages
activities
tasks
notes
meetings
calls
emails
```

## Communication

```text
conversations
messages
message_attachments
```

## Configuration

```text
custom_fields
custom_field_options
custom_field_values
saved_views
```

## Automation

```text
workflows
workflow_triggers
workflow_conditions
workflow_actions
workflow_executions
```

## Platform

```text
plans
subscriptions
usage
invoices
payments
```

## Security

```text
audit_logs
security_events
```

---

# 13. Core CRM Modules

The initial CRM should contain:

1. Contacts
2. Companies
3. Leads
4. Deals
5. Pipelines
6. Tasks
7. Activities
8. Notes
9. Calendar
10. Dashboard
11. Reports

---

# 14. Contacts

Contact table:

```text
Name
Phone
Email
Company
Owner
Status
Last Activity
Created
```

Actions:

- Create
- Edit
- Delete
- Search
- Filter
- Sort
- Import
- Export
- Bulk update
- Assign owner
- Add notes
- Create task
- View activity timeline

Contact profile:

```text
Contact Information
Company Information
Owner
Tags
Custom Fields

Activity Timeline
----------------------------
Call
Email
WhatsApp
Note
Task
Meeting
```

---

# 15. Companies

Company records should support:

```text
Company Name
Industry
Website
Phone
Email
Address
Owner
Employees
Revenue
Status
Custom Fields
```

Companies can have multiple contacts and deals.

Relationship:

```text
Company
 ├── Contacts
 ├── Leads
 ├── Deals
 ├── Activities
 └── Documents
```

---

# 16. Leads

Lead fields:

```text
id
tenant_id
contact_id
company_id
pipeline_id
stage_id
owner_id
source
status
value
probability
expected_close_date
created_at
updated_at
```

Views:

- Table
- Kanban
- List
- Saved views

Kanban:

```text
NEW
----------------
Lead A
Lead B

CONTACTED
----------------
Lead C

QUALIFIED
----------------
Lead D

PROPOSAL
----------------
Lead E
```

Allow drag-and-drop between stages.

---

# 17. Deals

Deal fields:

```text
id
tenant_id
name
contact_id
company_id
pipeline_id
stage_id
owner_id
value
probability
expected_close_date
status
```

Pipeline:

```text
New
 ↓
Qualified
 ↓
Proposal
 ↓
Negotiation
 ↓
Won / Lost
```

---

# 18. Tasks

Task fields:

```text
id
tenant_id
title
description
assigned_to
created_by
due_date
priority
status
related_type
related_id
created_at
updated_at
```

Tasks should support:

- Pending
- In progress
- Completed
- Cancelled
- Overdue
- Priority
- Due date
- Assignee
- Related record

---

# 19. Activity Timeline

Every important CRM record should have an activity timeline.

Example:

```text
11 Aug — Call completed
09 Aug — WhatsApp message sent
08 Aug — Follow-up task created
07 Aug — Lead moved to Qualified
05 Aug — Lead created
```

Activity types:

```text
Call
Email
WhatsApp
SMS
Meeting
Note
Task
Status Change
Assignment Change
```

---

# 20. Pipeline Engine

Pipelines must be configurable per tenant.

Example:

```text
Sales Pipeline

New
Contacted
Qualified
Proposal
Negotiation
Won
Lost
```

Pipeline configuration should support:

- Name
- Description
- Stages
- Stage order
- Stage color
- Probability
- Required fields
- Stage-specific automation

Database:

```text
pipelines
pipeline_stages
```

---

# 21. Custom Fields Engine

This is a core feature for a service-provider CRM.

Admins should be able to add fields without changing database schemas.

Supported field types:

```text
Text
Long Text
Number
Currency
Percentage
Date
Date & Time
Boolean
Dropdown
Multi-select
Phone
Email
URL
File
User
```

Example:

```text
Real Estate CRM

Budget              Currency
Property Type       Dropdown
Location            Text
Bedrooms            Number
Expected Purchase   Date
```

---

# 22. Custom Field Architecture

Example:

```text
custom_fields

id
tenant_id
entity_type
field_name
label
field_type
required
default_value
display_order
```

Options:

```text
custom_field_options

id
custom_field_id
label
value
display_order
```

Values:

```text
custom_field_values

id
tenant_id
field_id
entity_type
entity_id
value
```

The frontend dynamically renders these fields.

---

# 23. Saved Views

Users should be able to create saved views.

Examples:

```text
My Leads
High Value Leads
Uncontacted Leads
Website Leads
This Week
Overdue Follow-ups
```

Store:

```text
view_filters
view_columns
view_sorting
view_visibility
```

---

# 24. Search

Global search should search:

```text
Contacts
Companies
Leads
Deals
Tasks
Messages
```

Search:

```text
"Rahul"
```

returns grouped results.

Initially use PostgreSQL full-text search.

For very large deployments, consider OpenSearch/Elasticsearch.

---

# 25. Filtering and Bulk Actions

Every major list should support:

- Search
- Filter
- Sort
- Column selection
- Pagination
- Saved views
- Bulk selection
- Bulk assignment
- Bulk status update
- Bulk delete where permitted
- Export

---

# 26. CSV Import

Import flow:

```text
Upload CSV
   ↓
Read Columns
   ↓
Map Columns
   ↓
Validate
   ↓
Preview
   ↓
Confirm
   ↓
Background Import
   ↓
Import Summary
```

Example:

```text
CSV Column       CRM Field
--------------------------------
Customer Name →  Contact Name
Mobile        →  Phone
Email         →  Email
Company       →  Company
```

Import jobs should run through BullMQ.

---

# 27. CSV Export

Allow exporting:

- Contacts
- Leads
- Companies
- Deals
- Tasks
- Reports

Apply current filters to exports where appropriate.

Large exports should run asynchronously.

---

# 28. Dashboard

Default dashboard widgets:

```text
Total Leads
New Leads
Qualified Leads
Open Deals
Won Deals
Revenue
Conversion Rate
Tasks Due
Activities
```

Charts:

```text
Lead Sources
Sales Funnel
Revenue Trend
Team Performance
Deal Pipeline
Conversion Rate
```

Eventually allow users to:

- Add widgets
- Remove widgets
- Resize widgets
- Reorder widgets
- Save dashboard layouts

---

# 29. Reports

Build a configurable report engine.

Flow:

```text
Select Entity
   ↓
Select Fields
   ↓
Apply Filters
   ↓
Group By
   ↓
Select Visualization
   ↓
Generate Report
```

Example:

```text
Entity: Leads
Filter: Created this month
Group By: Lead Source
Visualization: Bar Chart
```

---

# 30. Notification System

Create a centralized notification service.

Channels:

```text
In-App
Email
Push
```

Events:

```text
New Lead Assigned
Task Due
Task Overdue
Deal Updated
Mention
Workflow Failure
Payment Failure
```

---

# 31. Backend Architecture

Recommended NestJS structure:

```text
backend/
│
├── auth/
├── users/
├── tenants/
├── roles/
├── permissions/
│
├── contacts/
├── companies/
├── leads/
├── deals/
├── pipelines/
├── activities/
├── tasks/
│
├── custom-fields/
├── views/
├── workflows/
│
├── communications/
├── notifications/
├── integrations/
│
├── reports/
├── dashboards/
│
├── billing/
├── audit/
│
├── ai/
│
└── common/
```

Each module should generally contain:

```text
controller
service
DTO
validation
repository/data-access layer
tests
```

---

# 32. REST API

Use `/api/v1`.

Example:

```text
/api/v1/auth
/api/v1/users
/api/v1/tenants
/api/v1/contacts
/api/v1/companies
/api/v1/leads
/api/v1/deals
/api/v1/tasks
/api/v1/activities
/api/v1/pipelines
/api/v1/custom-fields
/api/v1/workflows
/api/v1/reports
/api/v1/integrations
```

---

# 33. CRUD APIs

Leads:

```text
GET    /api/v1/leads
GET    /api/v1/leads/:id
POST   /api/v1/leads
PATCH  /api/v1/leads/:id
DELETE /api/v1/leads/:id
```

Contacts:

```text
GET    /api/v1/contacts
GET    /api/v1/contacts/:id
POST   /api/v1/contacts
PATCH  /api/v1/contacts/:id
DELETE /api/v1/contacts/:id
```

Pipelines:

```text
GET    /api/v1/pipelines
POST   /api/v1/pipelines
PATCH  /api/v1/pipelines/:id
DELETE /api/v1/pipelines/:id
```

---

# 34. API Response Standard

Success:

```json
{
  "success": true,
  "data": {},
  "message": "Lead created successfully"
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "LEAD_NOT_FOUND",
    "message": "Lead not found"
  }
}
```

---

# 35. Pagination

Do not load thousands of records into the browser.

Example:

```text
GET /api/v1/leads?page=1&limit=25
```

Response:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 1240,
    "totalPages": 50
  }
}
```

For very large datasets, use cursor-based pagination.

---

# 36. RBAC

Use role-based access control.

Roles can include:

```text
Platform Admin
Company Owner
Company Admin
Sales Manager
Sales Executive
Support Agent
Marketing User
Custom Roles
```

Permission examples:

```text
leads.view
leads.create
leads.update
leads.delete

contacts.view
contacts.create
contacts.update
contacts.delete

deals.view
deals.create
deals.update
deals.delete

reports.view
reports.create

users.view
users.create
users.update
users.delete
```

---

# 37. Data-Level Permissions

Support:

```text
OWN
TEAM
DEPARTMENT
COMPANY
ALL
```

Example:

```text
Sales Executive
→ Can view own leads

Sales Manager
→ Can view team leads

Company Admin
→ Can view all company leads
```

---

# 38. Audit Logs

Create:

```text
audit_logs
```

Fields:

```text
id
tenant_id
user_id
action
entity_type
entity_id
old_values
new_values
ip_address
user_agent
created_at
```

Track:

```text
LEAD_CREATED
LEAD_UPDATED
LEAD_DELETED
USER_CREATED
ROLE_UPDATED
SETTINGS_CHANGED
LOGIN
LOGOUT
PASSWORD_CHANGED
```

---

# 39. Security

Implement:

```text
HTTPS
JWT
Refresh Token Rotation
HttpOnly Cookies
Secure Cookies
SameSite Cookies
CORS
CSRF protection where applicable
Rate Limiting
Brute Force Protection
Input Validation
SQL Injection Protection
XSS Protection
File Upload Validation
RBAC
Tenant Isolation
Audit Logs
Secret Management
Encryption
```

Security must be implemented from the beginning.

---

# 40. Redis

Use Redis for:

```text
Caching
Rate Limiting
Background Job Queues
Temporary Data
OTP Throttling
Session-related data where required
```

Do not use Redis as the primary database.

---

# 41. Background Jobs

Use BullMQ.

Example:

```text
Lead Created
      ↓
Workflow Queue
      ↓
├── Send Email
├── Send WhatsApp
├── Create Task
└── Notify Manager
```

Other jobs:

```text
CSV Import
Email Sending
WhatsApp Sending
Report Generation
AI Processing
File Processing
Data Synchronization
Scheduled Workflows
```

---

# 42. File Management

Use S3-compatible object storage.

Store files outside PostgreSQL.

Database:

```text
file_id
tenant_id
filename
mime_type
size
storage_key
uploaded_by
created_at
```

Supported files:

```text
PDF
Images
CSV
Documents
Call Recordings
Attachments
```

---

# 43. Communication Layer

Do not directly couple CRM modules to external providers.

Create an abstraction:

```text
Communication Service
        |
        ├── WhatsApp Provider
        ├── Email Provider
        ├── SMS Provider
        └── Voice Provider
```

This allows providers to be changed later.

---

# 44. Unified Inbox

Eventually create:

```text
Inbox
────────────────────────────

WhatsApp
Email
SMS
Calls
```

Example customer conversation:

```text
Customer: Rahul

09:30 — WhatsApp
10:15 — Call
11:00 — Email
14:30 — WhatsApp
```

All communication should be linked to the relevant contact/lead/company.

---

# 45. Workflow Automation

Workflow structure:

```text
WHEN
Lead Created

       ↓

IF
Source = Website

       ↓

THEN
Assign Sales Team

       ↓

AND
Create Follow-up Task

       ↓

AND
Send WhatsApp Template
```

Database:

```text
workflows
workflow_triggers
workflow_conditions
workflow_actions
workflow_executions
```

Workflow engine should execute actions asynchronously where possible.

---

# 46. AI Layer

Keep AI as a separate service/module.

```text
AI Service
│
├── AI Assistant
├── AI Search
├── Lead Scoring
├── Conversation Summary
├── Email Generation
├── Follow-up Suggestions
├── Next Best Action
├── Report Analysis
└── Workflow Generation
```

AI should interact with controlled CRM APIs/tools rather than direct database access.

Example:

```text
User:
"Find high-value leads that haven't been contacted this week."

       ↓

AI Assistant

       ↓

CRM Search Tool

       ↓

Filtered Leads

       ↓

AI Response
```

---

# 47. AI Automation

Possible AI features:

### Lead Scoring

```text
Lead
 ↓
AI Analysis
 ↓
Score: 87/100
 ↓
High Probability
```

### Conversation Summary

```text
Call Recording
 ↓
Speech-to-Text
 ↓
AI Summary
 ↓
CRM Activity
```

### Next Best Action

```text
Customer requested pricing
        ↓
AI Recommendation
        ↓
Follow up tomorrow
        ↓
Create Task
```

---

# 48. Billing

For SaaS/service-provider use:

```text
plans
subscriptions
usage
invoices
payments
```

Example:

```text
Starter
Professional
Enterprise
```

Features can be controlled by:

```text
tenant_features
```

Example:

```text
tenant_id | feature       | enabled
------------------------------------
101       | whatsapp      | true
101       | ai            | false
101       | calling       | true
101       | automation    | true
```

---

# 49. White Labeling

Support:

```text
Company Name
Logo
Primary Color
Secondary Color
Favicon
Login Branding
Email Branding
Custom Domain
```

Example:

```text
crm.yourcompany.com
```

could eventually support:

```text
crm.clientcompany.com
```

while using the same backend/platform.

---

# 50. CRM Template System

This is one of the most important platform features.

Templates:

```text
Generic Sales CRM
Real Estate CRM
Education CRM
Finance CRM
Recruitment CRM
SaaS CRM
```

Each template can define:

```text
Custom Fields
Pipelines
Stages
Roles
Permissions
Dashboard
Workflows
Lead Sources
Default Views
```

Onboarding:

```text
Create Tenant
      ↓
Select CRM Template
      ↓
Clone Configuration
      ↓
Customize
      ↓
Invite Users
      ↓
CRM Ready
```

---

# 51. Platform Admin

Route:

```text
/admin
```

Sections:

```text
Dashboard
Companies
Users
Subscriptions
Plans
Templates
Integrations
Feature Flags
System Logs
Audit Logs
System Health
```

Company detail page:

```text
ABC Company

Status: Active
Plan: Professional
Users: 42
Storage: 12 GB
Leads: 24,812

Features
[x] CRM
[x] WhatsApp
[x] Automation
[x] Reports
[ ] AI
```

---

# 52. Deployment Architecture

Production:

```text
                    Cloud / VPS
                        |
                      Nginx
                        |
              -------------------
              |                 |
          Frontend            API
          Next.js            NestJS
                                |
                    -----------------------
                    |          |          |
                PostgreSQL   Redis      Storage
                              |
                           BullMQ
```

Use Docker for development and deployment.

---

# 53. Environments

Maintain separate:

```text
Development
Staging
Production
```

Never develop directly against production.

Example:

```text
dev.crm.yourcompany.com
staging.crm.yourcompany.com
crm.yourcompany.com
```

---

# 54. Monorepo Structure

Recommended:

```text
crm-platform/
│
├── apps/
│   ├── web/
│   ├── api/
│   └── worker/
│
├── packages/
│   ├── ui/
│   ├── types/
│   ├── config/
│   ├── validation/
│   └── utils/
│
├── prisma/
│
├── docker/
│
└── docs/
```

---

# 55. Testing Strategy

## Backend

```text
Unit Tests
Integration Tests
API Tests
Database Tests
Permission Tests
Tenant Isolation Tests
```

## Frontend

```text
Component Tests
Form Tests
Permission UI Tests
Page Tests
```

## E2E

Use Playwright.

Important flows:

```text
Register
Login
Create Company
Create Lead
Edit Lead
Move Lead
Create Deal
Create Task
Invite User
Change Role
Import CSV
Create Workflow
Send Communication
Logout
```

---

# 56. Critical Security Tests

Test these specifically:

```text
User A cannot access Tenant B

User cannot access restricted records

Client Admin cannot access Platform Admin

Expired access tokens are rejected

Refresh token rotation works

Revoked sessions cannot authenticate

Deleted users cannot access CRM

Disabled tenants cannot access CRM

Unauthorized APIs return 403

Cross-tenant resource IDs cannot be accessed
```

---

# 57. Monitoring

Production should have:

```text
Application Logs
Error Tracking
API Latency
Database Monitoring
Redis Monitoring
Queue Monitoring
Failed Jobs
Authentication Failures
```

System health page:

```text
API              Healthy
Database         Healthy
Redis            Healthy
Queue            Healthy
Storage          Healthy

Failed Jobs      3
Error Rate       0.12%
API Latency      142ms
```

---

# 58. API Documentation

Use Swagger/OpenAPI.

Document:

```text
Authentication
Tenants
Users
Roles
Permissions
Contacts
Companies
Leads
Deals
Tasks
Activities
Pipelines
Custom Fields
Workflows
Reports
Integrations
Billing
```

---

# 59. Development Phases

## Phase 1 — Foundation

```text
Repository
Docker
PostgreSQL
Redis
NestJS
Next.js
Prisma
Environment Configuration
CI/CD
Logging
Error Handling
```

## Phase 2 — Authentication

```text
Registration
Login
Logout
Refresh Tokens
Email Verification
Forgot Password
Reset Password
Change Password
Session Management
```

## Phase 3 — Multi-Tenancy

```text
Tenants
Tenant Settings
Tenant Middleware
Tenant Isolation
Company Onboarding
Tenant Context
```

## Phase 4 — RBAC

```text
Users
Roles
Permissions
Teams
Departments
Data Access
```

## Phase 5 — Core CRM

```text
Contacts
Companies
Leads
Deals
Activities
Tasks
Notes
Pipelines
```

## Phase 6 — CRM UX

```text
Tables
Filters
Search
Sorting
Kanban
Bulk Actions
Import
Export
Saved Views
Timeline
```

## Phase 7 — Configuration Engine

```text
Custom Fields
Custom Statuses
Custom Pipelines
Custom Views
Feature Flags
```

## Phase 8 — Dashboard and Reports

```text
Dashboard
Widgets
Charts
Reports
Filters
Exports
```

## Phase 9 — Automation

```text
Triggers
Conditions
Actions
Queues
Scheduled Jobs
Workflow History
```

## Phase 10 — Communication

```text
Email
WhatsApp
SMS
Calling
Unified Inbox
Conversation History
```

## Phase 11 — Integrations

```text
WhatsApp
Telephony
Email
Google
Microsoft
Webhooks
External CRM APIs
```

## Phase 12 — AI

```text
AI Assistant
AI Search
Lead Scoring
Conversation Summaries
Recommendations
AI Email Generation
AI Workflow Builder
```

## Phase 13 — Platform

```text
Platform Admin
Plans
Billing
Usage
White Labeling
Custom Domains
CRM Templates
Feature Management
```

---

# 60. MVP Scope

Do not implement everything in the first version.

The first production-capable MVP should contain:

```text
Authentication
        ↓
Multi-Tenancy
        ↓
Users + Roles
        ↓
Contacts
        ↓
Companies
        ↓
Leads
        ↓
Deals
        ↓
Tasks
        ↓
Activities
        ↓
Pipelines
        ↓
Dashboard
        ↓
Custom Fields
        ↓
Audit Logs
```

Then expand:

```text
MVP
 ↓
Automation
 ↓
Communication
 ↓
Reports
 ↓
Integrations
 ↓
AI
 ↓
White Labeling
 ↓
Billing
```

---

# 61. Final Architecture

```text
                           YOUR CRM PLATFORM
                                  |
                  ┌───────────────┴────────────────┐
                  │                                │
            PLATFORM ADMIN                    CLIENT CRM
                  │                                │
       ┌──────────┼──────────┐           ┌─────────┴─────────┐
       │          │          │           │                   │
   Companies   Templates   Billing      CRM ENGINE        CONFIGURATION
                                            │                   │
                              ┌─────────────┼─────────────┐     │
                              │             │             │     │
                           Leads        Contacts        Deals   │
                              │             │             │     │
                           Tasks         Activities     Pipeline│
                              │             │             │     │
                              └─────────────┼─────────────┘     │
                                            │                   │
                                      COMMUNICATION        Custom Fields
                                            │              Workflows
                                  ┌─────────┼─────────┐    Permissions
                                  │         │         │
                               WhatsApp   Email     Calling
                                            │
                                      AUTOMATION
                                            │
                                           AI
```

---

# 62. Core Architectural Rules

The development team should follow these rules throughout the project:

1. Build the application as multi-tenant from day one.
2. Never trust tenant identifiers from the frontend.
3. Enforce authorization on the backend for every protected resource.
4. Keep platform-admin functionality separate from client functionality.
5. Keep CRM business logic separate from communication providers.
6. Keep AI isolated behind controlled services/tools.
7. Use configuration instead of hardcoding client-specific CRM behavior.
8. Use background jobs for expensive or asynchronous operations.
9. Never store files directly in PostgreSQL.
10. Never store plaintext passwords.
11. Use secure HttpOnly cookies for long-lived authentication sessions.
12. Add audit logging to sensitive operations.
13. Write tenant-isolation and permission tests before onboarding real clients.
14. Build CRM templates so new clients can be provisioned quickly.
15. Keep frontend, API, worker, and shared packages modular.
16. Maintain development, staging, and production environments separately.
17. Document every API using OpenAPI/Swagger.
18. Design the database for extensibility before building advanced UI.
19. Do not tightly couple the CRM to one WhatsApp, email, or telephony provider.
20. Treat security and tenant isolation as platform-level requirements, not optional features.

---

# 63. Recommended Build Order

The practical implementation order should be:

```text
1. Repository + Monorepo
        ↓
2. Docker + Local Infrastructure
        ↓
3. PostgreSQL + Prisma
        ↓
4. NestJS Backend Foundation
        ↓
5. Next.js Frontend Foundation
        ↓
6. Authentication
        ↓
7. Tenant System
        ↓
8. RBAC
        ↓
9. Users + Teams
        ↓
10. Contacts
        ↓
11. Companies
        ↓
12. Leads
        ↓
13. Pipelines
        ↓
14. Deals
        ↓
15. Tasks
        ↓
16. Activities + Timeline
        ↓
17. Custom Fields
        ↓
18. Search + Filters + Saved Views
        ↓
19. Dashboard
        ↓
20. Audit Logs
        ↓
21. CSV Import/Export
        ↓
22. Workflow Engine
        ↓
23. Notifications
        ↓
24. Communication Layer
        ↓
25. Reports
        ↓
26. Integrations
        ↓
27. AI Layer
        ↓
28. Billing
        ↓
29. White Labeling
        ↓
30. CRM Templates
        ↓
31. Production Hardening
```

The first milestone should be a secure, multi-tenant CRM with authentication, RBAC, contacts, companies, leads, deals, tasks, activities, pipelines, custom fields, audit logs, and a professional UI. Advanced communication, automation, AI, billing, white-labeling, and templates should be added after the core platform is stable.
