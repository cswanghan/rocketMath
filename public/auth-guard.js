(function() {
    const style = document.createElement('style');
    style.textContent = `
        .lp-overlay {
            display: none; position: fixed; inset: 0; z-index: 950;
            background: rgba(0,0,0,0.6); backdrop-filter: blur(6px);
            justify-content: center; align-items: center; padding: 20px;
        }
        .lp-overlay.open { display: flex; }
        .lp-box {
            background: #1e2030; border: 1px solid #2d3050; border-radius: 16px;
            padding: 36px 32px; max-width: 380px; width: 90%; text-align: center;
            box-shadow: 0 16px 40px rgba(0,0,0,0.4);
            animation: lpIn 0.2s ease;
        }
        @keyframes lpIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .lp-box .lp-icon { font-size: 2.4rem; margin-bottom: 12px; }
        .lp-box h3 {
            font-size: 1.3rem; font-weight: 600; margin-bottom: 8px; color: #e8eaf6;
        }
        .lp-box p {
            color: #9ea3c0; font-size: 0.85rem; line-height: 1.6; margin-bottom: 24px;
        }
        .lp-actions { display: flex; gap: 10px; }
        .lp-btn {
            flex: 1; padding: 10px 14px; border: none; border-radius: 18px;
            font-size: 0.85rem; cursor: pointer; font-weight: 500;
            transition: all 0.15s;
        }
        .lp-btn-outline { background: transparent; border: 1px solid #4a4f7a; color: #9ea3c0; }
        .lp-btn-outline:hover { background: rgba(74,79,122,0.3); }
        .lp-btn-primary { background: #6366f1; color: white; }
        .lp-btn-primary:hover { background: #5558e6; }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.className = 'lp-overlay';
    overlay.id = 'loginPromptOverlay';
    overlay.innerHTML = `
        <div class="lp-box">
            <div class="lp-icon">&#x1F680;</div>
            <h3>需要登录</h3>
            <p id="loginPromptMsg">登录后可使用完整功能。</p>
            <div class="lp-actions">
                <button class="lp-btn lp-btn-outline" onclick="window._closeLoginPrompt()">暂不登录</button>
                <button class="lp-btn lp-btn-primary" onclick="window._goToLogin()">去登录 / 注册</button>
            </div>
        </div>
    `;
    document.addEventListener('DOMContentLoaded', () => document.body.appendChild(overlay));
})();

window._closeLoginPrompt = function() {
    const overlay = document.getElementById('loginPromptOverlay');
    overlay.classList.remove('open');
    if (overlay._onCancel) { overlay._onCancel(); overlay._onCancel = null; }
};

window._goToLogin = function() {
    const redirect = encodeURIComponent(location.pathname + location.search);
    window.location.href = '/login.html?redirect=' + redirect;
};

window.requireLogin = function(message, onCancel) {
    if (localStorage.getItem('token')) return true;

    const overlay = document.getElementById('loginPromptOverlay');
    if (overlay) {
        document.getElementById('loginPromptMsg').textContent = message || '登录后可使用完整功能。';
        overlay._onCancel = onCancel || null;
        overlay.classList.add('open');
    }
    return false;
};
