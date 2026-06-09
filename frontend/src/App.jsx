import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { getSession, signOut } from './services/auth';
import { resolvePostLoginPath } from './lib/authRouting';
import { AlertsPage } from './pages/AlertsPage';
import { DashboardLayout } from './layouts/DashboardLayout';
import { HomePage } from './pages/HomePage';
import { HospitalsPage } from './pages/HospitalsPage';
import { IncidentMapPage } from './pages/IncidentMapPage';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { OverviewPage } from './pages/OverviewPage';
import { PublicDashboardPage } from './pages/PublicDashboardPage';
import { DispatcherPage } from './pages/DispatcherPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { ResidentPage } from './pages/ResidentPage';
import { ResponderPage } from './pages/ResponderPage';
import { SystemFlowPage } from './pages/SystemFlowPage';

function CommandShell({ page, session, onSignOut }) {
  const pages = {
    overview: <OverviewPage session={session} />,
    'incident-map': <IncidentMapPage />,
    resources: <ResourcesPage />,
    hospitals: <HospitalsPage />,
    alerts: <AlertsPage session={session} />,
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

  if (restoring) {
    return (
      <div className="route-loading-shell">
        <div className="route-loading-card">
          <p className="eyebrow">Restoring session</p>
          <h1>Loading command workspace</h1>
          <p className="hero-copy">Checking your access and preparing the latest operational view.</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <CommandShell page={page} session={session} onSignOut={onSignOut} />;
}

function LoginRoute({ onAuthenticate }) {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;

  return (
    <LoginPage
      onAuthenticate={(session) => {
        onAuthenticate(session);
        navigate(resolvePostLoginPath(session.role, from), { replace: true });
      }}
    />
  );
}

function SignUpRoute({ onAuthenticate }) {
  const navigate = useNavigate();

  return (
    <SignUpPage
      onAuthenticate={(session) => {
        onAuthenticate(session);
        navigate(resolvePostLoginPath(session.role), { replace: true });
      }}
    />
  );
}

function ProtectedPublicDashboard({ session, restoring }) {
  const location = useLocation();
  const navigate = useNavigate();
  if (restoring) return null;
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <PublicDashboardPage onReturnToOps={() => navigate(session.role === 'public' ? '/' : '/overview')} />;
}

function ProtectedDispatcherRoute({ session, restoring }) {
  const location = useLocation();
  if (restoring) {
    return (
      <div className="route-loading-shell">
        <div className="route-loading-card">
          <p className="eyebrow">Restoring session</p>
          <h1>Loading dispatcher workspace</h1>
          <p className="hero-copy">Checking your access and preparing the review queue.</p>
        </div>
      </div>
    );
  }
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <DispatcherPage session={session} />;
}

export function AppRoutes({ session, restoring, onAuthenticate, onSignOut }) {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginRoute onAuthenticate={onAuthenticate} />} />
      <Route path="/signup" element={<SignUpRoute onAuthenticate={onAuthenticate} />} />
      <Route path="/public-dashboard" element={<ProtectedPublicDashboard session={session} restoring={restoring} />} />
      <Route path="/resident" element={<ResidentPage />} />
      <Route path="/responder" element={<ResponderPage />} />
      <Route path="/dispatcher" element={<ProtectedDispatcherRoute session={session} restoring={restoring} />} />

      <Route path="/overview" element={<ProtectedCommandShell page="overview" session={session} onSignOut={onSignOut} restoring={restoring} />} />
      <Route path="/incident-map" element={<ProtectedCommandShell page="incident-map" session={session} onSignOut={onSignOut} restoring={restoring} />} />
      <Route path="/resources" element={<ProtectedCommandShell page="resources" session={session} onSignOut={onSignOut} restoring={restoring} />} />
      <Route path="/hospitals" element={<ProtectedCommandShell page="hospitals" session={session} onSignOut={onSignOut} restoring={restoring} />} />
      <Route path="/alerts" element={<ProtectedCommandShell page="alerts" session={session} onSignOut={onSignOut} restoring={restoring} />} />
      <Route path="/system-flow" element={<ProtectedCommandShell page="system-flow" session={session} onSignOut={onSignOut} restoring={restoring} />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    const restoreTimeout = window.setTimeout(() => {
      setRestoring(false);
    }, 2500);

    getSession()
      .then((restored) => {
        if (restored) setSession(restored);
      })
      .catch((error) => {
        console.error('[auth] Session restore failed:', error);
      })
      .finally(() => setRestoring(false));

    return () => {
      window.clearTimeout(restoreTimeout);
    };
  }, []);

  async function handleSignOut() {
    await signOut();
    setSession(null);
  }

  return (
    <BrowserRouter>
      <AppRoutes
        session={session}
        restoring={restoring}
        onAuthenticate={setSession}
        onSignOut={handleSignOut}
      />
    </BrowserRouter>
  );
}
