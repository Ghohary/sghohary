(function() {
    'use strict';

    // ============================================
    // SECURITY: Admin Authentication System
    // ============================================
    // This handles all authentication for the admin dashboard
    // Using sessionStorage + localStorage with proper timeout management

    const AUTH_CONFIG = {
        sessionKey: 'ghoharyAdminSession',
        credentialsKey: 'ghoharyAdminCredentials',
        sessionTimeout: 30 * 60 * 1000, // 30 minutes
        maxLoginAttempts: 5,
        lockoutDuration: 15 * 60 * 1000, // 15 minute lockout
    };

    function createSafeStorage(storageRef) {
        return {
            getItem(key) {
                try {
                    return storageRef.getItem(key);
                } catch (error) {
                    return null;
                }
            },
            setItem(key, value) {
                try {
                    storageRef.setItem(key, value);
                } catch (error) {
                    // Ignore storage failures so auth UI can still render.
                }
            },
            removeItem(key) {
                try {
                    storageRef.removeItem(key);
                } catch (error) {
                    // Ignore storage failures so auth UI can still render.
                }
            }
        };
    }

    const safeLocalStorage = createSafeStorage(window.localStorage);
    const safeSessionStorage = createSafeStorage(window.sessionStorage);

    // Check if user has valid session (checks for server-issued token)
    function isAuthenticated() {
        // Check for server-issued admin token first
        const token = safeLocalStorage.getItem('adminToken') || safeSessionStorage.getItem('adminToken');
        if (token) {
            // Validate token hasn't expired client-side (server validates on API calls)
            const session = safeSessionStorage.getItem(AUTH_CONFIG.sessionKey);
            if (session) {
                try {
                    const sessionData = JSON.parse(session);
                    const now = Date.now();
                    if (now - sessionData.timestamp > AUTH_CONFIG.sessionTimeout) {
                        safeSessionStorage.removeItem(AUTH_CONFIG.sessionKey);
                        safeLocalStorage.removeItem('adminToken');
                        safeSessionStorage.removeItem('adminToken');
                        return false;
                    }
                    sessionData.timestamp = now;
                    safeSessionStorage.setItem(AUTH_CONFIG.sessionKey, JSON.stringify(sessionData));
                    return true;
                } catch (e) {
                    return false;
                }
            }
        }

        // Fallback: check legacy session
        const session = safeSessionStorage.getItem(AUTH_CONFIG.sessionKey);
        if (!session) return false;
        try {
            const sessionData = JSON.parse(session);
            const now = Date.now();
            if (now - sessionData.timestamp > AUTH_CONFIG.sessionTimeout) {
                safeSessionStorage.removeItem(AUTH_CONFIG.sessionKey);
                return false;
            }
            sessionData.timestamp = now;
            safeSessionStorage.setItem(AUTH_CONFIG.sessionKey, JSON.stringify(sessionData));
            return true;
        } catch (e) {
            return false;
        }
    }

    // Get current admin email if authenticated
    function getCurrentAdmin() {
        if (!isAuthenticated()) return null;
        try {
            const session = JSON.parse(safeSessionStorage.getItem(AUTH_CONFIG.sessionKey));
            return session.email;
        } catch (e) {
            return null;
        }
    }

    // Login function — validates against the server API (supports TOTP + static codes)
    async function login(accessCode) {
        try {
            const response = await fetch('/api/admin/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessCode })
            });

            const payload = await response.json().catch(() => ({}));

            if (response.ok && payload?.success && payload?.token) {
                // Store server-issued JWT token
                safeLocalStorage.setItem('adminToken', payload.token);
                safeSessionStorage.setItem('adminToken', payload.token);

                // Create local session for UI state
                const session = {
                    email: 'Admin',
                    timestamp: Date.now(),
                    token: payload.token
                };
                safeSessionStorage.setItem(AUTH_CONFIG.sessionKey, JSON.stringify(session));

                return { success: true, message: 'Access granted', code: 'SUCCESS' };
            }

            return {
                success: false,
                message: payload?.error || 'Invalid code. Please try again.',
                code: 'INVALID_CREDENTIALS'
            };
        } catch (e) {
            console.error('Login error:', e);
            return {
                success: false,
                message: 'Unable to verify. Please check your connection.',
                code: 'ERROR'
            };
        }
    }

    // Logout function
    function logout() {
        safeSessionStorage.removeItem(AUTH_CONFIG.sessionKey);
        safeLocalStorage.removeItem('adminToken');
        safeSessionStorage.removeItem('adminToken');
        window.location.href = 'admin.html'; // Redirect to login
    }

    // Create login UI
    function createLoginUI() {
        const loginHTML = `
            <div id="adminLoginContainer" class="admin-login-container">
                <div class="admin-login-left">
                    <div class="admin-login-left-content">
                        <div class="admin-login-brand-lg">GHOHARY</div>
                        <p class="admin-login-tagline">Admin Dashboard</p>
                        <div class="admin-login-left-decoration">
                            <div class="admin-deco-line"></div>
                            <div class="admin-deco-line"></div>
                            <div class="admin-deco-line"></div>
                        </div>
                    </div>
                </div>
                <div class="admin-login-right">
                    <div class="admin-login-brand-mobile">GHOHARY</div>
                    <div class="admin-login-modal">
                        <div class="admin-login-header">
                            <h1>Welcome back</h1>
                            <p>Enter your access code to continue</p>
                        </div>

                        <form id="adminLoginForm" class="admin-login-form" autocomplete="off">
                            <div class="admin-login-digits" id="adminDigitsRow">
                                <input type="tel" maxlength="1" pattern="[0-9]" inputmode="numeric" class="admin-digit-box" data-idx="0" autocomplete="off" aria-label="Digit 1" required>
                                <input type="tel" maxlength="1" pattern="[0-9]" inputmode="numeric" class="admin-digit-box" data-idx="1" autocomplete="off" aria-label="Digit 2" required>
                                <input type="tel" maxlength="1" pattern="[0-9]" inputmode="numeric" class="admin-digit-box" data-idx="2" autocomplete="off" aria-label="Digit 3" required>
                                <span class="admin-digit-dash">–</span>
                                <input type="tel" maxlength="1" pattern="[0-9]" inputmode="numeric" class="admin-digit-box" data-idx="3" autocomplete="off" aria-label="Digit 4" required>
                                <input type="tel" maxlength="1" pattern="[0-9]" inputmode="numeric" class="admin-digit-box" data-idx="4" autocomplete="off" aria-label="Digit 5" required>
                                <input type="tel" maxlength="1" pattern="[0-9]" inputmode="numeric" class="admin-digit-box" data-idx="5" autocomplete="off" aria-label="Digit 6" required>
                            </div>
                            <input type="hidden" id="adminAccessCode" name="adminAccessCode" value="">

                            <div id="loginMessage" class="admin-login-message"></div>

                            <button type="submit" class="admin-login-button" id="adminLoginBtn">
                                <span>Continue</span>
                                <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h12M12 5l5 5-5 5"/></svg>
                            </button>
                        </form>

                        <div class="admin-login-footer">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 1 1 8 0v4"/></svg>
                            <span>Protected with end-to-end encryption</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return loginHTML;
    }

    // Add login styles
    function injectLoginStyles() {
        const styles = `
            /* ── Split-screen login ── */
            .admin-login-container {
                position: fixed;
                inset: 0;
                display: flex;
                z-index: 10000;
                font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
                overflow: hidden;
            }

            /* Left panel — brand / decorative */
            .admin-login-left {
                flex: 0 0 45%;
                background: #000;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                overflow: hidden;
            }

            .admin-login-left::before {
                content: '';
                position: absolute;
                inset: 0;
                background:
                    radial-gradient(ellipse 80% 60% at 20% 80%, rgba(255,255,255,0.04) 0%, transparent 70%),
                    radial-gradient(ellipse 60% 50% at 80% 20%, rgba(255,255,255,0.03) 0%, transparent 70%);
                pointer-events: none;
            }

            .admin-login-left-content {
                position: relative;
                z-index: 1;
                text-align: center;
                padding: 40px;
            }

            .admin-login-brand-lg {
                font-size: clamp(36px, 5vw, 52px);
                font-weight: 600;
                color: #fff;
                letter-spacing: 0.18em;
                margin-bottom: 12px;
            }

            .admin-login-tagline {
                font-size: 13px;
                color: rgba(255,255,255,0.45);
                letter-spacing: 0.12em;
                text-transform: uppercase;
                font-weight: 400;
            }

            .admin-login-left-decoration {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                margin-top: 32px;
            }

            .admin-deco-line {
                width: 28px;
                height: 1px;
                background: rgba(255,255,255,0.15);
            }

            .admin-deco-line:nth-child(2) {
                width: 48px;
                background: rgba(255,255,255,0.3);
            }

            .admin-login-brand-mobile {
                display: none;
                font-size: 20px;
                font-weight: 600;
                color: #000;
                letter-spacing: 0.14em;
                text-align: center;
                margin-bottom: 32px;
            }

            /* Right panel — form */
            .admin-login-right {
                flex: 1;
                background: #fff;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: clamp(32px, 6vw, 64px);
                position: relative;
            }

            .admin-login-modal {
                width: 100%;
                max-width: 380px;
            }

            .admin-login-header {
                margin-bottom: 32px;
            }

            .admin-login-header h1 {
                font-size: clamp(26px, 4vw, 32px);
                font-weight: 600;
                color: #000;
                letter-spacing: -0.02em;
                margin: 0 0 8px;
                line-height: 1.15;
            }

            .admin-login-header p {
                font-size: 14px;
                color: #737373;
                font-weight: 400;
                margin: 0;
            }

            .admin-login-form {
                display: flex;
                flex-direction: column;
                gap: 24px;
            }

            /* ── 6-digit code boxes ── */
            .admin-login-digits {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }

            .admin-digit-box {
                width: 48px;
                height: 56px;
                border: 1.5px solid rgba(0,0,0,0.15);
                border-radius: 10px;
                background: #fafafa;
                font-size: 22px;
                font-weight: 600;
                font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
                color: #000;
                text-align: center;
                padding: 0;
                caret-color: #000;
                transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
                -moz-appearance: textfield;
            }

            .admin-digit-box::-webkit-inner-spin-button,
            .admin-digit-box::-webkit-outer-spin-button {
                display: none;
            }

            .admin-digit-box:focus {
                outline: none;
                border-color: #000;
                background: #fff;
                box-shadow: 0 0 0 3px rgba(0,0,0,0.08);
            }

            .admin-digit-box.filled {
                border-color: #000;
                background: #fff;
            }

            .admin-digit-box.error {
                border-color: #DC2626;
                background: #fef2f2;
                animation: digit-shake 0.35s ease;
            }

            .admin-digit-dash {
                font-size: 18px;
                color: rgba(0,0,0,0.2);
                user-select: none;
                padding: 0 2px;
            }

            @keyframes digit-shake {
                0%, 100% { transform: translateX(0); }
                20% { transform: translateX(-4px); }
                40% { transform: translateX(4px); }
                60% { transform: translateX(-3px); }
                80% { transform: translateX(3px); }
            }

            /* Submit button */
            .admin-login-button {
                width: 100%;
                height: 52px;
                padding: 0 24px;
                background: #000;
                color: #fff;
                border: none;
                border-radius: 10px;
                font-size: 14px;
                font-weight: 600;
                font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
                letter-spacing: 0.02em;
                cursor: pointer;
                transition: opacity 0.2s, transform 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.12);
                text-transform: none;
                position: relative;
                overflow: hidden;
            }

            .admin-login-button::before { content: none; }

            .admin-login-button:hover {
                opacity: 0.88;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.18);
                letter-spacing: 0.02em;
                background: #000;
            }

            .admin-login-button:active {
                transform: translateY(0);
            }

            .admin-login-button:disabled {
                opacity: 0.35;
                cursor: not-allowed;
                transform: none;
            }

            .admin-login-button svg {
                stroke: #fff;
                flex-shrink: 0;
            }

            /* Message */
            .admin-login-message {
                padding: 10px 14px;
                border-radius: 8px;
                font-size: 13px;
                display: none;
                align-items: center;
                gap: 8px;
                line-height: 1.4;
            }

            .admin-login-message.error {
                background: #fef2f2;
                color: #991b1b;
                border: 1px solid rgba(220,38,38,0.15);
                display: flex;
            }

            .admin-login-message.success {
                background: #f0fdf4;
                color: #166534;
                border: 1px solid rgba(22,101,52,0.15);
                display: flex;
            }

            /* Footer */
            .admin-login-footer {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                margin-top: 32px;
                color: #b5b5b5;
            }

            .admin-login-footer svg {
                stroke: #b5b5b5;
                flex-shrink: 0;
            }

            .admin-login-footer span {
                font-size: 11px;
                letter-spacing: 0.01em;
            }

            /* ── Responsive: stack on mobile ── */
            @media (max-width: 768px) {
                .admin-login-left {
                    display: none;
                }

                .admin-login-brand-mobile {
                    display: block;
                }

                .admin-login-right {
                    padding: 32px 24px;
                }

                .admin-digit-box {
                    width: 44px;
                    height: 52px;
                    font-size: 20px;
                }
            }

            @media (max-width: 380px) {
                .admin-digit-box {
                    width: 38px;
                    height: 46px;
                    font-size: 18px;
                    border-radius: 8px;
                }

                .admin-login-digits {
                    gap: 5px;
                }
            }
        `;

        const styleTag = document.createElement('style');
        styleTag.textContent = styles;
        document.head.appendChild(styleTag);
    }

    // Initialize authentication
    function initAuth() {
        // If not authenticated, show login
        if (!isAuthenticated()) {
            // Hide ALL admin content — container, header, everything
            document.querySelectorAll('.container, .admin-header, .tabs, #products, #orders, #analytics, #invoices, #custom-orders, #settings').forEach(el => {
                el.style.display = 'none';
            });
            // Also hide body overflow to prevent flicker
            document.body.style.overflow = 'hidden';

            // Inject styles
            injectLoginStyles();

            // Add login UI to body
            const loginUI = createLoginUI();
            document.body.insertAdjacentHTML('afterbegin', loginUI);

            // ── Digit-box auto-advance logic ──
            const digitsRow = document.getElementById('adminDigitsRow');
            const digitBoxes = digitsRow ? Array.from(digitsRow.querySelectorAll('.admin-digit-box')) : [];
            const hiddenInput = document.getElementById('adminAccessCode');

            function syncHiddenInput() {
                hiddenInput.value = digitBoxes.map(b => b.value).join('');
            }

            function clearDigitErrors() {
                digitBoxes.forEach(b => b.classList.remove('error'));
                const msg = document.getElementById('loginMessage');
                if (msg) { msg.className = 'admin-login-message'; msg.textContent = ''; }
            }

            digitBoxes.forEach((box, idx) => {
                box.addEventListener('input', function() {
                    clearDigitErrors();
                    const val = this.value.replace(/\D/g, '');
                    this.value = val.slice(-1);
                    if (val && this.value) {
                        this.classList.add('filled');
                        if (idx < digitBoxes.length - 1) {
                            digitBoxes[idx + 1].focus();
                        }
                    } else {
                        this.classList.remove('filled');
                    }
                    syncHiddenInput();
                    // Auto-submit when all 6 digits filled
                    if (hiddenInput.value.length === 6) {
                        document.getElementById('adminLoginForm').dispatchEvent(new Event('submit', { cancelable: true }));
                    }
                });

                box.addEventListener('keydown', function(e) {
                    if (e.key === 'Backspace' && !this.value && idx > 0) {
                        digitBoxes[idx - 1].value = '';
                        digitBoxes[idx - 1].classList.remove('filled');
                        digitBoxes[idx - 1].focus();
                        syncHiddenInput();
                    }
                });

                box.addEventListener('paste', function(e) {
                    e.preventDefault();
                    const pasted = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
                    pasted.split('').forEach((ch, i) => {
                        if (digitBoxes[i]) {
                            digitBoxes[i].value = ch;
                            digitBoxes[i].classList.add('filled');
                        }
                    });
                    syncHiddenInput();
                    const nextEmpty = digitBoxes.findIndex(b => !b.value);
                    (digitBoxes[nextEmpty >= 0 ? nextEmpty : digitBoxes.length - 1]).focus();
                    if (hiddenInput.value.length === 6) {
                        document.getElementById('adminLoginForm').dispatchEvent(new Event('submit', { cancelable: true }));
                    }
                });

                box.addEventListener('focus', function() { this.select(); });
            });

            // Focus first digit on load
            if (digitBoxes[0]) setTimeout(() => digitBoxes[0].focus(), 100);

            // Handle login form submission
            let submitting = false;
            const loginForm = document.getElementById('adminLoginForm');
            if (loginForm) {
                loginForm.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    if (submitting) return;

                    const accessCode = hiddenInput.value.trim();
                    const messageDiv = document.getElementById('loginMessage');
                    const submitBtn = document.getElementById('adminLoginBtn');

                    // Validate input
                    if (!accessCode || accessCode.length !== 6) {
                        messageDiv.textContent = 'Please enter all 6 digits.';
                        messageDiv.className = 'admin-login-message error';
                        digitBoxes.forEach(b => { if (!b.value) b.classList.add('error'); });
                        return;
                    }

                    // Show loading state
                    submitting = true;
                    if (submitBtn) {
                        submitBtn.disabled = true;
                        submitBtn.querySelector('span').textContent = 'Verifying...';
                    }

                    // Attempt login (now async — validates against server TOTP)
                    const result = await login(accessCode);

                    if (result.success) {
                        messageDiv.textContent = 'Access granted';
                        messageDiv.className = 'admin-login-message success';
                        digitBoxes.forEach(b => b.style.borderColor = '#16a34a');

                        // Reload page to show admin content
                        setTimeout(() => {
                            location.reload();
                        }, 400);
                    } else {
                        submitting = false;
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.querySelector('span').textContent = 'Continue';
                        }

                        messageDiv.textContent = result.message;
                        messageDiv.className = 'admin-login-message error';

                        // Shake and clear digit boxes
                        digitBoxes.forEach(b => {
                            b.classList.add('error');
                            b.value = '';
                            b.classList.remove('filled');
                        });
                        hiddenInput.value = '';
                        setTimeout(() => digitBoxes[0].focus(), 400);
                    }
                });
            }
        } else {
            // User is authenticated, show admin content and add logout button
            showAdminContent();
        }
    }

    // Show admin content and add logout button
    function showAdminContent() {
        // Add logout button to page
        const logoutBtn = document.createElement('button');
        logoutBtn.textContent = 'Logout';
        logoutBtn.className = 'admin-logout-btn';
        logoutBtn.onclick = logout;
        
        // Add logout button styles if not already present
        if (!document.getElementById('logoutBtnStyles')) {
            const style = document.createElement('style');
            style.id = 'logoutBtnStyles';
            style.textContent = `
                .admin-logout-btn {
                    position: fixed;
                    top: clamp(20px, 3vh, 28px);
                    right: clamp(20px, 3vw, 32px);
                    padding: clamp(12px, 2vh, 16px) clamp(20px, 3vw, 28px);
                    background: #1A1A1A;
                    color: #FFFFFF;
                    border: none;
                    border-radius: 0;
                    font-size: clamp(11px, 1.6vw, 13px);
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 0.12em;
                    cursor: pointer;
                    z-index: 1002;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                }
                
                .admin-logout-btn:hover {
                    background: #000000;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(logoutBtn);
    }

    // Expose auth functions globally
    window.ghoharyAuth = {
        login,
        logout,
        isAuthenticated,
        getCurrentAdmin,
        initAuth
    };

    // Initialize on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAuth);
    } else {
        initAuth();
    }

})();
