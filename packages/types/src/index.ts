// ─────────────────────────────────────────────────────────────
// Base API Response types
// ─────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// ─────────────────────────────────────────────────────────────
// Auth Types
// ─────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: AuthUser;
  tenant: Tenant;
  /** Role names, not full role records. */
  roles: string[];
  permissions: string[];
  dataScope?: string;
  billing: SubscriptionSummary;
  /** Present only while platform staff are working inside the workspace. */
  impersonation?: { by: string; adminId: string };
}

export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing';

export type EntitlementReason =
  | 'ok'
  | 'no_subscription'
  | 'trial_expired'
  | 'period_expired'
  | 'past_due'
  | 'cancelled';

export interface PlanSummary {
  id: string;
  name: string;
  description?: string | null;
  price: string | number;
  currency: string;
  interval: string;
  features?: Record<string, unknown>;
  /** Seat ceiling for this plan tier; null means unlimited. */
  maxUsers?: number | null;
}

export interface SubscriptionSummary {
  plan: PlanSummary | null;
  status: SubscriptionStatus | null;
  currentPeriodEnd: string | null;
  isEntitled: boolean;
  entitlementReason: EntitlementReason;
  daysLeft: number;
  /** Seats paid for on the plan. Null when there's no subscription at all. */
  seats: number | null;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  companyName: string;
}

// ─────────────────────────────────────────────────────────────
// Tenant Types
// ─────────────────────────────────────────────────────────────

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  primaryColor?: string;
  status: TenantStatus;
  plan?: string;
  createdAt: string;
  updatedAt: string;
  settings?: Partial<TenantSettings> | null;
}

export type TenantStatus = 'active' | 'suspended' | 'pending' | 'cancelled';

export interface TenantSettings {
  id: string;
  tenantId: string;
  timezone: string;
  locale: string;
  dateFormat: string;
  currency: string;
  brandColor?: string;
  logoUrl?: string;
  emailFooter?: string;
}

export interface TenantFeature {
  feature: string;
  enabled: boolean;
}

// ─────────────────────────────────────────────────────────────
// User Types
// ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatarUrl?: string;
  phone?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  roles?: Role[];
}

// ─────────────────────────────────────────────────────────────
// RBAC Types
// ─────────────────────────────────────────────────────────────

export interface Role {
  id: string;
  tenantId?: string;
  name: string;
  description?: string;
  isSystem: boolean;
  permissions?: Permission[];
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  scope?: DataScope;
  description?: string;
}

export type DataScope = 'OWN' | 'TEAM' | 'DEPARTMENT' | 'COMPANY' | 'ALL';

// ─────────────────────────────────────────────────────────────
// Contact Types
// ─────────────────────────────────────────────────────────────

export interface Contact {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
  phone?: string;
  mobile?: string;
  companyId?: string;
  company?: Company;
  ownerId?: string;
  owner?: User;
  status: ContactStatus;
  tags?: string[];
  avatarUrl?: string;
  lastActivityAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type ContactStatus = 'active' | 'inactive' | 'blocked';

// ─────────────────────────────────────────────────────────────
// Company Types
// ─────────────────────────────────────────────────────────────

export interface Company {
  id: string;
  tenantId: string;
  name: string;
  industry?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  employees?: number;
  annualRevenue?: number;
  ownerId?: string;
  owner?: User;
  status: CompanyStatus;
  createdAt: string;
  updatedAt: string;
}

export type CompanyStatus = 'active' | 'inactive';

// ─────────────────────────────────────────────────────────────
// Lead Types
// ─────────────────────────────────────────────────────────────

export interface Lead {
  id: string;
  tenantId: string;
  title: string;
  contactId?: string;
  contact?: Contact;
  companyId?: string;
  company?: Company;
  pipelineId: string;
  pipeline?: Pipeline;
  stageId: string;
  stage?: PipelineStage;
  ownerId?: string;
  owner?: User;
  source?: LeadSource;
  status: LeadStatus;
  value?: number;
  probability?: number;
  expectedCloseDate?: string;
  lastActivityAt?: string;
  /** Set once the lead has been converted; a lead converts at most once. */
  convertedAt?: string;
  convertedDealId?: string;
  convertedDeal?: Deal;
  createdAt: string;
  updatedAt: string;
}

export type LeadStatus = 'new' | 'working' | 'qualified' | 'unqualified' | 'converted' | 'lost';
export type LeadSource =
  | 'website'
  | 'referral'
  | 'cold_call'
  | 'email'
  | 'social'
  | 'advertisement'
  | 'event'
  | 'other';

// ─────────────────────────────────────────────────────────────
// Deal Types
// ─────────────────────────────────────────────────────────────

export interface Deal {
  id: string;
  tenantId: string;
  name: string;
  contactId?: string;
  contact?: Contact;
  companyId?: string;
  company?: Company;
  pipelineId: string;
  pipeline?: Pipeline;
  stageId: string;
  stage?: PipelineStage;
  ownerId?: string;
  owner?: User;
  value: number;
  probability: number;
  expectedCloseDate?: string;
  status: DealStatus;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type DealStatus = 'open' | 'won' | 'lost';

// ─────────────────────────────────────────────────────────────
// Pipeline Types
// ─────────────────────────────────────────────────────────────

export interface Pipeline {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  entityType: PipelineEntityType;
  isDefault: boolean;
  stages?: PipelineStage[];
  createdAt: string;
  updatedAt: string;
}

export type PipelineEntityType = 'lead' | 'deal';

export interface PipelineStage {
  id: string;
  pipelineId: string;
  name: string;
  color: string;
  probability: number;
  displayOrder: number;
  isWon: boolean;
  isLost: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────
// Task Types
// ─────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  assignedToId?: string;
  assignedTo?: User;
  createdById: string;
  createdBy?: User;
  dueDate?: string;
  priority: TaskPriority;
  status: TaskStatus;
  relatedType?: RelatedEntityType;
  relatedId?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

// ─────────────────────────────────────────────────────────────
// Activity Types
// ─────────────────────────────────────────────────────────────

export interface Activity {
  id: string;
  tenantId: string;
  type: ActivityType;
  title: string;
  description?: string;
  performedById: string;
  performedBy?: User;
  relatedType: RelatedEntityType;
  relatedId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type ActivityType =
  | 'call'
  | 'email'
  | 'whatsapp'
  | 'sms'
  | 'meeting'
  | 'note'
  | 'task_created'
  | 'task_completed'
  | 'status_changed'
  | 'stage_changed'
  | 'assigned'
  | 'record_created'
  | 'record_updated'
  | 'record_deleted';

export type RelatedEntityType = 'contact' | 'company' | 'lead' | 'deal' | 'task';

// ─────────────────────────────────────────────────────────────
// Custom Field Types
// ─────────────────────────────────────────────────────────────

export interface CustomField {
  id: string;
  tenantId: string;
  entityType: RelatedEntityType;
  fieldName: string;
  label: string;
  fieldType: CustomFieldType;
  required: boolean;
  defaultValue?: string;
  displayOrder: number;
  options?: CustomFieldOption[];
  createdAt: string;
  updatedAt: string;
}

export type CustomFieldType =
  | 'text'
  | 'long_text'
  | 'number'
  | 'currency'
  | 'percentage'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'dropdown'
  | 'multi_select'
  | 'phone'
  | 'email'
  | 'url'
  | 'file'
  | 'user';

export interface CustomFieldOption {
  id: string;
  customFieldId: string;
  label: string;
  value: string;
  displayOrder: number;
}

export interface CustomFieldValue {
  id: string;
  tenantId: string;
  fieldId: string;
  entityType: RelatedEntityType;
  entityId: string;
  value: string | null;
}

// ─────────────────────────────────────────────────────────────
// Notification Types
// ─────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// Dashboard Types
// ─────────────────────────────────────────────────────────────

export interface DashboardKpis {
  totalLeads: number;
  newLeads: number;
  qualifiedLeads: number;
  openDeals: number;
  wonDeals: number;
  totalRevenue: number;
  conversionRate: number;
  tasksDueToday: number;
  activitiesThisWeek: number;
}

// ─────────────────────────────────────────────────────────────
// Audit Log Types
// ─────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  tenantId: string;
  userId: string;
  user?: User;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// Query / Filter Types
// ─────────────────────────────────────────────────────────────

export interface ListQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'starts_with'
  | 'ends_with'
  | 'in'
  | 'not_in'
  | 'is_null'
  | 'is_not_null';

// ─────────────────────────────────────────────────────────────
// Workflow Types
// ─────────────────────────────────────────────────────────────

export interface Workflow {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isActive: boolean;
  triggerType: WorkflowTriggerType;
  triggerConfig: Record<string, unknown>;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  createdAt: string;
  updatedAt: string;
}

export type WorkflowTriggerType =
  | 'record_created'
  | 'record_updated'
  | 'record_deleted'
  | 'field_changed'
  | 'stage_changed'
  | 'time_based';

export interface WorkflowCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: unknown;
}

export interface WorkflowAction {
  id: string;
  type: WorkflowActionType;
  config: Record<string, unknown>;
  displayOrder: number;
}

export type WorkflowActionType =
  | 'assign_record'
  | 'create_task'
  | 'send_email'
  | 'send_whatsapp'
  | 'update_field'
  | 'move_stage'
  | 'notify_user'
  | 'webhook';
