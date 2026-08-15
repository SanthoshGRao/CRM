import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { appConfig } from './common/config/app.config';
import { PrismaModule } from './common/prisma/prisma.module';
import { StorageModule } from './common/storage/storage.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';
import { RolesModule } from './roles/roles.module';
import { ContactsModule } from './contacts/contacts.module';
import { CompaniesModule } from './companies/companies.module';
import { LeadsModule } from './leads/leads.module';
import { DealsModule } from './deals/deals.module';
import { PipelinesModule } from './pipelines/pipelines.module';
import { TasksModule } from './tasks/tasks.module';
import { ActivitiesModule } from './activities/activities.module';
import { CustomFieldsModule } from './custom-fields/custom-fields.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { PlatformModule } from './platform/platform.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { DataModule } from './data/data.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AuditModule } from './audit/audit.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // ── Config ──────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // ── Rate Limiting ─────────────────────────────────────────
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 20,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 100,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 500,
      },
    ]),

    // ── Core Infrastructure ───────────────────────────────────
    PrismaModule,
    StorageModule,
    HealthModule,
    AuditModule,

    // ── Domain Modules ────────────────────────────────────────
    AuthModule,
    UsersModule,
    TenantsModule,
    RolesModule,
    ContactsModule,
    CompaniesModule,
    LeadsModule,
    DealsModule,
    PipelinesModule,
    TasksModule,
    ActivitiesModule,
    CustomFieldsModule,
    WorkflowsModule,
    PlatformModule,
    ApiKeysModule,
    DataModule,
    DashboardModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
