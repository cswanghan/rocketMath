import SwiftUI
import AuthenticationServices

/// The official system control owns its text, logo, accessibility, and language.
/// No Apple credential is persisted here; only AuthSession saves our app JWT.
struct AppleSignInButton: UIViewRepresentable {
    let auth: AuthSession
    let onSuccess: @MainActor () -> Void

    func makeCoordinator() -> Coordinator { Coordinator(auth: auth, onSuccess: onSuccess) }
    func makeUIView(context: Context) -> ASAuthorizationAppleIDButton {
        let button = ASAuthorizationAppleIDButton(type: .continue, style: .black)
        button.cornerRadius = 12
        button.accessibilityIdentifier = "auth-apple"
        button.addTarget(context.coordinator, action: #selector(Coordinator.signIn), for: .touchUpInside)
        context.coordinator.button = button
        return button
    }
    func updateUIView(_ button: ASAuthorizationAppleIDButton, context: Context) {
        button.isEnabled = !auth.isBusy
    }

    static func dismantleUIView(_ button: ASAuthorizationAppleIDButton, coordinator: Coordinator) {
        coordinator.detach()
    }

    @MainActor
    final class Coordinator: NSObject, ASAuthorizationControllerDelegate {
        weak var button: ASAuthorizationAppleIDButton?
        private let auth: AuthSession
        private let onSuccess: @MainActor () -> Void
        // Keep the active authorization strongly owned while the app is inactive
        // or backgrounded. Only a callback or explicit view dismissal finishes it;
        // scene-phase changes must not clear its state or start another request.
        private var controller: ASAuthorizationController?
        private var continuation: CheckedContinuation<AppleSignInCredential, Error>?
        private var expectedState: String?
        private var presentationContext: PresentationContext?
        private var detached = false
        private let performRequests: (ASAuthorizationController) -> Void

        /// Each controller retains its own origin window, including sheet windows.
        /// Never choose a different scene's key window or force-unwrap after finish.
        final class PresentationContext: NSObject, ASAuthorizationControllerPresentationContextProviding {
            let window: ASPresentationAnchor
            init(window: ASPresentationAnchor) { self.window = window }
            func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor { window }
        }

        init(auth: AuthSession, onSuccess: @escaping @MainActor () -> Void,
             performRequests: @escaping (ASAuthorizationController) -> Void = { $0.performRequests() }) {
            self.auth = auth
            self.onSuccess = onSuccess
            self.performRequests = performRequests
        }

        @objc func signIn() {
            guard !auth.isBusy else { return }
            Task {
                await auth.signInWithApple { challenge, nonce in
                    try await self.authorize(challenge: challenge, rawNonce: nonce)
                }
                if auth.isLoggedIn { onSuccess() }
            }
        }

        func authorize(challenge: AppleSignInChallenge, rawNonce: String) async throws -> AppleSignInCredential {
            guard !detached else { throw AppleSignInClientError.cancelled }
            guard let window = button?.window, continuation == nil else { throw AppleSignInClientError.unavailable }
            let context = PresentationContext(window: window)
            presentationContext = context
            expectedState = challenge.challengeId
            let request = ASAuthorizationAppleIDProvider().createRequest()
            request.requestedScopes = [.fullName, .email]
            request.nonce = AppleSignInNonce.hash(rawNonce)
            request.state = challenge.challengeId
            return try await withCheckedThrowingContinuation { continuation in
                self.continuation = continuation
                let controller = ASAuthorizationController(authorizationRequests: [request])
                controller.delegate = self
                controller.presentationContextProvider = context
                self.controller = controller
                performRequests(controller)
            }
        }

        func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
            guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential else {
                complete(controller: controller, result: .failure(AppleSignInClientError.invalid))
                return
            }
            let name = credential.fullName.map { AppleSignInCredential.Name(givenName: $0.givenName, familyName: $0.familyName) }
            complete(controller: controller, result: .success(.init(state: credential.state,
                identityToken: credential.identityToken, authorizationCode: credential.authorizationCode, fullName: name)))
        }

        func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
            let cancelled = (error as? ASAuthorizationError)?.code == .canceled
            complete(controller: controller, result: .failure(cancelled ? AppleSignInClientError.cancelled : AppleSignInClientError.unavailable))
        }

        func complete(controller: ASAuthorizationController, result: Result<AppleSignInCompletion, Error>) {
            // An old/duplicate callback must never finish a newer authorization.
            guard controller === self.controller, let expectedState, continuation != nil else { return }
            finish(result.flatMap { completion in Result { try completion.credential(expectedState: expectedState) } })
        }

        func detach() {
            detached = true
            button = nil
            finish(.failure(AppleSignInClientError.cancelled))
        }

        private func finish(_ result: Result<AppleSignInCredential, Error>) {
            let pending = continuation
            continuation = nil
            expectedState = nil
            controller?.delegate = nil
            controller?.presentationContextProvider = nil
            controller = nil
            presentationContext = nil
            pending?.resume(with: result)
        }
    }
}
