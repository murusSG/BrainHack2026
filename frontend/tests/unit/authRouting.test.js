import { describe, expect, it } from 'vitest';
import { resolvePostLoginPath } from '../../src/lib/authRouting';

describe('resolvePostLoginPath', () => {
  it('sends public users to the public dashboard', () => {
    expect(resolvePostLoginPath('public')).toBe('/public-dashboard');
  });

  it('sends leaders and responders to the ops overview', () => {
    expect(resolvePostLoginPath('leader')).toBe('/overview');
    expect(resolvePostLoginPath('responder')).toBe('/overview');
  });

  it('honors an explicit "from" path when provided', () => {
    expect(resolvePostLoginPath('leader', '/resources')).toBe('/resources');
  });

  it('ignores "from" when it points at an auth page', () => {
    expect(resolvePostLoginPath('public', '/login')).toBe('/public-dashboard');
    expect(resolvePostLoginPath('public', '/signup')).toBe('/public-dashboard');
  });
});
