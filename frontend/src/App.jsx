import { useState } from 'react';
import { AlertsPage } from './pages/AlertsPage';
import { DashboardLayout } from './layouts/DashboardLayout';
import { HospitalsPage } from './pages/HospitalsPage';
import { IncidentMapPage } from './pages/IncidentMapPage';
import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { PublicDashboardPage } from './pages/PublicDashboardPage';
import { ResourcesPage } from './pages/ResourcesPage';

export default function App() {
  const [activeView, setActiveView] = useState('login');
  const [activePage, setActivePage] = useState('overview');
  const [session, setSession] = useState(null);

  function handleAuthenticate(nextSession) {
    setSession(nextSession);
    setActivePage('overview');
    setActiveView('ops');
  }

  function handleSignOut() {
    setSession(null);
    setActivePage('overview');
    setActiveView('login');
  }

  function handleOpenPublicDashboard() {
    setActiveView('public-dashboard');
  }

  function handleReturnFromPublicDashboard() {
    if (session) {
      setActiveView('ops');
      return;
    }

    setActiveView('login');
  }

  if (activeView === 'login') {
    return <LoginPage onAuthenticate={handleAuthenticate} />;
  }

  if (activeView === 'public-dashboard') {
    return <PublicDashboardPage onReturnToOps={handleReturnFromPublicDashboard} />;
  }

  let pageContent = <OverviewPage onOpenPublicDashboard={handleOpenPublicDashboard} />;

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
    <DashboardLayout
      activePage={activePage}
      currentRole={session?.role}
      identity={session?.identity}
      onOpenPublicDashboard={handleOpenPublicDashboard}
      onSelectPage={setActivePage}
      onSignOut={handleSignOut}
    >
      {pageContent}
    </DashboardLayout>
  );
}
