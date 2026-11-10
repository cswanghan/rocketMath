// Origins the installed shell uses. The website is same-origin and does not need this.
export const NATIVE_SHELL_ORIGINS = ['capacitor://localhost', 'ionic://localhost'] as const;

export function nativeCorsHeaders(origin: string | null): Record<string, string> | null {
  if (!origin || !(NATIVE_SHELL_ORIGINS as readonly string[]).includes(origin)) return null;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    Vary: 'Origin',
  };
}
