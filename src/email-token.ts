// 一键退订 token: HMAC-SHA256(userId + ':' + email, JWT_SECRET) 的 hex 前 32 位。
// 无需登录即可退订 (邮件收件人未必处于登录态), 但 token 不可伪造/不可遍历。
const encoder = new TextEncoder();

async function hmacHex(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function unsubscribeToken(userId: number, email: string, secret: string): Promise<string> {
  return (await hmacHex(`unsub:${userId}:${email}`, secret)).slice(0, 32);
}

export async function verifyUnsubscribeToken(
  userId: number, email: string, token: string, secret: string,
): Promise<boolean> {
  const expect = await unsubscribeToken(userId, email, secret);
  return !!token && token === expect;
}
