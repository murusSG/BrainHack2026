import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../renderWithProviders';
import { HomePage } from '../../src/pages/HomePage';

describe('HomePage', () => {
  it('renders the headline and the three feature cards', () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText(/One picture of the crisis/i)).toBeInTheDocument();
    expect(screen.getByText('Live Incident Map')).toBeInTheDocument();
    expect(screen.getByText('Foresight Engine')).toBeInTheDocument();
    expect(screen.getByText('Public Advisories')).toBeInTheDocument();
  });

  it('links Log In to /login and Sign Up to /signup', () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByRole('link', { name: 'Log In' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Sign Up' })).toHaveAttribute('href', '/signup');
  });
});
