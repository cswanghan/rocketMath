-- Apply ONCE to the existing rocket-math D1 database before deploying the routes.
-- Additive only: no user, progress, or membership rows are replaced or removed.
ALTER TABLE users ADD COLUMN apple_sub TEXT;
ALTER TABLE users ADD COLUMN apple_name TEXT;
CREATE UNIQUE INDEX idx_users_apple_sub ON users(apple_sub);

CREATE TABLE apple_sign_in_challenges (
    id TEXT PRIMARY KEY,
    nonce_hash TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    consumed_at INTEGER
);
CREATE INDEX idx_apple_challenge_expiry ON apple_sign_in_challenges(expires_at);

-- Only AES-GCM ciphertext is retained. Each authorization is retained until
-- revoked, so signing in on another device cannot discard a revocation token.
CREATE TABLE apple_sign_in_tokens (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    encrypted_token TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
CREATE INDEX idx_apple_tokens_user ON apple_sign_in_tokens(user_id);

-- Serialize token exchange and account deletion for a subject across isolates.
CREATE TABLE apple_sign_in_locks (
    apple_sub TEXT PRIMARY KEY,
    owner TEXT NOT NULL,
    expires_at INTEGER NOT NULL
);
