import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../renderWithProviders';
import { SignUpPage } from '../../src/pages/SignUpPage';
import { signUp, signInWithGoogle } from '../../src/services/auth';

vi.mock('../../src/services/auth', () => ({
  signUp: vi.fn(),
  signInWithGoogle: vi.fn(),
}));

afterEach(() => vi.clearAllMocks());

function fill(user, { name = 'Tan Wei Ming', email = 'a@b.com', phone = '91234567', pw = 'secret123', confirm = 'secret123' } = {}) {
  return (async () => {
    await user.type(screen.getByLabelText('Full name'), name);
    await user.type(screen.getByLabelText('Email'), email);
    await user.type(screen.getByLabelText('Phone number'), phone);
    await user.type(screen.getByLabelText('Password'), pw);
    await user.type(screen.getByLabelText('Confirm password'), confirm);
  })();
}

describe('SignUpPage', () => {
  it('blocks submit when passwords do not match', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignUpPage onAuthenticate={vi.fn()} />);
    await fill(user, { confirm: 'different' });
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('submits valid input and calls onAuthenticate', async () => {
    signUp.mockResolvedValue({ identity: 'a@b.com', role: 'public', token: 'tok' });
    const onAuthenticate = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<SignUpPage onAuthenticate={onAuthenticate} />);
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => {
      expect(signUp).toHaveBeenCalledWith('Tan Wei Ming', '91234567', 'a@b.com', 'secret123');
      expect(onAuthenticate).toHaveBeenCalledWith({ identity: 'a@b.com', role: 'public', token: 'tok' });
    });
  });

  it('shows the Supabase error when signup fails', async () => {
    signUp.mockRejectedValue(new Error('User already registered'));
    const user = userEvent.setup();
    renderWithProviders(<SignUpPage onAuthenticate={vi.fn()} />);
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('User already registered')).toBeInTheDocument();
  });

  it('triggers Google signup', async () => {
    signInWithGoogle.mockResolvedValue();
    const user = userEvent.setup();
    renderWithProviders(<SignUpPage onAuthenticate={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Continue with Google/i }));
    expect(signInWithGoogle).toHaveBeenCalled();
  });
});
