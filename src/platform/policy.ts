export const API_ORIGIN = 'https://rocket-math-4kg.pages.dev';

// Only bundled same-origin API calls may carry the locally stored session.
export function apiTarget(input: string, origin: string): string | null {
  const url = new URL(input, origin);
  if (url.origin !== origin || !url.pathname.startsWith('/api/') || url.username || url.password) return null;
  return API_ORIGIN + url.pathname + url.search;
}

export class BackStack {
  private handlers: { handler: () => boolean; priority: number }[] = [];
  add(handler: () => boolean, priority: number) {
    const entry = { handler, priority };
    this.handlers.push(entry);
    return () => { this.handlers = this.handlers.filter(item => item !== entry); };
  }
  dispatch(): boolean {
    return [...this.handlers].sort((a, b) => b.priority - a.priority).some(entry => entry.handler());
  }
}
