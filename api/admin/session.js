const { isConfigured, isTotpEnabled, verifyAccessCode, issueAdminToken } = require('../_utils/admin-auth');

const DEFAULT_MAX_ATTEMPTS = 6;
const DEFAULT_LOCKOUT_MS = 5 * 60 * 1000;

if (!globalThis.__ghoharyAdminLoginAttempts) {
    globalThis.__ghoharyAdminLoginAttempts = new Map();
}
const loginAttempts = globalThis.__ghoharyAdminLoginAttempts;

function parseBody(req) {
    if (!req.body) return {};
    if (typeof req.body === 'string') {
        try {
            return JSON.parse(req.body);
        } catch (error) {
            return {};
        }
    }
    return req.body;
}

function maxAttempts() {
    const configured = Number(process.env.ADMIN_LOGIN_MAX_ATTEMPTS || DEFAULT_MAX_ATTEMPTS);
    if (!Number.isFinite(configured) || configured < 2) {
        return DEFAULT_MAX_ATTEMPTS;
    }
    return Math.floor(configured);
}

function lockoutMs() {
    const configured = Number(process.env.ADMIN_LOGIN_LOCKOUT_MS || DEFAULT_LOCKOUT_MS);
    if (!Number.isFinite(configured) || configured < 10_000) {
        return DEFAULT_LOCKOUT_MS;
    }
    return Math.floor(configured);
}

function getClientIp(req) {
    const forwarded = String(req.headers?.['x-forwarded-for'] || '')
        .split(',')[0]
        .trim();
    if (forwarded) return forwarded;
    return String(req.socket?.remoteAddress || 'unknown');
}

function getLockState(ip) {
    const state = loginAttempts.get(ip);
    if (!state) return { locked: false };

    const now = Date.now();
    if (state.lockedUntil && now < state.lockedUntil) {
        return { locked: true, retryAfterMs: state.lockedUntil - now };
    }

    if (state.lockedUntil || now - state.firstFailureMs > lockoutMs()) {
        loginAttempts.delete(ip);
    }
    return { locked: false };
}

function registerFailedAttempt(ip) {
    const now = Date.now();
    const windowMs = lockoutMs();
    const current = loginAttempts.get(ip);

    if (!current || now - current.firstFailureMs > windowMs) {
        loginAttempts.set(ip, {
            count: 1,
            firstFailureMs: now,
            lockedUntil: 0
        });
        return;
    }

    const nextCount = Number(current.count || 0) + 1;
    const nextState = {
        count: nextCount,
        firstFailureMs: current.firstFailureMs,
        lockedUntil: 0
    };

    if (nextCount >= maxAttempts()) {
        nextState.lockedUntil = now + windowMs;
    }

    loginAttempts.set(ip, nextState);
}

function clearAttempts(ip) {
    loginAttempts.delete(ip);
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!isConfigured()) {
        return res.status(500).json({ error: 'Admin access is not configured on the server.' });
    }

    const body = parseBody(req);
    const accessCode = String(body?.accessCode || '').trim();
    const ip = getClientIp(req);

    const lockState = getLockState(ip);
    if (lockState.locked) {
        const retryAfterSeconds = Math.max(1, Math.ceil(lockState.retryAfterMs / 1000));
        res.setHeader('Retry-After', String(retryAfterSeconds));
        return res.status(429).json({
            error: `Too many failed attempts. Try again in ${retryAfterSeconds} seconds.`
        });
    }

    if (!accessCode) {
        return res.status(400).json({
            error: isTotpEnabled() ? 'Authenticator code is required.' : 'Access code is required.'
        });
    }

    if (!verifyAccessCode(accessCode)) {
        registerFailedAttempt(ip);
        return res.status(401).json({
            error: isTotpEnabled() ? 'Invalid authenticator code.' : 'Invalid access code.'
        });
    }
    clearAttempts(ip);

    const tokenResult = issueAdminToken({ ip: req.headers['x-forwarded-for'] || '' });
    if (!tokenResult.ok) {
        return res.status(500).json({ error: tokenResult.error || 'Unable to create session token.' });
    }

    return res.status(200).json({
        success: true,
        token: tokenResult.token,
        expiresAt: tokenResult.payload.exp
    });
}
