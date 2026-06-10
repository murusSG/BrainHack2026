import { screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '../../src/App';
import { theme } from '../../src/theme';

// Stub heavy page bodies so routing is what we assert, not their internals.
vi.mock('../../src/pages/PublicDashboardPage', () => ({
  PublicDashboardPage: () => <div>public dashboard body</div>,
}));
vi.mock('../../src/layouts/DashboardLayout', () => ({
  DashboardLayout: ({ children }) => <div>ops shell{children}</div>,
}));
vi.mock('../../src/pages/OverviewPage', () => ({ OverviewPage: () => <div>overview body</div> }));
vi.mock('../../src/pages/LoginPage', () => ({
  LoginPage: () => <div>Log in to continue</div>,
}));
vi.mock('../../src/pages/SignUpPage', () => ({
  SignUpPage: () => <div>Create your account</div>,
}));

function renderAt(route, props = {}) {
  const base = { session: null, restoring: false, onAuthenticate: vi.fn(), onSignOut: vi.fn() };
  return render(
    <MantineProvider theme={theme} defaultColorScheme="light">
      <MemoryRouter initialEntries={[route]}>
        <AppRoutes {...base} {...props} />
      </MemoryRouter>
    </MantineProvider>
  );
}

describe('AppRoutes', () => {
  it('renders the HomePage at / without redirecting', () => {
    renderAt('/');
    expect(screen.getByText(/One picture of the crisis/i)).toBeInTheDocument();
  });

  it('renders the SignUpPage at /signup', async () => {
    renderAt('/signup');
    expect(await screen.findByText('Create your account')).toBeInTheDocument();
  });

  it('redirects /public-dashboard to /login when unauthenticated', async () => {
    renderAt('/public-dashboard');
    expect(await screen.findByText('Log in to continue')).toBeInTheDocument();
  });

  it('shows the public dashboard when a session exists', async () => {
    renderAt('/public-dashboard', { session: { identity: 'a@b.com', role: 'public', token: 't' } });
    expect(await screen.findByText('public dashboard body')).toBeInTheDocument();
  });

  it('renders the ops overview at /overview for a leader', async () => {
    renderAt('/overview', { session: { identity: 'l@b.com', role: 'leader', token: 't' } });
    expect(await screen.findByText('overview body')).toBeInTheDocument();
  });
});
