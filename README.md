# CRM Platform

A professional, multi-tenant CRM platform built with Next.js, NestJS, PostgreSQL, and Redis.

## Quick Start

### Prerequisites
- Node.js >= 20
- pnpm >= 9
- Docker Desktop

### 1. Clone and install
```bash
pnpm install
```

### 2. Start infrastructure
```bash
docker compose -f docker/docker-compose.dev.yml up -d
```

### 3. Set up environment
```bash
# Copy and fill in the API env
cp apps/api/.env.example apps/api/.env

# Copy and fill in the web env  
cp apps/web/.env.example apps/web/.env.local
```

### 4. Run database migrations
```bash
pnpm db:migrate
```

### 5. Start the development servers
```bash
pnpm dev
```

This starts:
- **API**: http://localhost:4000
- **Web**: http://localhost:3000
- **Swagger docs**: http://localhost:4000/api/docs
- **MinIO console**: http://localhost:9001

---

## Project Structure

```
crm-platform/
├── apps/
│   ├── api/        # NestJS backend API
│   ├── web/        # Next.js frontend
│   └── worker/     # BullMQ background worker
├── packages/
│   ├── types/      # Shared TypeScript types
│   ├── config/     # Shared TS/ESLint configs
│   └── ui/         # Shared UI components
├── prisma/         # Database schema and migrations
└── docker/         # Docker Compose configs
```

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 + TypeScript + Tailwind CSS |
| Backend | NestJS + TypeScript |
| Database | PostgreSQL 16 + Prisma ORM |
| Cache | Redis 7 |
| Auth | JWT + Argon2id + HttpOnly Cookies |
| Storage | S3-compatible (MinIO for dev) |
| Monorepo | Turborepo + pnpm workspaces |

## Development Phases

See [Implementation Plan](./crm_implementation_plan.md) for the full 15-phase roadmap.

### Current Status: Phase 1 — Foundation ✓
- [x] Monorepo setup (Turborepo + pnpm)
- [x] NestJS API skeleton with all modules
- [x] Next.js frontend with design system
- [x] Prisma schema (all tables)
- [x] Auth system (JWT + refresh tokens)
- [x] Docker Compose for local dev
- [x] Shared TypeScript types

### Next: Phase 2 — Authentication
Run migrations and start implementing the full auth flow.

## Architecture Notes

- **Multi-tenancy**: Every record has `tenant_id`. Backend derives it from JWT — never from client.
- **RBAC**: Permissions checked via `@RequirePermission()` guard on every protected route.
- **Security**: Argon2id passwords, HttpOnly cookies, rate limiting, input validation.
- **No hardcoded data**: Pipelines, fields, and roles are fully configurable per tenant.
