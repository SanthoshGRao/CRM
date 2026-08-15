import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { ImpersonationBanner } from '@/components/layout/ImpersonationBanner';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="app-shell">
        <Sidebar />
        <div className="main-content">
          <ImpersonationBanner />
          <Topbar />
          {children}
        </div>
      </div>
    </AuthGuard>
  );
}
