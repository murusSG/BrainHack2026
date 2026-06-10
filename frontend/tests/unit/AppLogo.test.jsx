import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppLogo } from '../../src/components/AppLogo';

describe('AppLogo', () => {
  it('renders the supplied brand image with the requested size variant', () => {
    render(<AppLogo variant="sidebar" />);

    const logo = screen.getByRole('img', { name: 'MURUS SG' });
    expect(logo).toHaveClass('app-logo', 'app-logo--sidebar');
    expect(logo).toHaveAttribute('draggable', 'false');
    expect(logo.getAttribute('src')).toContain('logo.jpg');
  });
});
