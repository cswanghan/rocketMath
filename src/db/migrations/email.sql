-- 邮箱推广 (email campaigns): 给注册用户发产品/新功能邮件
-- users.email_optout: 退订标记 (一键退订链接置 1, 之后所有推广邮件跳过)
ALTER TABLE users ADD COLUMN email_optout INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS email_campaigns (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    subject    TEXT    NOT NULL,
    html       TEXT    NOT NULL,
    is_test    INTEGER NOT NULL DEFAULT 0,   -- 1 = 测试发送(只发给操作管理员)
    sent_count INTEGER NOT NULL DEFAULT 0,
    fail_count INTEGER NOT NULL DEFAULT 0,
    skip_count INTEGER NOT NULL DEFAULT 0,   -- 退订/无邮箱跳过
    created_by INTEGER,                      -- 操作的管理员 user id
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS email_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    user_id     INTEGER,
    email       TEXT    NOT NULL,
    status      TEXT    NOT NULL,             -- sent / failed / skipped_optout
    error       TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id)
);

CREATE INDEX IF NOT EXISTS idx_email_log_campaign ON email_log(campaign_id);
