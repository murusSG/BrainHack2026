import { SidebarNav } from '../components/SidebarNav';
import { Topbar } from '../components/Topbar';

export function DashboardLayout({ children, session, onSignOut }) {
  return (
    <div className="app-shell">
      <SidebarNav />
      <div className="main-shell">
        <Topbar session={session} onSignOut={onSignOut} />
        <main className="main-content">{children}</main>
        <footer className="command-footer" aria-label="Command workspace status">
          <span>MURUS SG Command Network</span>
          <span>Canonical event model</span>
          <span>Human approval required</span>
          <span className="footer-live">Live feeds monitored</span>
        </footer>
      </div>
    </div>
  );
}
