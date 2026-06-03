import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AlertsPage } from './pages/AlertsPage';
import { DashboardLayout } from './layouts/DashboardLayout';
import { HospitalsPage } from './pages/HospitalsPage';
import { IncidentMapPage } from './pages/IncidentMapPage';
import { OverviewPage } from './pages/OverviewPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { ResidentPage } from './pages/ResidentPage';
import { ResponderPage } from './pages/ResponderPage';
import { SystemFlowPage } from './pages/SystemFlowPage';

// Wraps the command dashboard pages in the existing sidebar layout
function CommandShell({ page }) {
  const pages = {
    overview: <OverviewPage />,
    'incident-map': <IncidentMapPage />,
    resources: <ResourcesPage />,
    hospitals: <HospitalsPage />,
    alerts: <AlertsPage />,
    'system-flow': <SystemFlowPage />,
  };
  return <DashboardLayout activePage={page}>{pages[page]}</DashboardLayout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Resident view — standalone, mobile-first, no command sidebar */}
        <Route path="/resident" element={<ResidentPage />} />
        <Route path="/responder" element={<ResponderPage />} />

        {/* Command (leader) views — wrapped in the dashboard sidebar */}
        <Route path="/" element={<CommandShell page="overview" />} />
        <Route path="/incident-map" element={<CommandShell page="incident-map" />} />
        <Route path="/resources" element={<CommandShell page="resources" />} />
        <Route path="/hospitals" element={<CommandShell page="hospitals" />} />
        <Route path="/alerts" element={<CommandShell page="alerts" />} />
        <Route path="/system-flow" element={<CommandShell page="system-flow" />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
