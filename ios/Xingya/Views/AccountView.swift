// 账号中心：登录态、云同步、订阅（StoreKit 2）。

import StoreKit
import SwiftUI

struct AccountView: View {
    let storage: any StorageAdapter
    let studentId: String
    var onClose: () -> Void

    @Environment(AuthSession.self) private var auth
    @Environment(StoreKitService.self) private var store

    @State private var showAuth = false
    @State private var syncMessage = ""
    @State private var isSyncing = false
    @State private var confirmDelete = false
    @State private var deleteMessage = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    BrandCard {
                        HStack(spacing: 12) {
                            Image(systemName: auth.isLoggedIn ? "person.crop.circle.fill" : "person.crop.circle")
                                .font(Theme.titleFont(36)).foregroundStyle(Theme.brand)
                            VStack(alignment: .leading, spacing: 4) {
                                BrandSectionTitle(auth.isLoggedIn ? (store.canUseCloud(auth) ? "月度会员有效" : "已登录 · 未开通会员") : "未登录")
                                if let user = auth.user, auth.isLoggedIn {
                                    Text(user.username).font(Theme.bodyFont)
                                } else {
                                    Text("登录并开通月度会员后可手动同步部分数学进度")
                                        .font(Theme.captionFont).foregroundStyle(Theme.sub)
                                }
                            }
                        }
                        if !auth.isLoggedIn {
                            BrandPrimaryButton("登录") { showAuth = true }
                                .accessibilityIdentifier("account-login")
                        }
                        if !deleteMessage.isEmpty {
                            BrandNotice(message: L10n.text(deleteMessage))
                        }
                        if let error = auth.lastError {
                            BrandNotice(message: L10n.text(error), isError: true)
                                .accessibilityIdentifier("account-auth-error")
                        }
                    }

                    if auth.isLoggedIn {
                        BrandCard(title: "云同步") {
                            Button {
                                Task { await syncNow() }
                            } label: {
                                HStack {
                                    if isSyncing { ProgressView().tint(Theme.ink) }
                                    Label("立即同步", systemImage: "arrow.triangle.2.circlepath")
                                }
                            }
                            .buttonStyle(BrandSecondaryStyle())
                            .disabled(isSyncing || auth.isBusy || !canSync)
                            .accessibilityIdentifier("account-sync")

                            Text("仅手动合并经验、手速阈值、关卡、练习最佳成绩与错题；答题事件、完整报告、年级设置和家长 PIN 不同步。")
                                .font(Theme.captionFont).foregroundStyle(Theme.sub)
                            Text(L10n.text(SyncOwnership.resetMessage)).font(Theme.captionFont).foregroundStyle(Theme.sub)
                            if !ownsLocalData {
                                BrandNotice(message: L10n.text(SyncOwnership.blockedMessage), isError: true)
                            }
                            if !store.canUseCloud(auth) {
                                Text("云同步为月度会员权益，请在下方开通或恢复购买；验证失败时仍可离线练习。")
                                    .font(Theme.captionFont).foregroundStyle(Theme.sub)
                            }
                            if !syncMessage.isEmpty { BrandNotice(message: syncMessage) }
                        }
                    }

                    MembershipSection()

                    BrandCard(title: "本机学习数据") {
                        Text(L10n.text(SyncOwnership.scopeMessage)).font(Theme.captionFont).foregroundStyle(Theme.sub)
                        if auth.isLoggedIn {
                            HStack(spacing: 16) {
                                Button("退出登录", role: .destructive) {
                                    auth.logout()
                                    syncMessage = ""
                                    deleteMessage = ""
                                }
                                .buttonStyle(BrandTextStyle(destructive: true))
                                .disabled(isSyncing || auth.isBusy)
                                Spacer()
                                Button("删除账号…", role: .destructive) { confirmDelete = true }
                                    .buttonStyle(BrandTextStyle(destructive: true))
                                    .disabled(isSyncing || auth.isBusy)
                                    .accessibilityIdentifier("account-delete")
                            }
                        }
                    }
                    VStack(alignment: .leading, spacing: 12) {
                        BrandSectionTitle("关于")
                        Link("应用支持", destination: URL(string: "https://rocket-math-4kg.pages.dev/app-support.html")!)
                            .buttonStyle(BrandTextStyle())
                        Text("学习数据默认保存在本机；云同步须手动操作；AI 总结会发送错题题干、作答、正确答案与耗时样例至 DeepSeek。")
                        Text("本地优先：口算、练习和本地分析免费，未登录也能离线使用。云同步与 AI 家长总结需登录并拥有有效月度会员。")
                    }
                    .font(Theme.captionFont).foregroundStyle(Theme.sub)
                    .frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 6)
                }
                .frame(maxWidth: 620)
                .padding(Theme.pad)
                .frame(maxWidth: .infinity)
            }
            .accessibilityIdentifier("account-scroll")
            .background(Theme.pageBackground.ignoresSafeArea())
            .foregroundStyle(Theme.ink)
            .navigationTitle("账号")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    BrandTextButton("完成", action: onClose)
                }
            }
            .sheet(isPresented: $showAuth) {
                AuthView()
                    .environment(auth)
            }
            .confirmationDialog("删除账号？", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("删除云端账号", role: .destructive) {
                    Task {
                        let ok = await auth.deleteAccount()
                        deleteMessage = ok
                            ? "服务器已确认删除。本机学习数据和原账号关联仍保留。"
                            : (auth.lastError ?? "删除失败")
                    }
                }
                Button("取消", role: .cancel) {}
            } message: {
                Text("请求清理账号关联的云端学习记录并停用账号。服务端保留去除登录标识的账号占位记录，订阅关联记录保留以防重复认领，非全部日志和备份删除。只有服务器确认成功后才退出。本机数据和原账号关联保留。删除账号不会取消 Apple 订阅，请先管理订阅。")
            }
            .task {
                await auth.refreshMe()
                await store.loadProducts()
                await store.refresh()
            }
        }
    }

    private var canSync: Bool { ownsLocalData && store.canUseCloud(auth) }

    private var ownsLocalData: Bool {
        guard let user = auth.user else { return false }
        return auth.syncOwnership.allows(userId: user.id, studentId: studentId)
    }

    private func syncNow() async {
        guard auth.isLoggedIn else { return }
        isSyncing = true
        syncMessage = ""
        defer { isSyncing = false }
        do {
            let snap = try await ProgressSync.sync(
                storage: storage,
                studentId: studentId,
                auth: auth
            )
            let n = snap.tracks.count + snap.practices.count + snap.mistakes.count
            syncMessage = L10n.format("已同步 %@ 条学习记录，另含经验与手速阈值。", L10n.number(n))
        } catch {
            syncMessage = L10n.format("同步失败：%@", L10n.text(error.localizedDescription))
        }
    }
}
