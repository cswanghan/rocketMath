import type { Database, PagesHandler } from '../../../src/server-types';
import { appleErrorResponse, appleJSON, appleRequestBody, createAppleChallenge,
  requireAppleSignInConfig, type AppleSignInEnvironment } from '../../../src/apple-sign-in';

interface Env extends AppleSignInEnvironment { DB: Database; JWT_SECRET?: string }

export const onRequestPost: PagesHandler<Env> = async ({ request, env }) => {
  try {
    await requireAppleSignInConfig(env);
    if (!env.JWT_SECRET) throw new Error('session configuration unavailable');
    const body = await appleRequestBody(request);
    return appleJSON(await createAppleChallenge(env.DB, typeof body.nonceHash === 'string' ? body.nonceHash : ''));
  } catch (error) { return appleErrorResponse(error); }
};
