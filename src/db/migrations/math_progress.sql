-- 数学学习进度云同步（iOS / Web 共用）
-- 按 user_id + student_id 隔离；student_id 默认 'local'，多孩子时为 child_N

CREATE TABLE IF NOT EXISTS math_student (
    user_id          INTEGER NOT NULL,
    student_id       TEXT    NOT NULL DEFAULT 'local',
    xp               INTEGER NOT NULL DEFAULT 0,
    latency_gate_ms  INTEGER,
    updated_at       INTEGER NOT NULL DEFAULT 0,  -- epoch ms
    PRIMARY KEY (user_id, student_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS math_track_state (
    user_id     INTEGER NOT NULL,
    student_id  TEXT    NOT NULL DEFAULT 'local',
    track_id    TEXT    NOT NULL,
    payload     TEXT    NOT NULL,                 -- TrackState JSON
    updated_at  INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, student_id, track_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_math_track_user ON math_track_state(user_id, student_id);

CREATE TABLE IF NOT EXISTS math_practice (
    user_id              INTEGER NOT NULL,
    student_id           TEXT    NOT NULL DEFAULT 'local',
    set_id               TEXT    NOT NULL,
    best_first_try       INTEGER NOT NULL DEFAULT 0,
    total                INTEGER NOT NULL DEFAULT 0,
    completed_at         INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, student_id, set_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_math_practice_user ON math_practice(user_id, student_id);

CREATE TABLE IF NOT EXISTS math_mistake (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL,
    student_id      TEXT    NOT NULL DEFAULT 'local',
    client_key      TEXT    NOT NULL,            -- 客户端去重键: source|topicId|problemId|ts
    source          TEXT    NOT NULL,
    topic_id        TEXT    NOT NULL,
    topic_title     TEXT    NOT NULL,
    problem_id      TEXT    NOT NULL,
    prompt          TEXT    NOT NULL,
    difficulty      TEXT,
    your_answer     TEXT    NOT NULL,
    correct_answer  TEXT    NOT NULL,
    elapsed_ms      INTEGER,
    slow            INTEGER NOT NULL DEFAULT 0,
    ts              INTEGER NOT NULL,
    corrected       INTEGER NOT NULL DEFAULT 0,
    UNIQUE (user_id, student_id, client_key),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_math_mistake_user ON math_mistake(user_id, student_id);
