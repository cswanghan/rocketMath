-- 一次性登录码: Google redirect 模式回调里把签好的 token 暂存, 客户端用 code 换取
CREATE TABLE IF NOT EXISTS auth_codes (
    code           TEXT PRIMARY KEY,
    token          TEXT NOT NULL,
    user_json      TEXT NOT NULL,
    needs_username INTEGER NOT NULL DEFAULT 0,
    expires_at     INTEGER NOT NULL   -- epoch ms
);
