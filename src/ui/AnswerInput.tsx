import { useRef, useState } from 'react';
import { isAndroidApp } from '../platform/native';

interface Props {
  value: string;
  onChange: (value: string) => void;
  numeric: boolean;
  autoFocus?: boolean;
  small?: boolean;
}

/** Numeric Android answers use the app keypad, including decimals and negatives. */
export function AnswerInput({ value, onChange, numeric, autoFocus, small }: Props) {
  const [active, setActive] = useState(!!autoFocus);
  const wrap = useRef<HTMLDivElement>(null);
  const native = isAndroidApp() && numeric;
  return <div ref={wrap} className={native ? 'native-answer-input' : undefined}
    onBlur={event => { if (!wrap.current?.contains(event.relatedTarget as Node | null)) setActive(false); }}>
    <input className={`fill-input${small ? ' small' : ''}`} value={value}
      aria-label="答案" placeholder="?" autoFocus={autoFocus}
      readOnly={native} inputMode={native ? 'none' : 'text'}
      onFocus={() => setActive(true)} onClick={() => setActive(true)}
      onChange={event => onChange(event.target.value.slice(0, 24))} />
    {native && active && <div className="numpad" aria-label="数字键盘">
      {['1','2','3','4','5','6','7','8','9','.','0'].map(key => <button type="button" className="key" key={key}
        onClick={() => { if (value.length < 24 && (key !== '.' || !value.includes('.'))) onChange(value + key); }}>{key}</button>)}
      <button type="button" className="key key-fn" aria-label="删除一位" onClick={() => onChange(value.slice(0, -1))}>⌫</button>
      <button type="button" className="key key-sign" aria-label="切换正负号" onClick={() => onChange(value.startsWith('-') ? value.slice(1) : '-' + value)}>+/−</button>
    </div>}
  </div>;
}
