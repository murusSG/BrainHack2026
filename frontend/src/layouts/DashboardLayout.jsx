import { SidebarNav } from '../components/SidebarNav';
import { Topbar } from '../components/Topbar';

export function DashboardLayout({
  activePage,
  currentRole,
  identity,
  onOpenPublicDashboard,
  onSelectPage,
  onSignOut,
  children
}) {
  return (
    <div className="app-shell">
      <SidebarNav activePage={activePage} onSelectPage={onSelectPage} />
      <div className="main-shell">
        <Topbar
          currentRole={currentRole}
          identity={identity}
          onOpenPublicDashboard={onOpenPublicDashboard}
          onSignOut={onSignOut}
        />
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
