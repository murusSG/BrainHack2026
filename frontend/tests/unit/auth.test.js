import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Fake Supabase client whose methods we assert against.
const mockAuth = {
  signUp: vi.fn(),
  signInWithOAuth: vi.fn(),
};
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: mockAuth }),
}));
// /auth/me lookup — default to a public profile.
vi.mock('../../src/services/api', () => ({
  api: { authedGet: vi.fn().mockResolvedValue({ role: 'public' }) },
}));

async function loadAuth() {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
  vi.resetModules();
  return import('../../src/services/auth');
}

beforeEach(() => {
  mockAuth.signUp.mockReset();
  mockAuth.signInWithOAuth.mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('signUp', () => {
  it('passes full_name and phone as metadata and returns the session shape', async () => {
    mockAuth.signUp.mockResolvedValue({
      data: { user: { email: 'a@b.com' }, session: { access_token: 'tok' } },
      error: null,
    });
    const { signUp } = await loadAuth();

    const session = await signUp('Tan Wei Ming', '91234567', 'a@b.com', 'secret123');

    expect(mockAuth.signUp).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'secret123',
      options: { data: { full_name: 'Tan Wei Ming', phone: '91234567' } },
    });
    expect(session).toEqual({ identity: 'a@b.com', role: 'public', token: 'tok' });
  });

  it('throws when Supabase returns an error', async () => {
    mockAuth.signUp.mockResolvedValue({ data: {}, error: { message: 'User already registered' } });
    const { signUp } = await loadAuth();
    await expect(signUp('A', '91234567', 'a@b.com', 'secret123')).rejects.toThrow(
      'User already registered'
    );
  });
});

describe('signInWithGoogle', () => {
  it('calls signInWithOAuth with the google provider and a redirect', async () => {
    mockAuth.signInWithOAuth.mockResolvedValue({ data: {}, error: null });
    const { signInWithGoogle } = await loadAuth();

    await signInWithGoogle();

    expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: expect.any(String) },
    });
  });
});
