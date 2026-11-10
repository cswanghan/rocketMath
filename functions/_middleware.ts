// Lets the Capacitor shell call /api from capacitor://localhost.
// Browser visitors are same-origin and do not receive these headers.
import { nativeCorsHeaders } from '../src/cors';

export const onRequest: PagesFunction = async (context) => {
  const origin = context.request.headers.get('Origin');
  const cors = nativeCorsHeaders(origin);
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors ?? { Vary: 'Origin' } });
  }
  const response = await context.next();
  if (!cors) return response;
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(cors)) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
};
