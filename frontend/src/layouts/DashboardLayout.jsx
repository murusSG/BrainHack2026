import { SidebarNav } from '../components/SidebarNav';
import { Topbar } from '../components/Topbar';

export function DashboardLayout({ children }) {
  return (
    <div className="app-shell">
      <SidebarNav />
      <div className="main-shell">
        <Topbar />
        <main className="main-content">{children}</main>
        <footer className="command-footer">
          <span>2024 MURUS SG COMMAND</span>
          <span>Agency transparency: 99.9%</span>
          <span>Secure protocol: v4.2.1-prod</span>
          <span className="footer-live">API: latency 14ms</span>
          <span className="footer-live">Database: primary</span>
        </footer>
      </div>
    </div>
  );
}
