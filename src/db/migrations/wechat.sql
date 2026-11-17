-- 微信小程序登录 (functions/api/auth/wechat.ts)
--
-- openid 是「同一个小程序内」唯一, unionid 是「同一开放平台账号下」唯一。
-- 现在只有一个小程序, 认 openid 就够; unionid 先存着, 将来接公众号/App 时
-- 才有跨端合并账号的依据。两列都可空 —— Web 注册的用户没有微信身份。
ALTER TABLE users ADD COLUMN wx_openid TEXT;
ALTER TABLE users ADD COLUMN wx_unionid TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_wx_openid ON users(wx_openid);
CREATE INDEX IF NOT EXISTS idx_users_wx_unionid ON users(wx_unionid);
