import { SidebarNav } from '../components/SidebarNav';
import { Topbar } from '../components/Topbar';

export function DashboardLayout({ activePage, onSelectPage, children }) {
  return (
    <div className="app-shell">
      <SidebarNav activePage={activePage} onSelectPage={onSelectPage} />
      <div className="main-shell">
        <Topbar />
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
