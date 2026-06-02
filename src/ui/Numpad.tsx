// On-screen numeric keypad for tablets. Physical keyboard is handled in Play.
interface Props {
  onDigit: (d: string) => void;
  onClear: () => void;
  onEnter: () => void;
  disabled?: boolean;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function Numpad({ onDigit, onClear, onEnter, disabled }: Props) {
  return (
    <div className="numpad" aria-hidden={disabled}>
      {KEYS.map((k) => (
        <button key={k} className="key" disabled={disabled} onClick={() => onDigit(k)}>
          {k}
        </button>
      ))}
      <button className="key key-fn" disabled={disabled} onClick={onClear}>
        ⌫
      </button>
      <button className="key" disabled={disabled} onClick={() => onDigit('0')}>
        0
      </button>
      <button className="key key-enter" disabled={disabled} onClick={onEnter}>
        ✓
      </button>
    </div>
  );
}
