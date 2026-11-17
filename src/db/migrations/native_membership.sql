-- Additive only. Apply before deploying the member-only native routes.
-- Retain opaque purchase bindings on account soft deletion to prevent reclaims.
CREATE TABLE IF NOT EXISTS native_subscription_accounts (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  account_token TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS native_subscription_bindings (
  user_id INTEGER NOT NULL REFERENCES users(id),
  environment TEXT NOT NULL CHECK(environment IN ('Production', 'Sandbox')),
  original_transaction_id TEXT NOT NULL,
  PRIMARY KEY (user_id, environment),
  UNIQUE (environment, original_transaction_id)
);
