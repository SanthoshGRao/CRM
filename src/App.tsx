import React, { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { DashboardView } from './components/dashboard/DashboardView';
import { LeadsView } from './components/leads/LeadsView';
import { ContactsView } from './components/contacts/ContactsView';
import { CompaniesView } from './components/companies/CompaniesView';
import { DealsView } from './components/deals/DealsView';
import { TasksView } from './components/tasks/TasksView';
import { SettingsView } from './components/settings/SettingsView';

export function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);

  const getTitle = () => {
    switch (currentTab) {
      case 'dashboard': return 'Dashboard Overview';
      case 'leads': return 'Leads & Opportunities';
      case 'contacts': return 'Contacts Directory';
      case 'companies': return 'Companies & Accounts';
      case 'deals': return 'Deals Pipeline';
      case 'tasks': return 'Task Checklist';
      case 'settings': return 'System Settings';
      default: return 'CRM Platform';
    }
  };

  const handleOpenAddLead = () => {
    setCurrentTab('leads');
    setIsAddLeadModalOpen(true);
  };

  return (
    <div className="app-shell">
      {/* Navigation Sidebar */}
      <Sidebar currentTab={currentTab} onTabChange={(tab) => setCurrentTab(tab)} />

      {/* Main Content View */}
      <div className="main-layout">
        <Topbar
          title={getTitle()}
          searchQuery={searchQuery}
          onSearchChange={(q) => setSearchQuery(q)}
        />

        <main className="page-content">
          {currentTab === 'dashboard' && (
            <DashboardView
              onNavigate={(tab) => setCurrentTab(tab)}
              onOpenAddLeadModal={handleOpenAddLead}
            />
          )}

          {currentTab === 'leads' && (
            <LeadsView
              searchQuery={searchQuery}
              isAddModalOpen={isAddLeadModalOpen}
              onCloseAddModal={() => setIsAddLeadModalOpen(false)}
            />
          )}

          {currentTab === 'contacts' && <ContactsView searchQuery={searchQuery} />}

          {currentTab === 'companies' && <CompaniesView />}

          {currentTab === 'deals' && <DealsView />}

          {currentTab === 'tasks' && <TasksView />}

          {currentTab === 'settings' && <SettingsView />}
        </main>
      </div>
    </div>
  );
}

export default App;
