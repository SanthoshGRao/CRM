import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { ImpersonationBanner } from '@/components/layout/ImpersonationBanner';
import { TrialBanner } from '@/components/layout/TrialBanner';
import { PreferencesSync } from '@/components/layout/PreferencesSync';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PaywallGate } from '@/components/billing/PaywallGate';

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <PaywallGate>
        <PreferencesSync />
        <div className="app-shell">
          <Sidebar />
          <div className="main-content">
            <ImpersonationBanner />
            <TrialBanner />
            <Topbar />
            {children}
          </div>
        </div>
      </PaywallGate>
    </AuthGuard>
  );
}
