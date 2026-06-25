import { useEffect, useState } from 'react';

interface UserInfo {
  id: number;
  username: string;
  role: string;
}

export function useAuth() {
  const [user, setUser] = useState<UserInfo | null>(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      return;
    }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(data => {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      });
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const login = () => {
    window.location.href = '/login.html?redirect=' + encodeURIComponent(location.pathname);
  };

  return { user, logout, login };
}

interface Props {
  user: UserInfo | null;
  onLogout: () => void;
  onLogin: () => void;
  activeChild?: { name: string; avatar: string } | null;
  onSwitchChild?: () => void;
  onParent?: () => void;
}

export function UserBar({ user, onLogout, onLogin, activeChild, onSwitchChild, onParent }: Props) {
  return (
    <div className="user-bar">
      <a className="user-print-link" href="/support.html" title="口算天天练 · 打印版">🖨️ 打印版</a>
      {user ? (
        <>
          {onSwitchChild && (
            <button className="child-chip" onClick={onSwitchChild} title="切换孩子档案">
              <span className="child-chip-av">{activeChild ? activeChild.avatar : '👨‍👧'}</span>
              <span className="child-chip-nm">{activeChild ? activeChild.name : '家长'}</span>
              <span className="child-chip-caret">▾</span>
            </button>
          )}
          {onParent && (
            <button className="user-parent-link" onClick={onParent}>家长</button>
          )}
          {user.role === 'admin' && (
            <a className="user-admin-link" href="/admin.html">管理后台</a>
          )}
          <span className="user-avatar">{user.username.charAt(0).toUpperCase()}</span>
          <span className="user-name">{user.username}</span>
          <button className="user-logout" onClick={onLogout}>退出</button>
        </>
      ) : (
        <button className="user-login-btn" onClick={onLogin}>登录 / 注册</button>
      )}
    </div>
  );
}
