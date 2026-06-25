import { useState } from 'react';
import { createChild, deleteChild, updateChild, type Child } from './family';

const AVATARS = ['🐣', '🦊', '🐼', '🐯', '🦁', '🐸', '🐙', '🦄', '🐶', '🐱', '🐵', '🐨'];

interface Props {
  childrenList: Child[];
  active: Child | null;
  onPick: (c: Child | null) => void;          // 选当前孩子 (null = 家长本人)
  onChange: (next: Child[]) => void;           // 孩子列表变化
  onClose: () => void;
}

export function ChildSwitcher({ childrenList, active, onPick, onChange, onClose }: Props) {
  const [manage, setManage] = useState(childrenList.length === 0);
  const [adding, setAdding] = useState(childrenList.length === 0);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const add = async () => {
    const n = name.trim();
    if (!n) { setErr('请输入孩子的名字'); return; }
    setBusy(true); setErr('');
    try {
      const c = await createChild({ name: n, avatar });
      const first = childrenList.length === 0;
      onChange([...childrenList, c]);
      setName(''); setAvatar(AVATARS[0]); setAdding(false);
      if (first) setManage(false); // 第一个孩子加完直接回到"谁在学习"
    } catch (e) {
      setErr(e instanceof Error ? e.message : '创建失败');
    } finally {
      setBusy(false);
    }
  };

  const rename = async (c: Child, newName: string) => {
    const n = newName.trim();
    if (!n || n === c.name) return;
    await updateChild({ id: c.id, name: n });
    onChange(childrenList.map((x) => (x.id === c.id ? { ...x, name: n } : x)));
  };

  const setAv = async (c: Child, av: string) => {
    await updateChild({ id: c.id, avatar: av });
    onChange(childrenList.map((x) => (x.id === c.id ? { ...x, avatar: av } : x)));
  };

  const remove = async (c: Child) => {
    if (!confirm(`删除「${c.name}」的档案？学习记录会保留但不再显示。`)) return;
    await deleteChild(c.id);
    const next = childrenList.filter((x) => x.id !== c.id);
    onChange(next);
    if (active?.id === c.id) onPick(null);
    if (next.length === 0) { setManage(true); setAdding(true); }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="card family-card" onClick={(e) => e.stopPropagation()}>
        {!manage ? (
          <>
            <div className="card-title">谁在学习？</div>
            <div className="child-grid">
              {childrenList.map((c) => (
                <button
                  key={c.id}
                  className={`child-tile ${active?.id === c.id ? 'sel' : ''}`}
                  onClick={() => { onPick(c); onClose(); }}
                >
                  <span className="child-av">{c.avatar}</span>
                  <span className="child-nm">{c.name}</span>
                </button>
              ))}
              <button className="child-tile child-parent" onClick={() => { onPick(null); onClose(); }}>
                <span className="child-av">👨‍👧</span>
                <span className="child-nm">家长</span>
              </button>
            </div>
            <button className="ghost" onClick={() => setManage(true)}>＋ 添加 / 管理孩子</button>
          </>
        ) : (
          <>
            <div className="card-title">我的孩子</div>
            {childrenList.length > 0 && (
              <div className="child-manage">
                {childrenList.map((c) => (
                  <div key={c.id} className="child-row">
                    <select className="av-select" value={c.avatar} onChange={(e) => setAv(c, e.target.value)}>
                      {AVATARS.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <input
                      className="fill-input child-name-input"
                      defaultValue={c.name}
                      maxLength={20}
                      onBlur={(e) => rename(c, e.target.value)}
                    />
                    <button className="act-del" onClick={() => remove(c)}>删除</button>
                  </div>
                ))}
              </div>
            )}

            {adding ? (
              <div className="child-add">
                <div className="av-row">
                  {AVATARS.map((a) => (
                    <button
                      key={a}
                      className={`av-pick ${avatar === a ? 'sel' : ''}`}
                      onClick={() => setAvatar(a)}
                    >{a}</button>
                  ))}
                </div>
                <input
                  className="fill-input child-name-input"
                  placeholder="孩子的名字"
                  value={name}
                  maxLength={20}
                  autoFocus
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
                />
                {err && <div className="gate-error">{err}</div>}
                <button className="primary" onClick={add} disabled={busy}>{busy ? '添加中…' : '添加孩子'}</button>
                {childrenList.length > 0 && (
                  <button className="ghost" onClick={() => { setAdding(false); setErr(''); setName(''); }}>取消</button>
                )}
              </div>
            ) : (
              <button className="child-add-btn" onClick={() => setAdding(true)}>＋ 添加孩子</button>
            )}

            {childrenList.length > 0 && !adding && (
              <button className="ghost" onClick={() => setManage(false)}>← 返回选择</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
