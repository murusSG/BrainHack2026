// Decides where to send a user after authentication.
// - An explicit `from` (a page they were bounced off) wins, unless it is an auth page.
// - Otherwise: public users land on the public dashboard, staff on the ops overview.
const AUTH_PATHS = new Set(['/login', '/signup']);

export function resolvePostLoginPath(role, from) {
  if (from && !AUTH_PATHS.has(from)) return from;
  return role === 'public' ? '/public-dashboard' : '/overview';
}
