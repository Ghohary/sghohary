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
    // CHANGE THESE TO YOUR DESIRED EMAIL AND PASSWORD
    function initializeAdminCredentials() {
        const adminEmail = 'admin@ghohary.com';
        const adminPassword = 'GhoharyLuxe2024!'; // CHANGE THIS to your desired password

        const credentials = {
            email: adminEmail,
            passwordHash: simpleHash(adminPassword),
            createdAt: new Date().getTime()
        };

        // Only store if not already set
        if (!localStorage.getItem(AUTH_CONFIG.credentialsKey)) {
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
    function login(email, password) {
        // Check if account is locked
        if (isAccountLocked()) {
            return {
                success: false,
                message: 'Account locked due to multiple failed attempts. Try again in 15 minutes.',
                code: 'ACCOUNT_LOCKED'
            };
        }

        try {
            const credentials = JSON.parse(localStorage.getItem(AUTH_CONFIG.credentialsKey));
            
            if (!credentials) {
                initializeAdminCredentials();
                const newCredentials = JSON.parse(localStorage.getItem(AUTH_CONFIG.credentialsKey));
                credentials = newCredentials;
            }

            // Verify email and password
            const passwordHash = simpleHash(password);
            
            if (email !== credentials.email || passwordHash !== credentials.passwordHash) {
                recordFailedAttempt();
                return {
                    success: false,
                    message: 'Invalid email or password.',
                    code: 'INVALID_CREDENTIALS'
                };
            }

            // Clear failed attempts
            clearFailedAttempts();

            // Create session
            const session = {
                email: email,
                timestamp: new Date().getTime(),
                ip: 'client', // Client-side only
                token: simpleHash(email + new Date().getTime())
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
                        <h1>GHOHARY Admin</h1>
                        <p>Secure Administration Portal</p>
                    </div>

                    <form id="adminLoginForm" class="admin-login-form">
                        <div class="admin-login-group">
                            <label for="adminEmail">Email Address</label>
                            <input 
                                type="email" 
                                id="adminEmail" 
                                name="email" 
                                placeholder="admin@ghohary.com"
                                required
                            >
                        </div>

                        <div class="admin-login-group">
                            <label for="adminPassword">Password</label>
                            <input 
                                type="password" 
                                id="adminPassword" 
                                name="password" 
                                placeholder="••••••••••••"
                                required
                            >
                        </div>

                        <div id="loginMessage" class="admin-login-message"></div>

                        <button type="submit" class="admin-login-button">
                            Sign In
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
                background: linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                font-family: 'Montserrat', sans-serif;
            }

            .admin-login-modal {
                background: #FFFFFF;
                border-radius: 0;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                width: 100%;
                max-width: 420px;
                padding: clamp(40px, 8vw, 60px);
                border: 1px solid rgba(0, 0, 0, 0.08);
            }

            .admin-login-header {
                text-align: center;
                margin-bottom: clamp(48px, 8vh, 64px);
            }

            .admin-login-header h1 {
                font-family: 'Cormorant Garamond', serif;
                font-size: clamp(36px, 5vw, 48px);
                font-weight: 300;
                letter-spacing: 0.15em;
                color: #1A1A1A;
                margin-bottom: clamp(12px, 2vh, 16px);
            }

            .admin-login-header p {
                font-size: clamp(12px, 1.8vw, 14px);
                color: #999999;
                letter-spacing: 0.12em;
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
                color: #1A1A1A;
                text-transform: uppercase;
                letter-spacing: 0.12em;
                font-weight: 500;
            }

            .admin-login-group input {
                padding: clamp(16px, 3vh, 20px);
                border: 1px solid rgba(0, 0, 0, 0.12);
                border-radius: 0;
                font-size: clamp(14px, 2vw, 16px);
                font-family: 'Montserrat', sans-serif;
                background: #FAFAFA;
                color: #1A1A1A;
                transition: all 0.3s ease;
            }

            .admin-login-group input::placeholder {
                color: #CCCCCC;
            }

            .admin-login-group input:focus {
                outline: none;
                background: #FFFFFF;
                border-color: #1A1A1A;
                box-shadow: 0 0 0 3px rgba(26, 26, 26, 0.06);
            }

            .admin-login-button {
                padding: clamp(16px, 3vh, 20px);
                background: #1A1A1A;
                color: #FFFFFF;
                border: none;
                border-radius: 0;
                font-size: clamp(13px, 1.8vw, 15px);
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 0.15em;
                cursor: pointer;
                transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
                margin-top: clamp(16px, 3vh, 24px);
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
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
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
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
                border-radius: 0;
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
                border-top: 1px solid rgba(0, 0, 0, 0.08);
            }

            .admin-login-footer p {
                font-size: clamp(11px, 1.6vw, 13px);
                color: #999999;
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

                    const email = document.getElementById('adminEmail').value.trim();
                    const password = document.getElementById('adminPassword').value;
                    const messageDiv = document.getElementById('loginMessage');

                    // Validate input
                    if (!email || !password) {
                        messageDiv.textContent = 'Please enter both email and password.';
                        messageDiv.className = 'admin-login-message error';
                        return;
                    }

                    // Attempt login
                    const result = login(email, password);

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
                        document.getElementById('adminPassword').value = '';
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
