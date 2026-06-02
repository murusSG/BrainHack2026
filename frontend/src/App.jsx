import { useState } from 'react';
import { AlertsPage } from './pages/AlertsPage';
import { DashboardLayout } from './layouts/DashboardLayout';
import { HospitalsPage } from './pages/HospitalsPage';
import { IncidentMapPage } from './pages/IncidentMapPage';
import { OverviewPage } from './pages/OverviewPage';
import { ResourcesPage } from './pages/ResourcesPage';

export default function App() {
  const [activePage, setActivePage] = useState('overview');

  let pageContent = <OverviewPage />;

  if (activePage === 'incident-map') {
    pageContent = <IncidentMapPage />;
  } else if (activePage === 'resources') {
    pageContent = <ResourcesPage />;
  } else if (activePage === 'hospitals') {
    pageContent = <HospitalsPage />;
  } else if (activePage === 'alerts') {
    pageContent = <AlertsPage />;
  }

  return (
    <DashboardLayout activePage={activePage} onSelectPage={setActivePage}>
      {pageContent}
    </DashboardLayout>
  );
}
