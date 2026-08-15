import { Lead, Contact, Company, Deal, Task, Activity, TenantSettings } from '../types/crm';

const STORAGE_KEYS = {
  LEADS: 'crm_leads_v1',
  CONTACTS: 'crm_contacts_v1',
  COMPANIES: 'crm_companies_v1',
  DEALS: 'crm_deals_v1',
  TASKS: 'crm_tasks_v1',
  ACTIVITIES: 'crm_activities_v1',
  SETTINGS: 'crm_settings_v1',
};

// ─── Initial Seed Data ────────────────────────────────────────────────────────

const INITIAL_LEADS: Lead[] = [];
const INITIAL_CONTACTS: Contact[] = [];
const INITIAL_COMPANIES: Company[] = [];
const INITIAL_DEALS: Deal[] = [];
const INITIAL_TASKS: Task[] = [];
const INITIAL_ACTIVITIES: Activity[] = [];

const INITIAL_SETTINGS: TenantSettings = {
  companyName: 'Envision Techsol',
  brandColor: '#4f46e5',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  emailNotifications: true,
};

// ─── LocalStorage Helper ──────────────────────────────────────────────────────

function getStored<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Error reading ${key} from localStorage`, err);
    return defaultValue;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error writing ${key} to localStorage`, err);
  }
}

// ─── Storage API ─────────────────────────────────────────────────────────────

export const StorageEngine = {
  // Leads
  getLeads(): Lead[] {
    return getStored<Lead[]>(STORAGE_KEYS.LEADS, INITIAL_LEADS);
  },
  saveLeads(leads: Lead[]): void {
    setStored(STORAGE_KEYS.LEADS, leads);
  },
  addLead(lead: Omit<Lead, 'id' | 'createdAt'>): Lead {
    const leads = this.getLeads();
    const newLead: Lead = {
      ...lead,
      id: 'lead-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    leads.unshift(newLead);
    this.saveLeads(leads);
    this.addActivity(`Created new lead ${newLead.name}`, 'status_change');
    return newLead;
  },
  updateLead(id: string, updates: Partial<Lead>): Lead | null {
    const leads = this.getLeads();
    const idx = leads.findIndex((l) => l.id === id);
    if (idx === -1) return null;
    leads[idx] = { ...leads[idx], ...updates };
    this.saveLeads(leads);
    return leads[idx];
  },
  deleteLead(id: string): void {
    const leads = this.getLeads().filter((l) => l.id !== id);
    this.saveLeads(leads);
  },

  // Contacts
  getContacts(): Contact[] {
    return getStored<Contact[]>(STORAGE_KEYS.CONTACTS, INITIAL_CONTACTS);
  },
  saveContacts(contacts: Contact[]): void {
    setStored(STORAGE_KEYS.CONTACTS, contacts);
  },
  addContact(contact: Omit<Contact, 'id' | 'createdAt' | 'lastActivity'>): Contact {
    const contacts = this.getContacts();
    const newContact: Contact = {
      ...contact,
      id: 'contact-' + Date.now(),
      lastActivity: 'Just now',
      createdAt: new Date().toISOString(),
    };
    contacts.unshift(newContact);
    this.saveContacts(contacts);
    this.addActivity(`Added contact ${newContact.firstName} ${newContact.lastName}`, 'note');
    return newContact;
  },
  deleteContact(id: string): void {
    const contacts = this.getContacts().filter((c) => c.id !== id);
    this.saveContacts(contacts);
  },

  // Companies
  getCompanies(): Company[] {
    return getStored<Company[]>(STORAGE_KEYS.COMPANIES, INITIAL_COMPANIES);
  },
  saveCompanies(companies: Company[]): void {
    setStored(STORAGE_KEYS.COMPANIES, companies);
  },
  addCompany(company: Omit<Company, 'id' | 'createdAt'>): Company {
    const companies = this.getCompanies();
    const newComp: Company = {
      ...company,
      id: 'comp-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    companies.unshift(newComp);
    this.saveCompanies(companies);
    return newComp;
  },

  // Deals
  getDeals(): Deal[] {
    return getStored<Deal[]>(STORAGE_KEYS.DEALS, INITIAL_DEALS);
  },
  saveDeals(deals: Deal[]): void {
    setStored(STORAGE_KEYS.DEALS, deals);
  },
  addDeal(deal: Omit<Deal, 'id' | 'createdAt'>): Deal {
    const deals = this.getDeals();
    const newDeal: Deal = {
      ...deal,
      id: 'deal-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    deals.unshift(newDeal);
    this.saveDeals(deals);
    this.addActivity(`Created deal ${newDeal.name}`, 'status_change');
    return newDeal;
  },
  updateDeal(id: string, updates: Partial<Deal>): Deal | null {
    const deals = this.getDeals();
    const idx = deals.findIndex((d) => d.id === id);
    if (idx === -1) return null;
    deals[idx] = { ...deals[idx], ...updates };
    this.saveDeals(deals);
    return deals[idx];
  },

  // Tasks
  getTasks(): Task[] {
    return getStored<Task[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS);
  },
  saveTasks(tasks: Task[]): void {
    setStored(STORAGE_KEYS.TASKS, tasks);
  },
  addTask(task: Omit<Task, 'id' | 'createdAt'>): Task {
    const tasks = this.getTasks();
    const newTask: Task = {
      ...task,
      id: 'task-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    tasks.unshift(newTask);
    this.saveTasks(tasks);
    return newTask;
  },
  toggleTaskStatus(id: string): void {
    const tasks = this.getTasks();
    const task = tasks.find((t) => t.id === id);
    if (task) {
      task.status = task.status === 'completed' ? 'pending' : 'completed';
      this.saveTasks(tasks);
    }
  },

  // Activities
  getActivities(): Activity[] {
    return getStored<Activity[]>(STORAGE_KEYS.ACTIVITIES, INITIAL_ACTIVITIES);
  },
  addActivity(title: string, type: Activity['type'] = 'note'): void {
    const activities = this.getActivities();
    activities.unshift({
      id: 'act-' + Date.now(),
      title,
      type,
      user: 'Santhosh Kumar',
      timestamp: new Date().toISOString(),
    });
    setStored(STORAGE_KEYS.ACTIVITIES, activities.slice(0, 50));
  },

  // Settings
  getSettings(): TenantSettings {
    return getStored<TenantSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  },
  saveSettings(settings: TenantSettings): void {
    setStored(STORAGE_KEYS.SETTINGS, settings);
  },

  // Reset to seed data
  resetAllData(): void {
    localStorage.removeItem(STORAGE_KEYS.LEADS);
    localStorage.removeItem(STORAGE_KEYS.CONTACTS);
    localStorage.removeItem(STORAGE_KEYS.COMPANIES);
    localStorage.removeItem(STORAGE_KEYS.DEALS);
    localStorage.removeItem(STORAGE_KEYS.TASKS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVITIES);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  },

  // Export / Import
  exportBackupJSON(): string {
    const backup = {
      version: 1,
      timestamp: new Date().toISOString(),
      leads: this.getLeads(),
      contacts: this.getContacts(),
      companies: this.getCompanies(),
      deals: this.getDeals(),
      tasks: this.getTasks(),
      activities: this.getActivities(),
      settings: this.getSettings(),
    };
    return JSON.stringify(backup, null, 2);
  },

  importBackupJSON(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.leads) this.saveLeads(data.leads);
      if (data.contacts) this.saveContacts(data.contacts);
      if (data.companies) this.saveCompanies(data.companies);
      if (data.deals) this.saveDeals(data.deals);
      if (data.tasks) this.saveTasks(data.tasks);
      if (data.settings) this.saveSettings(data.settings);
      return true;
    } catch (err) {
      console.error('Failed to import backup JSON', err);
      return false;
    }
  },
};
