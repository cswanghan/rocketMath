import { afterEach, describe, expect, it, vi } from 'vitest';
// @ts-expect-error Existing Pages JS handler has no declaration file.
import { onRequestPost } from '../functions/api/summarize.js';

const invoke = (payload: unknown) => onRequestPost({
  request: new Request('https://example.test/api/summarize', { method: 'POST', body: JSON.stringify(payload) }),
  env: { DEEPSEEK_API_KEY: 'test-provider-key' },
});
afterEach(() => vi.unstubAllGlobals());

describe('parent AI analysis (mock provider only)', () => {
  it.each([4, 9])('uses selected grade %s and English without relabeling historical mistakes', async grade => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ choices: [{ message: { content: ' test analysis ' } }] }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await (await invoke({ selectedGrade: grade, language: 'en', total: 1, topics: [{ topic: 'Place value',
      wrong: 1, examples: [{ prompt: 'Write 20 million', yourAnswer: '2000000', correctAnswer: '20000000' }] }] })).json())
      .toEqual({ summary: 'test analysis' });
    const request = JSON.parse(fetchMock.mock.calls[0][1].body);
    const prompt = request.messages[1].content;
    expect(prompt).toContain(`当前选中年级: ${grade}`);
    expect(prompt).toContain('历史错题可能跨年级');
    expect(prompt).toContain('in English');
    expect(prompt).not.toContain('三年级');
    expect(prompt).toContain('仅耗时长不能证明知识薄弱');
    expect(prompt).toContain('同类巩固练习及答案');
    expect(prompt).toContain('20000000');
  });

  it('keeps old Web payloads compatible without inventing a grade', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ choices: [{ message: { content: '分析' } }] }));
    vi.stubGlobal('fetch', fetchMock);
    expect((await invoke({ total: 1 })).status).toBe(200);
    const prompt = JSON.parse(fetchMock.mock.calls[0][1].body).messages[1].content;
    expect(prompt).toContain('当前选中年级: 未提供');
    expect(prompt).toContain('请用中文');
  });

  it('limits learning evidence and omits extra account fields from provider data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ choices: [{ message: { content: '分析' } }] }));
    vi.stubGlobal('fetch', fetchMock);
    await invoke({ selectedGrade: 100, language: 'xx', email: 'private@example.test', token: 'private-session',
      total: -5, topics: Array.from({ length: 20 }, () => ({ topic: 'x'.repeat(200), wrong: -1,
        examples: Array.from({ length: 10 }, () => ({ prompt: 'p'.repeat(1000), correctAnswer: '2', secret: 'private-session' })) })),
      slowest: Array.from({ length: 10 }, () => ({ seconds: -10 })) });
    const prompt = JSON.parse(fetchMock.mock.calls[0][1].body).messages[1].content;
    const evidence = JSON.parse(prompt.split('数据:\n')[1]);
    expect(evidence).toMatchObject({ selectedGrade: null, language: 'zh-Hans', total: 0 });
    expect(evidence.topics).toHaveLength(8);
    expect(evidence.topics[0].topic).toHaveLength(100);
    expect(evidence.topics[0].examples).toHaveLength(3);
    expect(evidence.topics[0].examples[0].prompt).toHaveLength(500);
    expect(evidence.slowest).toHaveLength(5);
    expect(evidence.slowest[0].seconds).toBeNull();
    expect(prompt).not.toContain('private');
  });

  it.each(['null', '[]', '"text"'])('rejects invalid payload %s before provider access', async body => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    expect((await invoke(JSON.parse(body))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['http', 'network', 'html', 'empty', 'type'])('fails safely for %s provider results, allowing client local fallback', async mode => {
    const mock = vi.fn(); vi.stubGlobal('fetch', mock);
    if (mode === 'network') mock.mockRejectedValue(new Error('test-provider-key secret'));
    else if (mode === 'http') mock.mockResolvedValue(new Response('test-provider-key secret', { status: 500 }));
    else if (mode === 'html') mock.mockResolvedValue(new Response('<html>secret</html>'));
    else mock.mockResolvedValue(Response.json({ choices: [{ message: { content: mode === 'empty' ? '  ' : {} } }] }));
    const response = await invoke({ total: 1 });
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'AI summary unavailable' });
  });
});
