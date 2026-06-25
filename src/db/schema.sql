CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT    NOT NULL UNIQUE,
    password   TEXT    NOT NULL,
    email      TEXT    UNIQUE,
    phone      TEXT,
    role       TEXT    NOT NULL DEFAULT 'user',
    status     TEXT    NOT NULL DEFAULT 'approved',
    google_sub TEXT    UNIQUE,
    email_optout INTEGER NOT NULL DEFAULT 0,  -- 推广邮件退订标记
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub);

-- user behavior analytics (埋点) ------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER,                 -- resolved from JWT when available (nullable = anonymous)
    anon_id    TEXT,                    -- stable client id for anonymous attribution
    event      TEXT    NOT NULL,        -- event name, e.g. 'page_view','subject_select'
    props      TEXT,                    -- JSON-encoded properties
    path       TEXT,                    -- page path/hash where it happened
    ua         TEXT,                    -- user agent
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))  -- UTC
);

CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_event ON events(event);
CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_anon ON events(anon_id);

-- 英语背单词进度 (vocab module, migrated from ket-online) ----------------------
CREATE TABLE IF NOT EXISTS vocab_progress (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    word_key   TEXT    NOT NULL,
    word       TEXT    NOT NULL,
    topic      TEXT    NOT NULL,
    seen       INTEGER NOT NULL DEFAULT 0,
    streak     INTEGER NOT NULL DEFAULT 0,
    mastered   INTEGER NOT NULL DEFAULT 0,
    wrong      INTEGER NOT NULL DEFAULT 0,
    favorite   INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE (user_id, word_key)
);

CREATE INDEX IF NOT EXISTS idx_vocab_progress_user ON vocab_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_vocab_progress_user_topic ON vocab_progress(user_id, topic);

-- 邮箱推广 (campaigns + per-recipient log) -------------------------------------
CREATE TABLE IF NOT EXISTS email_campaigns (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    subject    TEXT    NOT NULL,
    html       TEXT    NOT NULL,
    is_test    INTEGER NOT NULL DEFAULT 0,
    sent_count INTEGER NOT NULL DEFAULT 0,
    fail_count INTEGER NOT NULL DEFAULT 0,
    skip_count INTEGER NOT NULL DEFAULT 0,
    created_by INTEGER,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS email_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    user_id     INTEGER,
    email       TEXT    NOT NULL,
    status      TEXT    NOT NULL,
    error       TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id)
);

CREATE INDEX IF NOT EXISTS idx_email_log_campaign ON email_log(campaign_id);
