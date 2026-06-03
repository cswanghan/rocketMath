// 4-digit PIN gate for the parent area. First visit sets the PIN; later visits
// must enter it. On success renders children.
import { useState, type ReactNode } from 'react';
import { checkPin, hasPin, setPin } from './pin';

interface Props {
  onCancel: () => void;
  children: ReactNode;
}

export function ParentGate({ onCancel, children }: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const [mode] = useState<'set' | 'enter'>(hasPin() ? 'enter' : 'set');
  const [pin, setPinInput] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  if (unlocked) return <>{children}</>;

  const submit = () => {
    if (mode === 'set') {
      if (pin.length !== 4) return setError('请输入 4 位数字');
      if (pin !== confirm) return setError('两次输入不一致');
      setPin(pin);
      setUnlocked(true);
    } else {
      if (checkPin(pin)) setUnlocked(true);
      else {
        setError('密码错误');
        setPinInput('');
      }
    }
  };

  return (
    <div className="parent-gate">
      <button className="ghost" onClick={onCancel}>
        ← 返回
      </button>
      <div className="gate-card">
        <div className="gate-emoji">🔒</div>
        <h2>{mode === 'set' ? '设置家长密码' : '家长验证'}</h2>
        <p className="subtitle">
          {mode === 'set' ? '第一次进入,请设置一个 4 位数字密码' : '请输入 4 位家长密码'}
        </p>
        <input
          className="fill-input"
          inputMode="numeric"
          autoFocus
          value={pin}
          maxLength={4}
          placeholder="••••"
          onChange={(e) => {
            setPinInput(e.target.value.replace(/[^\d]/g, '').slice(0, 4));
            setError('');
          }}
          onKeyDown={(e) => e.key === 'Enter' && mode === 'enter' && submit()}
        />
        {mode === 'set' && (
          <input
            className="fill-input"
            inputMode="numeric"
            value={confirm}
            maxLength={4}
            placeholder="再输一次"
            onChange={(e) => setConfirm(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        )}
        {error && <div className="gate-error">{error}</div>}
        <button className="primary" onClick={submit}>
          {mode === 'set' ? '设置并进入' : '进入'}
        </button>
      </div>
    </div>
  );
}
