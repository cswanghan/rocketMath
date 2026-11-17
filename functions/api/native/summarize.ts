import { requireNativeMember, membershipFailure } from '../../../src/native-membership';
import type { MembershipEnvironment } from '../../../src/native-membership';
import type { PagesHandler } from '../../../src/server-types';
// The shared generator keeps the Web behavior; this route has no anonymous path.
// @ts-expect-error Existing Pages JavaScript module has no declaration file.
import { onRequestPost as summarize } from '../summarize.js';

export const onRequestPost: PagesHandler<MembershipEnvironment & { DEEPSEEK_API_KEY?: string }> = async context => {
  try { await requireNativeMember(context.request, context.env); }
  catch (error) { return membershipFailure(error); }
  return summarize(context);
};
