import { useState } from 'react';
import { deletionConfirmError } from '../account-deletion';
import { apiUrl } from '../platform';

interface Props {
  onDeleted: () => void;
}

function storedUsername(): string {
  try {
    const raw = localStorage.getItem('user');
    const user = raw ? JSON.parse(raw) as { username?: string } : null;
    return user?.username ?? '';
  } catch {
    return '';
  }
}

export function DeleteAccount({ onDeleted }: Props) {
  const username = storedUsername();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    const localError = deletionConfirmError(username, typed);
    if (localError) {
      setError(localError);
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      setError('请重新登录后再删除');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const response = await fetch(apiUrl('/api/auth/account'), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: typed.trim() }),
      });
      const data = await response.json().catch(() => ({} as { error?: string }));
      if (!response.ok) {
        setError(data.error || '删除失败');
        setBusy(false);
        return;
      }
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      onDeleted();
    } catch {
      setError('网络不可用，账号还没有删除。');
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="danger-btn" onClick={() => setOpen(true)}>
        删除云端账号
      </button>
    );
  }

  return (
    <div className="delete-account">
      <p>
        将删除服务器上的这个账号：登录资料、孩子档案、英语单词的云端进度、生字本的云端副本，以及记在这个账号上的行为事件。
        本机的口算进度、错题和家长密码仍留在这台设备上，可以用上面的重置按钮另行清除。
        没有绑定到账号的匿名事件不会被这步删除。删除后不能恢复。
      </p>
      <p>请输入用户名 <b>{username || '（本地没有用户名）'}</b> 以确认。</p>
      <input
        className="fill-input child-name-input"
        value={typed}
        autoComplete="off"
        onChange={(e) => {
          setTyped(e.target.value);
          setError('');
        }}
      />
      {error && <div className="gate-error">{error}</div>}
      <button className="danger-btn" onClick={submit} disabled={busy || !username}>
        {busy ? '正在删除…' : '确认删除账号'}
      </button>
      <button className="ghost" onClick={() => setOpen(false)} disabled={busy}>
        取消
      </button>
    </div>
  );
}
