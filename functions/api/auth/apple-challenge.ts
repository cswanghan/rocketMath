import type { Database, PagesHandler } from '../../../src/server-types';
import { AppleSignInError, appleErrorResponse, appleJSON, appleRequestBody, createAppleChallenge,
  requireAppleSignInConfig, type AppleSignInStage, type AppleSignInEnvironment } from '../../../src/apple-sign-in';

interface Env extends AppleSignInEnvironment { DB: Database; JWT_SECRET?: string }

export const onRequestPost: PagesHandler<Env> = async ({ request, env }) => {
  let stage: AppleSignInStage = 'configuration';
  try {
    await requireAppleSignInConfig(env);
    if (!env.JWT_SECRET) throw new AppleSignInError('apple_unavailable', 503, 'configuration');
    stage = 'request';
    const body = await appleRequestBody(request);
    stage = 'challenge_create';
    return appleJSON(await createAppleChallenge(env.DB, typeof body.nonceHash === 'string' ? body.nonceHash : ''));
  } catch (error) { return appleErrorResponse(error, stage); }
};
