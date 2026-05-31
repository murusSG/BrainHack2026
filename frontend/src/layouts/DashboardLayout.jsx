import { SidebarNav } from '../components/SidebarNav';
import { Topbar } from '../components/Topbar';

export function DashboardLayout({ children }) {
  return (
    <div className="app-shell">
      <SidebarNav />
      <div className="main-shell">
        <Topbar />
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
