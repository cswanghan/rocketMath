# 真机账号页（无本地 StoreKit 配置）

2026-11-11 15:43 Asia/Shanghai。iPhone 16 Pro Max（iphonehan）/ iOS 27.2，官方 devicectl device capture screenshot 直接保存，1320x2868。未重装、未重新启动应用；截的是用户已打开的当前账号页。

- 未登录。可见「登录」按钮；订阅按钮因未登录而禁用（真实逻辑）。
- 商品显示名「星芽高级会员（月）」，描述「云同步与 AI 家长总结」，周期「每月」。
- 价格为 StoreKit Product.displayPrice：US$2.99。本次启动未附加 Configuration.storekit，也未使用 Xcode scheme 或 UITEST 参数。该金额是此设备/Apple ID 店面返回的真实目录价，不是本地测试目录的 $18.00，也不是已批准的全球统一售价，更不是已完成购买的证明。
- 本包是 14:50 覆盖安装的 development 签名 Release 1.0.0 (2)（Apple Development），不是已上传 ASC 的 Distribution IPA。画面无 Keychain 错误，未见 Debug 本地目录声明。
- 未执行购买或恢复购买，未伪造登录或会员权益。
