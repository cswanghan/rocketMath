import { useEffect, useRef, type ReactNode } from 'react';

export type IconName = 'book' | 'chart' | 'person' | 'back' | 'next' | 'down' | 'check' | 'close' | 'math' | 'chinese' | 'english' | 'offline' | 'timer' | 'settings' | 'shield';
const paths: Record<IconName, ReactNode> = {
  book: <><path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Z"/><path d="M12 6v14"/></>,
  chart: <><path d="M4 4v16h17M8 16v-4m5 4V8m5 8V5"/></>,
  person: <><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>,
  back: <path d="m12 5-7 7 7 7M5 12h15"/>, next: <path d="m9 5 7 7-7 7"/>, down: <path d="m6 9 6 6 6-6"/>, check: <path d="m5 12 4 4L19 6"/>, close: <path d="m6 6 12 12M6 18 18 6"/>,
  math: <><rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h1m6 0h1m-8 4h1m6 0h1"/></>,
  chinese: <><path d="M4 7h16M12 3v17M6 7v9h12V7"/></>,
  english: <><path d="m3 19 6-14 6 14M5 14h8M17 19V9h4M17 14h3"/></>,
  offline: <><path d="M6 17H5a4 4 0 0 1-1-8 7 7 0 0 1 13-1 4.5 4.5 0 0 1 2 9h-1M8 16l3 3 5-6"/></>,
  timer: <><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/></>,
  settings: <><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="16" cy="17" r="3"/></>,
  shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/></>,
};
export function Icon({ name }: { name: IconName }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
export function AppBar({ title, subtitle, back, action }: { title: string; subtitle?: string; back?: () => void; action?: ReactNode }) {
  return <header className="a-appbar">
    {back && <button className="a-icon-button" onClick={back} aria-label="返回"><Icon name="back"/></button>}
    <div className="a-appbar-title"><h1 tabIndex={-1}>{title}</h1>{subtitle && <span>{subtitle}</span>}</div>{action}
  </header>;
}
export function Row({ icon, title, detail, trailing, onClick, disabled }: { icon?: IconName; title: string; detail?: string; trailing?: ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button className="a-row" onClick={onClick} disabled={disabled}>
    {icon && <span className="a-row-icon"><Icon name={icon}/></span>}
    <span className="a-row-text"><strong>{title}</strong>{detail && <span>{detail}</span>}</span>
    {trailing ?? <Icon name="next"/>}
  </button>;
}
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => { ref.current?.close(); opener?.focus(); };
  }, []);
  return <dialog ref={ref} className="a-sheet" aria-label={title} onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="a-sheet-content"><div className="a-sheet-handle"/><header><h2>{title}</h2><button className="a-icon-button" aria-label="关闭" onClick={onClose}><Icon name="close"/></button></header>{children}</div>
  </dialog>;
}
