import { useState, type FormEvent } from 'react';
import { AppBar, Icon } from './components';

export function AccountForm({ onBack, onSuccess }: { onBack: () => void; onSuccess: () => void }) {
  const [register, setRegister] = useState(false);
  const [name, setName] = useState(''); const [password, setPassword] = useState(''); const [email, setEmail] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/auth/${register ? 'register' : 'login'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: name.trim(), password, ...(register ? { email: email.trim() } : {}) }) }).catch(() => { throw new Error('连接失败，输入内容已保留。请联网后重试。'); });
      const result = await response.json();
      if (response.ok && register) { setRegister(false); setPassword(''); setNotice('账号已创建。请输入密码登录。'); return; }
      if (!response.ok || !result.token || !result.user) throw new Error(result.error || '暂时无法登录，请重试');
      localStorage.setItem('token', result.token); localStorage.setItem('user', JSON.stringify(result.user)); setPassword(''); onSuccess();
    } catch (e) { setError(e instanceof TypeError ? '连接失败，输入内容已保留。请联网后重试。' : e instanceof Error ? e.message : '登录失败，请重试'); }
    finally { setBusy(false); }
  };
  return <section className="a-app a-auth"><AppBar title={register ? '创建星芽账号' : '登录星芽'} back={onBack}/><main className="a-body">
    <div className="a-auth-mark"><Icon name="person"/></div><h2>{register ? '让学习有迹可循' : '欢迎回来'}</h2><p className="a-supporting">登录用于家庭档案和支持的云端同步。离线练习始终可用。</p>
    <form onSubmit={submit} className="a-form">
      <label>用户名<input value={name} onChange={e => setName(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={register ? 3 : 1} maxLength={20}/></label>
      {register && <label>邮箱<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required/></label>}
      <label>密码<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={register ? 'new-password' : 'current-password'} required minLength={register ? 6 : 1}/></label>
      {notice && <p className="a-notice" role="status">{notice}</p>}
      {error && <p className="a-error" role="alert">{error}</p>}
      <button className="a-filled" type="submit" disabled={busy}>{busy ? '正在处理…' : register ? '创建账号' : '登录'}</button>
      <button className="a-text-button" type="button" disabled={busy} onClick={() => { setRegister(!register); setError(''); setNotice(''); }}>{register ? '已有账号？去登录' : '没有账号？创建账号'}</button>
    </form><p className="a-footnote">使用星芽用户名和密码。当前安卓版本暂不支持 Apple 或 Google 快捷登录。</p>
  </main></section>;
}
