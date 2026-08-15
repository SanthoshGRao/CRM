export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  status: LeadStatus;
  value: number;
  assignedTo: string;
  createdAt: string;
  notes?: string;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  status: 'active' | 'inactive';
  lastActivity: string;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  industry: string;
  website: string;
  phone: string;
  email: string;
  city: string;
  country: string;
  employees: number;
  annualRevenue: number;
  createdAt: string;
}

export interface Deal {
  id: string;
  name: string;
  company: string;
  contactName: string;
  stage: 'discovery' | 'proposal' | 'negotiation' | 'won' | 'lost';
  value: number;
  probability: number;
  expectedCloseDate: string;
  assignedTo: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed';
  assignedTo: string;
  relatedTo?: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  title: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'status_change';
  user: string;
  timestamp: string;
}

export interface TenantSettings {
  companyName: string;
  brandColor: string;
  currency: string;
  timezone: string;
  emailNotifications: boolean;
}
