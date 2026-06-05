import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { getSession, signOut } from './services/auth';
import { AlertsPage } from './pages/AlertsPage';
import { DashboardLayout } from './layouts/DashboardLayout';
import { HospitalsPage } from './pages/HospitalsPage';
import { IncidentMapPage } from './pages/IncidentMapPage';
import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { PublicDashboardPage } from './pages/PublicDashboardPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { ResidentPage } from './pages/ResidentPage';
import { ResponderPage } from './pages/ResponderPage';
import { SystemFlowPage } from './pages/SystemFlowPage';

function CommandShell({ page, session, onSignOut }) {
  const pages = {
    overview: <OverviewPage />,
    'incident-map': <IncidentMapPage />,
    resources: <ResourcesPage />,
    hospitals: <HospitalsPage />,
    alerts: <AlertsPage />,
    'system-flow': <SystemFlowPage />,
  };

  return (
    <DashboardLayout activePage={page} session={session} onSignOut={onSignOut}>
      {pages[page]}
    </DashboardLayout>
  );
}

function ProtectedCommandShell({ page, session, onSignOut, restoring }) {
  const location = useLocation();

  if (restoring) return null;

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <CommandShell page={page} session={session} onSignOut={onSignOut} />;
}

function LoginRoute({ onAuthenticate }) {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  return (
    <LoginPage
      onAuthenticate={(session) => {
        onAuthenticate(session);
        navigate(from, { replace: true });
      }}
      onOpenPublicDashboard={() => navigate('/public-dashboard')}
    />
  );
}

function PublicDashboardRoute({ session }) {
  const navigate = useNavigate();

  return <PublicDashboardPage onReturnToOps={() => navigate(session ? '/' : '/login')} />;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    getSession()
      .then((restored) => {
        if (restored) setSession(restored);
      })
      .finally(() => setRestoring(false));
  }, []);

  async function handleSignOut() {
    await signOut();
    setSession(null);
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginRoute onAuthenticate={setSession} />} />
        <Route path="/public-dashboard" element={<PublicDashboardRoute session={session} />} />
        <Route path="/resident" element={<ResidentPage />} />
        <Route path="/responder" element={<ResponderPage />} />

        <Route path="/" element={<ProtectedCommandShell page="overview" session={session} onSignOut={handleSignOut} restoring={restoring} />} />
        <Route
          path="/incident-map"
          element={<ProtectedCommandShell page="incident-map" session={session} onSignOut={handleSignOut} restoring={restoring} />}
        />
        <Route
          path="/resources"
          element={<ProtectedCommandShell page="resources" session={session} onSignOut={handleSignOut} restoring={restoring} />}
        />
        <Route
          path="/hospitals"
          element={<ProtectedCommandShell page="hospitals" session={session} onSignOut={handleSignOut} restoring={restoring} />}
        />
        <Route path="/alerts" element={<ProtectedCommandShell page="alerts" session={session} onSignOut={handleSignOut} restoring={restoring} />} />
        <Route
          path="/system-flow"
          element={<ProtectedCommandShell page="system-flow" session={session} onSignOut={handleSignOut} restoring={restoring} />}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
