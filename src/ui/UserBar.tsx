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
}

export function UserBar({ user, onLogout, onLogin }: Props) {
  return (
    <div className="user-bar">
      {user ? (
        <>
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
