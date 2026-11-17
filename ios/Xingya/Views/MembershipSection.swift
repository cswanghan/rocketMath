import StoreKit
import SwiftUI

struct MembershipSection: View {
    @Environment(AuthSession.self) private var auth
    @Environment(StoreKitService.self) private var store

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            BrandCard(title: "月度会员") {
                if store.canUseCloud(auth) {
                    Label("月度会员有效", systemImage: "checkmark.seal.fill")
                        .font(Theme.titleFont(20)).foregroundStyle(Theme.accent)
                    if store.serverMembership?.environment == "Sandbox" {
                        Text("沙盒测试权益，不代表生产购买。")
                            .font(Theme.captionFont).foregroundStyle(Theme.sub)
                    }
                } else if store.isPremium {
                    BrandNotice(message: "已发现 Apple 购买，云端会员尚未验证。请使用原购买账号恢复；不要重复购买。")
                }
                Text("口算、练习和本地分析免费，支持离线。月度会员提供云同步与 AI 家长总结，须登录并关联购买账号。")
                    .font(Theme.captionFont).foregroundStyle(Theme.sub)
                if store.isLoading || store.isRefreshing {
                    ProgressView("正在加载 / 验证会员…").tint(Theme.brand)
                }
                if !store.isLoading && (store.products.isEmpty || store.catalogError != nil) {
                    BrandNotice(message: L10n.text(store.catalogError ?? StoreErrorMessage.catalogUnavailable))
                        .accessibilityIdentifier("membership-catalog-error")
                    BrandSecondaryButton("重试加载商品") { Task { await store.loadProducts() } }
                        .disabled(store.isRefreshing)
                        .accessibilityIdentifier("membership-retry-products")
                }
                ForEach(store.products, id: \.id) { product in
                    VStack(alignment: .leading, spacing: 10) {
                        Text(L10n.text(product.displayName)).font(Theme.titleFont(18))
                            .accessibilityIdentifier("membership-product-name")
                        Text(L10n.text(product.description)).font(Theme.captionFont).foregroundStyle(Theme.sub)
                        HStack(alignment: .firstTextBaseline, spacing: 8) {
                            Text(product.displayPrice).font(Theme.numberFont(28))
                                .accessibilityIdentifier("membership-price")
                            Text("每月").font(Theme.captionFont).foregroundStyle(Theme.sub)
                                .accessibilityIdentifier("membership-period")
                        }
                        if !store.canUseCloud(auth) {
                            if auth.isLoggedIn {
                                BrandPrimaryButton("订阅月度会员") {
                                    Task { await store.purchase(product, auth: auth) }
                                }
                                .disabled(!auth.isLoggedIn || auth.isBusy || store.isLoading || store.isRefreshing
                                          || store.isPremium || store.hasPendingPurchase || store.canUseCloud(auth))
                                .accessibilityIdentifier("membership-purchase")
                            } else {
                                Button("订阅月度会员") {
                                    Task { await store.purchase(product, auth: auth) }
                                }
                                .buttonStyle(BrandSecondaryStyle())
                                .disabled(!auth.isLoggedIn || auth.isBusy || store.isLoading || store.isRefreshing
                                          || store.isPremium || store.hasPendingPurchase || store.canUseCloud(auth))
                                .accessibilityIdentifier("membership-purchase")
                            }
                        }
                    }
                }
                BrandSecondaryButton("恢复购买") { Task { await store.restore() } }
                    .disabled(store.isLoading || store.isRefreshing || auth.isBusy)
                    .accessibilityIdentifier("membership-restore")
                if !auth.isLoggedIn {
                    Text("请先登录要关联会员的账号，再购买或验证恢复结果。")
                        .font(Theme.captionFont).foregroundStyle(Theme.sub)
                }
                BrandTextButton("刷新商品与权益") {
                    Task { await store.loadProducts(); await store.refreshWhenIdle() }
                }
                .disabled(store.isLoading || store.isRefreshing)
                if let message = store.feedback.message { BrandNotice(message: L10n.text(message)) }
                if let error = store.lastError { BrandNotice(message: L10n.text(error), isError: true) }
            }
            VStack(alignment: .leading, spacing: 10) {
                Text("按月自动续订，费用由 Apple 账户支付。除非在当前周期结束至少 24 小时前取消，否则将续订；取消后可用至有效期结束。价格以商店显示和 Apple 购买确认页为准。")
                HStack(spacing: 20) {
                    Link("管理订阅", destination: URL(string: "https://apps.apple.com/account/subscriptions")!)
                    Link("Apple 标准 EULA", destination: URL(string: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!)
                }
                Link("隐私政策", destination: URL(string: "https://rocket-math-4kg.pages.dev/privacy.html")!)
                Link("支持与隐私联系：cswanghan@gmail.com", destination: URL(string: "mailto:cswanghan@gmail.com")!)
                Text("删除星芽账号不会自动取消 Apple 订阅，请先在「管理订阅」中处理。")
                #if DEBUG
                Text("调试构建：若启用本地 StoreKit 配置，商品及示例价不代表真实 ASC 目录，本地模拟购买不能解锁云端会员。")
                #endif
            }
            .font(Theme.captionFont).foregroundStyle(Theme.sub)
            .buttonStyle(BrandTextStyle())
            .padding(.horizontal, 6)
        }
    }
}
