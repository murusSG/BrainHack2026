import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../renderWithProviders';
import { LoginPage } from '../../src/pages/LoginPage';
import { signIn, signInWithGoogle } from '../../src/services/auth';

vi.mock('../../src/services/auth', () => ({
  signIn: vi.fn(),
  signInWithGoogle: vi.fn(),
}));

afterEach(() => vi.clearAllMocks());

describe('LoginPage', () => {
  it('no longer shows the Open Public Dashboard button', () => {
    renderWithProviders(<LoginPage onAuthenticate={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Open Public Dashboard/i })).toBeNull();
  });

  it('shows a Create an account link to /signup', () => {
    renderWithProviders(<LoginPage onAuthenticate={vi.fn()} />);
    expect(screen.getByRole('link', { name: /Create an account/i })).toHaveAttribute('href', '/signup');
  });

  it('triggers Google login', async () => {
    signInWithGoogle.mockResolvedValue();
    const user = userEvent.setup();
    renderWithProviders(<LoginPage onAuthenticate={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Continue with Google/i }));
    expect(signInWithGoogle).toHaveBeenCalled();
  });
});
