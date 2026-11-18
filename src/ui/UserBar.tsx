import { useEffect, useState } from 'react';
import { isAndroidApp } from '../platform/native';
import { validateSession } from '../platform/session';

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
    let alive = true;
    void validateSession(token).then(result => {
      if (!alive || localStorage.getItem('token') !== token) return;
      if (result.kind === 'valid') {
        setUser(result.user);
        localStorage.setItem('user', JSON.stringify(result.user));
      } else if (result.kind === 'expired') {
        localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null);
      }
      // A disconnected device keeps its local profile and progress.
    });
    return () => { alive = false; };
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
      {isAndroidApp() ? <a className="user-print-link" href="/android-about.html">关于</a> : <a className="user-print-link" href="/support.html" title="口算天天练 · 打印版">🖨️ 打印版</a>}
      {!user && onParent && <button className="user-parent-link" onClick={onParent}>家长</button>}
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
          {!isAndroidApp() && user.role === 'admin' && (
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
