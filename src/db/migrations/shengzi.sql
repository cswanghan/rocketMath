-- 生字本云端存储：整本 JSON、按 user + child 隔离、最新为准（updated_at 客户端时钟 epoch ms）
CREATE TABLE IF NOT EXISTS shengzi_notebook (
  user_id    INTEGER NOT NULL,
  child_key  TEXT    NOT NULL DEFAULT '0',  -- '0' = 家长本人/默认；否则孩子 id
  data       TEXT    NOT NULL,              -- JSON 数组（生字条目）
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, child_key)
);
