-- 家庭/孩子档案 (家长账号下挂多个孩子档案; 孩子免密在家长设备内切换)
CREATE TABLE IF NOT EXISTS children (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id  INTEGER NOT NULL,
    name       TEXT    NOT NULL,
    avatar     TEXT,                 -- emoji 头像
    grade      INTEGER,              -- 默认年级 (可空)
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (parent_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_children_parent ON children(parent_id);

-- 埋点事件按孩子归因 (child_id 为空 = 家长本人/未选档案)
ALTER TABLE events ADD COLUMN child_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_events_child ON events(child_id);
