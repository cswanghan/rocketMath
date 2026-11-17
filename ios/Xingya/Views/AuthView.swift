// 登录 / 注册。对接 Cloudflare /api/auth/*。

import SwiftUI

struct AuthView: View {
    @Environment(AuthSession.self) private var auth
    @Environment(\.dismiss) private var dismiss

    @State private var mode: Mode = .login
    @State private var username = ""
    @State private var password = ""
    @State private var email = ""

    private enum Mode { case login, register }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                VStack(spacing: 8) {
                    SunSprout().frame(width: 72, height: 72)
                    Text(L10n.text(mode == .login ? "登录星芽" : "注册星芽")).font(Theme.titleFont(26))
                }
                .padding(.top, 20)
                Picker("方式", selection: $mode) {
                    Text("登录").tag(Mode.login)
                    Text("注册").tag(Mode.register)
                }
                .pickerStyle(.segmented)
                

                BrandCard {
                    BrandTextField("用户名", text: $username)
                        .textContentType(.username)
                        .autocorrectionDisabled()
                        #if os(iOS)
                        .textInputAutocapitalization(.never)
                        #endif
                        .accessibilityIdentifier("auth-username")
                    BrandSecureField("密码", text: $password)
                        .textContentType(mode == .login ? .password : .newPassword)
                        .accessibilityIdentifier("auth-password")
                    if mode == .register {
                        BrandTextField("邮箱", text: $email)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            #if os(iOS)
                            .textInputAutocapitalization(.never)
                            #endif
                            .accessibilityIdentifier("auth-email")
                    }
                                    Text(L10n.text(mode == .login
                       ? "登录并开通会员后可手动同步进度。"
                       : "用户名 3–20 字，密码至少 6 位。"))
                        .font(Theme.captionFont).foregroundStyle(Theme.sub)
                }

                if let err = auth.lastError, !err.isEmpty {
                    Group {
                        BrandNotice(message: L10n.text(err), isError: true)
                            .accessibilityIdentifier("auth-error")
                    }
                }

                Group {
                    BrandPrimaryButton(mode == .login ? "登录" : "注册并登录", isLoading: auth.isBusy) {
                        Task {
                            if mode == .login {
                                await auth.login(username: username.trimmingCharacters(in: .whitespaces), password: password)
                            } else {
                                await auth.register(
                                    username: username.trimmingCharacters(in: .whitespaces),
                                    password: password,
                                    email: email.trimmingCharacters(in: .whitespaces)
                                )
                            }
                            if auth.isLoggedIn { dismiss() }
                        }
                    }
                    .disabled(!canSubmit || auth.isBusy)
                    .accessibilityIdentifier("auth-submit")
                }
                Text(L10n.text("或使用 Apple 账号"))
                    .font(Theme.captionFont).foregroundStyle(Theme.sub)
                AppleSignInButton(auth: auth) { dismiss() }
                    .frame(height: 50)
                    .disabled(auth.isBusy)
                Text(L10n.text("Apple 登录创建独立账号，不会自动合并已有账号或会员。"))
                    .font(Theme.captionFont).foregroundStyle(Theme.sub)
                }
                .frame(maxWidth: 520)
                .padding(Theme.pad)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.pageBackground.ignoresSafeArea())
            .foregroundStyle(Theme.ink)
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    BrandTextButton("关闭") { dismiss() }
                }
            }
        }
    }

    private var canSubmit: Bool {
        let u = username.trimmingCharacters(in: .whitespaces)
        guard u.count >= 3, password.count >= 6 else { return false }
        if mode == .register {
            return email.contains("@") && email.contains(".")
        }
        return true
    }
}
