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

    // Simple hash function (client-side - for additional obfuscation)
    function simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16);
    }

    // Initialize admin credentials (hardcoded for security)
    // CHANGE THIS TO YOUR DESIRED 6-DIGIT ACCESS CODE
    function initializeAdminCredentials() {
        const adminAccessCode = '120680';

        const credentials = {
            accessCodeHash: simpleHash(adminAccessCode),
            createdAt: new Date().getTime()
        };

        const existing = localStorage.getItem(AUTH_CONFIG.credentialsKey);
        if (!existing) {
            localStorage.setItem(AUTH_CONFIG.credentialsKey, JSON.stringify(credentials));
            return;
        }

        try {
            const parsed = JSON.parse(existing);
            if (!parsed || !parsed.accessCodeHash) {
                localStorage.setItem(AUTH_CONFIG.credentialsKey, JSON.stringify(credentials));
            }
        } catch (e) {
            localStorage.setItem(AUTH_CONFIG.credentialsKey, JSON.stringify(credentials));
        }
    }

    // Check if user has valid session
    function isAuthenticated() {
        const session = sessionStorage.getItem(AUTH_CONFIG.sessionKey);
        if (!session) return false;

        try {
            const sessionData = JSON.parse(session);
            const now = new Date().getTime();
            
            // Check if session has expired
            if (now - sessionData.timestamp > AUTH_CONFIG.sessionTimeout) {
                sessionStorage.removeItem(AUTH_CONFIG.sessionKey);
                return false;
            }

            // Update session timestamp (extend session on activity)
            sessionData.timestamp = now;
            sessionStorage.setItem(AUTH_CONFIG.sessionKey, JSON.stringify(sessionData));
            
            return true;
        } catch (e) {
            return false;
        }
    }

    // Get current admin email if authenticated
    function getCurrentAdmin() {
        if (!isAuthenticated()) return null;
        
        try {
            const session = JSON.parse(sessionStorage.getItem(AUTH_CONFIG.sessionKey));
            return session.email;
        } catch (e) {
            return null;
        }
    }

    // Check if account is locked due to failed attempts
    function isAccountLocked() {
        const lockoutData = localStorage.getItem('ghoharyAdminLockout');
        if (!lockoutData) return false;

        try {
            const lockout = JSON.parse(lockoutData);
            const now = new Date().getTime();
            
            if (now - lockout.timestamp < AUTH_CONFIG.lockoutDuration) {
                return true;
            }

            // Lockout expired
            localStorage.removeItem('ghoharyAdminLockout');
            return false;
        } catch (e) {
            return false;
        }
    }

    // Record failed login attempt
    function recordFailedAttempt() {
        const attemptKey = 'ghoharyAdminAttempts';
        let attempts = JSON.parse(localStorage.getItem(attemptKey) || '{"count": 0, "timestamp": 0}');
        const now = new Date().getTime();

        // Reset attempts if more than 1 hour has passed
        if (now - attempts.timestamp > 60 * 60 * 1000) {
            attempts = { count: 0, timestamp: now };
        }

        attempts.count++;
        attempts.timestamp = now;

        // Lock account after 5 failed attempts
        if (attempts.count >= AUTH_CONFIG.maxLoginAttempts) {
            localStorage.setItem('ghoharyAdminLockout', JSON.stringify({
                timestamp: now,
                attempts: attempts.count
            }));
            localStorage.removeItem(attemptKey);
            return 'locked';
        }

        localStorage.setItem(attemptKey, JSON.stringify(attempts));
        return 'failed';
    }

    // Clear failed attempts on successful login
    function clearFailedAttempts() {
        localStorage.removeItem('ghoharyAdminAttempts');
        localStorage.removeItem('ghoharyAdminLockout');
    }

    // Login function
    function login(accessCode) {
        // Check if account is locked
        if (isAccountLocked()) {
            return {
                success: false,
                message: 'Account locked due to multiple failed attempts. Try again in 15 minutes.',
                code: 'ACCOUNT_LOCKED'
            };
        }

        try {
            let credentials = JSON.parse(localStorage.getItem(AUTH_CONFIG.credentialsKey));
            
            if (!credentials) {
                initializeAdminCredentials();
                credentials = JSON.parse(localStorage.getItem(AUTH_CONFIG.credentialsKey));
            }

            // Verify access code
            const accessCodeHash = simpleHash(accessCode);

            if (accessCodeHash !== credentials.accessCodeHash) {
                recordFailedAttempt();
                return {
                    success: false,
                    message: 'Invalid access code.',
                    code: 'INVALID_CREDENTIALS'
                };
            }

            // Clear failed attempts
            clearFailedAttempts();

            // Create session
            const session = {
                email: 'Admin',
                timestamp: new Date().getTime(),
                ip: 'client', // Client-side only
                token: simpleHash(accessCode + new Date().getTime())
            };

            sessionStorage.setItem(AUTH_CONFIG.sessionKey, JSON.stringify(session));

            return {
                success: true,
                message: 'Login successful',
                code: 'SUCCESS'
            };
        } catch (e) {
            console.error('Login error:', e);
            return {
                success: false,
                message: 'An error occurred during login.',
                code: 'ERROR'
            };
        }
    }

    // Logout function
    function logout() {
        sessionStorage.removeItem(AUTH_CONFIG.sessionKey);
        window.location.href = 'admin.html'; // Redirect to login
    }

    // Create login UI
    function createLoginUI() {
        const loginHTML = `
            <div id="adminLoginContainer" class="admin-login-container">
                <div class="admin-login-modal">
                    <div class="admin-login-header">
                        <h1>GHOHARY</h1>
                        <p>Admin Access</p>
                    </div>

                    <form id="adminLoginForm" class="admin-login-form" autocomplete="off">
                        <div class="admin-login-group">
                            <label for="adminAccessCode">Access Code</label>
                            <input
                                type="password"
                                id="adminAccessCode"
                                name="adminAccessCode"
                                inputmode="numeric"
                                pattern="[0-9]*"
                                maxlength="6"
                                placeholder="••••••"
                                required
                                autocomplete="off"
                            >
                        </div>

                        <div id="loginMessage" class="admin-login-message"></div>

                        <button type="submit" class="admin-login-button">
                            Enter
                        </button>
                    </form>

                    <div class="admin-login-footer">
                        <p>© 2024 GHOHARY. All rights reserved.</p>
                    </div>
                </div>
            </div>
        `;

        return loginHTML;
    }

    // Add login styles
    function injectLoginStyles() {
        const styles = `
            .admin-login-container {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(180deg, #f7f5f2 0%, #ffffff 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                font-family: 'Montserrat', sans-serif;
            }

            .admin-login-modal {
                background: #FFFFFF;
                border-radius: 0;
                box-shadow: 0 20px 60px rgba(31, 26, 22, 0.12);
                width: 100%;
                max-width: 460px;
                padding: clamp(40px, 8vw, 60px);
                border: 1px solid rgba(31, 26, 22, 0.12);
            }

            .admin-login-header {
                text-align: center;
                margin-bottom: clamp(48px, 8vh, 64px);
            }

            .admin-login-header h1 {
                font-family: 'Cormorant Garamond', serif;
                font-size: clamp(32px, 4.6vw, 44px);
                font-weight: 300;
                letter-spacing: 0.3em;
                color: #1f1a16;
                margin-bottom: clamp(12px, 2vh, 16px);
            }

            .admin-login-header p {
                font-size: clamp(12px, 1.8vw, 14px);
                color: #8b7f76;
                letter-spacing: 0.2em;
                text-transform: uppercase;
                font-weight: 300;
            }

            .admin-login-form {
                display: flex;
                flex-direction: column;
                gap: clamp(24px, 4vh, 32px);
            }

            .admin-login-group {
                display: flex;
                flex-direction: column;
                gap: clamp(8px, 1.5vh, 12px);
            }

            .admin-login-group label {
                font-size: clamp(12px, 1.8vw, 14px);
                color: #1f1a16;
                text-transform: uppercase;
                letter-spacing: 0.18em;
                font-weight: 400;
            }

            .admin-login-group input {
                padding: clamp(16px, 3vh, 20px);
                border: 1px solid rgba(31, 26, 22, 0.16);
                border-radius: 0;
                font-size: clamp(16px, 2.4vw, 18px);
                font-family: 'Montserrat', sans-serif;
                background: #ffffff;
                color: #1f1a16;
                transition: all 0.3s ease;
                letter-spacing: 0.4em;
                text-align: center;
            }

            .admin-login-group input::placeholder {
                color: #CCCCCC;
            }

            .admin-login-group input:focus {
                outline: none;
                background: #ffffff;
                border-color: #1f1a16;
                box-shadow: 0 0 0 3px rgba(31, 26, 22, 0.08);
            }

            .admin-login-button {
                padding: clamp(16px, 3vh, 20px);
                background: #1f1a16;
                color: #FFFFFF;
                border: none;
                border-radius: 999px;
                font-size: clamp(13px, 1.8vw, 15px);
                font-weight: 400;
                text-transform: uppercase;
                letter-spacing: 0.28em;
                cursor: pointer;
                transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
                margin-top: clamp(16px, 3vh, 24px);
                box-shadow: 0 8px 24px rgba(31, 26, 22, 0.18);
            }

            .admin-login-button::before {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                width: 0;
                height: 0;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.2);
                transform: translate(-50%, -50%);
                transition: width 0.8s, height 0.8s;
            }

            .admin-login-button:hover {
                background: #000000;
                box-shadow: 0 12px 30px rgba(31, 26, 22, 0.24);
                transform: translateY(-2px);
            }

            .admin-login-button:hover::before {
                width: 400px;
                height: 400px;
            }

            .admin-login-button:active {
                transform: translateY(0);
            }

            .admin-login-message {
                padding: clamp(12px, 2vh, 16px);
                border-radius: 8px;
                border-left: 4px solid;
                font-size: clamp(12px, 1.8vw, 14px);
                display: none;
                min-height: 40px;
                display: flex;
                align-items: center;
            }

            .admin-login-message.error {
                background: linear-gradient(135deg, #FEF2F2 0%, #FEF1F1 100%);
                border-left-color: #DC2626;
                color: #7F1D1D;
                display: flex;
            }

            .admin-login-message.success {
                background: linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%);
                border-left-color: #10B981;
                color: #065F46;
                display: flex;
            }

            .admin-login-footer {
                text-align: center;
                margin-top: clamp(40px, 8vh, 56px);
                padding-top: clamp(24px, 4vh, 32px);
                border-top: 1px solid rgba(31, 26, 22, 0.08);
            }

            .admin-login-footer p {
                font-size: clamp(11px, 1.6vw, 13px);
                color: #8b7f76;
                letter-spacing: 0.05em;
            }

            @media (max-width: 480px) {
                .admin-login-modal {
                    border-radius: 0;
                    margin: 20px;
                }
            }
        `;

        const styleTag = document.createElement('style');
        styleTag.textContent = styles;
        document.head.appendChild(styleTag);
    }

    // Initialize authentication
    function initAuth() {
        // Initialize credentials on first load
        initializeAdminCredentials();

        // If not authenticated, show login
        if (!isAuthenticated()) {
            // Hide admin content
            const adminContent = document.getElementById('products') || document.querySelector('.tabs');
            if (adminContent) {
                adminContent.style.display = 'none';
            }

            // Inject styles
            injectLoginStyles();

            // Add login UI to body
            const loginUI = createLoginUI();
            document.body.insertAdjacentHTML('afterbegin', loginUI);

            // Handle login form submission
            const loginForm = document.getElementById('adminLoginForm');
            if (loginForm) {
                loginForm.addEventListener('submit', function(e) {
                    e.preventDefault();

                    const accessCode = document.getElementById('adminAccessCode').value.trim();
                    const messageDiv = document.getElementById('loginMessage');

                    // Validate input
                    if (!accessCode || accessCode.length !== 6) {
                        messageDiv.textContent = 'Please enter your 6-digit access code.';
                        messageDiv.className = 'admin-login-message error';
                        return;
                    }

                    // Attempt login
                    const result = login(accessCode);

                    if (result.success) {
                        messageDiv.textContent = 'Login successful! Redirecting...';
                        messageDiv.className = 'admin-login-message success';
                        
                        // Reload page to show admin content
                        setTimeout(() => {
                            location.reload();
                        }, 500);
                    } else {
                        messageDiv.textContent = result.message;
                        messageDiv.className = 'admin-login-message error';
                        
                        // Clear password field
                        document.getElementById('adminAccessCode').value = '';
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
