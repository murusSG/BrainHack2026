import { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { resolvePostLoginPath } from './lib/authRouting';
import { AppPage } from './components/visuals';
import { HomePage } from './pages/HomePage';

function lazyNamed(loader, exportName) {
  return lazy(() => loader().then((module) => ({ default: module[exportName] })));
}

const AlertsPage = lazyNamed(() => import('./pages/AlertsPage'), 'AlertsPage');
const DashboardLayout = lazyNamed(() => import('./layouts/DashboardLayout'), 'DashboardLayout');
const HospitalsPage = lazyNamed(() => import('./pages/HospitalsPage'), 'HospitalsPage');
const IncidentMapPage = lazyNamed(() => import('./pages/IncidentMapPage'), 'IncidentMapPage');
const LoginPage = lazyNamed(() => import('./pages/LoginPage'), 'LoginPage');
const SignUpPage = lazyNamed(() => import('./pages/SignUpPage'), 'SignUpPage');
const OverviewPage = lazyNamed(() => import('./pages/OverviewPage'), 'OverviewPage');
const PublicDashboardPage = lazyNamed(
  () => import('./pages/PublicDashboardPage'),
  'PublicDashboardPage'
);
const DispatcherPage = lazyNamed(() => import('./pages/DispatcherPage'), 'DispatcherPage');
const ResourcesPage = lazyNamed(() => import('./pages/ResourcesPage'), 'ResourcesPage');
const ResidentPage = lazyNamed(() => import('./pages/ResidentPage'), 'ResidentPage');
const ResponderPage = lazyNamed(() => import('./pages/ResponderPage'), 'ResponderPage');
const SystemFlowPage = lazyNamed(() => import('./pages/SystemFlowPage'), 'SystemFlowPage');

function RouteLoadingFallback() {
  return (
    <AppPage mode="standalone" page="loading">
      <div className="route-loading-shell">
        <div className="route-loading-card">
          <p className="eyebrow">Loading workspace</p>
          <h1>Preparing the latest operational view</h1>
        </div>
      </div>
    </AppPage>
  );
}

function StandalonePage({ children, page }) {
  return (
    <AppPage mode="standalone" page={page}>
      {children}
    </AppPage>
  );
}

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
      <AppPage mode="standalone" page="loading">
        <div className="route-loading-shell">
          <div className="route-loading-card">
            <p className="eyebrow">Restoring session</p>
            <h1>Loading command workspace</h1>
            <p className="hero-copy">Checking your access and preparing the latest operational view.</p>
          </div>
        </div>
      </AppPage>
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

// Landing route for OAuth (e.g. Google) redirects. supabase-js parses the token
// from the URL hash and App's getSession() restores the session; once that
// finishes we route by role, exactly like the manual login/signup flows.
function AuthCallbackRoute({ session, restoring }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (restoring) return;
    navigate(session ? resolvePostLoginPath(session.role) : '/login', { replace: true });
  }, [session, restoring, navigate]);

  return (
    <AppPage mode="standalone" page="loading">
      <div className="route-loading-shell">
        <div className="route-loading-card">
          <p className="eyebrow">Signing you in</p>
          <h1>Completing sign-in</h1>
          <p className="hero-copy">Verifying your account and preparing your dashboard.</p>
        </div>
      </div>
    </AppPage>
  );
}

function ProtectedPublicDashboard({ session, restoring }) {
  const location = useLocation();
  const navigate = useNavigate();
  if (restoring) return null;
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return (
    <StandalonePage page="public">
      <PublicDashboardPage
        onReturnToOps={() => navigate(session.role === 'public' ? '/' : '/overview')}
      />
    </StandalonePage>
  );
}

function ProtectedDispatcherRoute({ session, restoring }) {
  const location = useLocation();
  if (restoring) {
    return (
      <AppPage mode="standalone" page="loading">
        <div className="route-loading-shell">
          <div className="route-loading-card">
            <p className="eyebrow">Restoring session</p>
            <h1>Loading dispatcher workspace</h1>
            <p className="hero-copy">Checking your access and preparing the review queue.</p>
          </div>
        </div>
      </AppPage>
    );
  }
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return (
    <StandalonePage page="dispatcher">
      <DispatcherPage session={session} />
    </StandalonePage>
  );
}

export function AppRoutes({ session, restoring, onAuthenticate, onSignOut }) {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        <Route
          path="/"
          element={
            <StandalonePage page="landing">
              <HomePage />
            </StandalonePage>
          }
        />
        <Route
          path="/login"
          element={
            <StandalonePage page="login">
              <LoginRoute onAuthenticate={onAuthenticate} />
            </StandalonePage>
          }
        />
        <Route
          path="/signup"
          element={
            <StandalonePage page="signup">
              <SignUpRoute onAuthenticate={onAuthenticate} />
            </StandalonePage>
          }
        />
        <Route path="/auth/callback" element={<AuthCallbackRoute session={session} restoring={restoring} />} />
        <Route path="/public-dashboard" element={<ProtectedPublicDashboard session={session} restoring={restoring} />} />
        <Route
          path="/resident"
          element={
            <StandalonePage page="resident">
              <ResidentPage />
            </StandalonePage>
          }
        />
        <Route
          path="/responder"
          element={
            <StandalonePage page="responder">
              <ResponderPage />
            </StandalonePage>
          }
        />
        <Route path="/dispatcher" element={<ProtectedDispatcherRoute session={session} restoring={restoring} />} />

        <Route path="/overview" element={<ProtectedCommandShell page="overview" session={session} onSignOut={onSignOut} restoring={restoring} />} />
        <Route path="/incident-map" element={<ProtectedCommandShell page="incident-map" session={session} onSignOut={onSignOut} restoring={restoring} />} />
        <Route path="/resources" element={<ProtectedCommandShell page="resources" session={session} onSignOut={onSignOut} restoring={restoring} />} />
        <Route path="/hospitals" element={<ProtectedCommandShell page="hospitals" session={session} onSignOut={onSignOut} restoring={restoring} />} />
        <Route path="/alerts" element={<ProtectedCommandShell page="alerts" session={session} onSignOut={onSignOut} restoring={restoring} />} />
        <Route path="/system-flow" element={<ProtectedCommandShell page="system-flow" session={session} onSignOut={onSignOut} restoring={restoring} />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    const sessionRoutes = [
      '/auth/callback',
      '/public-dashboard',
      '/dispatcher',
      '/overview',
      '/incident-map',
      '/resources',
      '/hospitals',
      '/alerts',
      '/system-flow',
    ];
    const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
    if (!sessionRoutes.includes(currentPath)) {
      setRestoring(false);
      return undefined;
    }

    let cancelled = false;
    const restoreTimeout = window.setTimeout(() => {
      setRestoring(false);
    }, 2500);

    import('./services/auth')
      .then(({ getSession }) => getSession())
      .then((restored) => {
        if (!cancelled && restored) setSession(restored);
      })
      .catch((error) => {
        console.error('[auth] Session restore failed:', error);
      })
      .finally(() => {
        if (!cancelled) setRestoring(false);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(restoreTimeout);
    };
  }, []);

  async function handleSignOut() {
    const { signOut } = await import('./services/auth');
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
