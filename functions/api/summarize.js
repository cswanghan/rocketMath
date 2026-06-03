// Cloudflare Pages Function: POST /api/summarize
// Generates a parent-facing summary of a child's math mistakes via DeepSeek.
// The API key lives ONLY in the server-side env secret DEEPSEEK_API_KEY — it is
// never shipped to the browser. The frontend falls back to a local summary if
// this endpoint returns non-2xx (e.g. key not configured).

export async function onRequestPost(context) {
  const { request, env } = context;
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });

  const key = env.DEEPSEEK_API_KEY;
  if (!key) return json({ error: 'DEEPSEEK_API_KEY not configured' }, 501);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'bad json' }, 400);
  }

  const prompt =
    '下面是一名三年级学生在数学练习中的错题统计(JSON,topic=知识点,wrong=错题数,' +
    'byDifficulty 含 basic/consolidate/challenge 三档难度,examples 为示例题)。\n' +
    '请用中文写一段给家长看的总结,要求:\n' +
    '1) 指出最需要加强的 2-3 个知识点;\n' +
    '2) 简要分析可能的薄弱原因;\n' +
    '3) 给出 2-3 条具体、可操作的家庭辅导建议;\n' +
    '语气鼓励、亲切、简明,200 字以内,自然成段,不要用过多分点符号。\n\n' +
    '数据:\n' +
    JSON.stringify(payload);

  let resp;
  try {
    resp = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是一位经验丰富、亲切耐心的小学数学老师,擅长用简明鼓励的语言为家长提供辅导建议。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 700,
      }),
    });
  } catch (e) {
    return json({ error: 'fetch failed', detail: String(e) }, 502);
  }

  if (!resp.ok) {
    const detail = await resp.text();
    return json({ error: 'deepseek error', status: resp.status, detail }, 502);
  }

  const data = await resp.json();
  const summary = data?.choices?.[0]?.message?.content ?? '';
  return json({ summary });
}

export async function onRequest(context) {
  if (context.request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  return onRequestPost(context);
}
