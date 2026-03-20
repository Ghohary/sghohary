const crypto = require('crypto');

const MIN_TOKEN_TTL_MS = 5 * 60 * 1000;
const DEFAULT_TOKEN_TTL_MS = 12 * 60 * 60 * 1000;
const DEFAULT_TOTP_STEP_SECONDS = 30;
const DEFAULT_TOTP_WINDOW = 1;
const TOTP_DIGITS = 6;
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function getConfiguredAccessCode() {
    return String(
        process.env.ADMIN_ACCESS_CODE
        || process.env.GHOHARY_ADMIN_CODE
        || ''
    ).trim();
}

function getTotpSecret() {
    return String(
        process.env.ADMIN_TOTP_SECRET
        || process.env.GHOHARY_ADMIN_TOTP_SECRET
        || ''
    )
        .trim()
        .replace(/\s+/g, '')
        .toUpperCase();
}

function isTotpEnabled() {
    return Boolean(getTotpSecret());
}

function isConfigured() {
    return isTotpEnabled() || Boolean(getConfiguredAccessCode());
}

function tokenTtlMs() {
    const configured = Number(process.env.ADMIN_TOKEN_TTL_MS || DEFAULT_TOKEN_TTL_MS);
    if (!Number.isFinite(configured)) return DEFAULT_TOKEN_TTL_MS;
    return Math.max(MIN_TOKEN_TTL_MS, Math.round(configured));
}

function signingSecret() {
    const explicit = String(process.env.ADMIN_SESSION_SECRET || '').trim();
    if (explicit) return explicit;
    const totpSecret = getTotpSecret();
    if (totpSecret) return totpSecret;
    return getConfiguredAccessCode();
}

function digest(value) {
    return crypto.createHash('sha256').update(String(value || '')).digest();
}

function safeEqual(a, b) {
    return crypto.timingSafeEqual(digest(a), digest(b));
}

function decodeBase32(secret) {
    const normalized = String(secret || '').toUpperCase().replace(/=+$/g, '');
    if (!normalized) {
        throw new Error('Missing TOTP secret');
    }

    let bits = '';
    for (let i = 0; i < normalized.length; i += 1) {
        const char = normalized[i];
        const value = BASE32_ALPHABET.indexOf(char);
        if (value === -1) {
            throw new Error('Invalid Base32 character');
        }
        bits += value.toString(2).padStart(5, '0');
    }

    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
    }
    return Buffer.from(bytes);
}

function totpStepSeconds() {
    const configured = Number(process.env.ADMIN_TOTP_STEP_SECONDS || DEFAULT_TOTP_STEP_SECONDS);
    if (!Number.isFinite(configured) || configured <= 0) {
        return DEFAULT_TOTP_STEP_SECONDS;
    }
    return Math.floor(configured);
}

function totpWindow() {
    const configured = Number(process.env.ADMIN_TOTP_WINDOW || DEFAULT_TOTP_WINDOW);
    if (!Number.isFinite(configured) || configured < 0) {
        return DEFAULT_TOTP_WINDOW;
    }
    return Math.min(5, Math.floor(configured));
}

function hotp(secretBytes, counter) {
    const counterBuffer = Buffer.alloc(8);
    let value = BigInt(counter);
    for (let i = 7; i >= 0; i -= 1) {
        counterBuffer[i] = Number(value & 0xffn);
        value >>= 8n;
    }

    const hmac = crypto.createHmac('sha1', secretBytes).update(counterBuffer).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary = ((hmac[offset] & 0x7f) << 24)
        | ((hmac[offset + 1] & 0xff) << 16)
        | ((hmac[offset + 2] & 0xff) << 8)
        | (hmac[offset + 3] & 0xff);

    return String(binary % (10 ** TOTP_DIGITS)).padStart(TOTP_DIGITS, '0');
}

function verifyTotpCode(accessCode) {
    const code = String(accessCode || '').trim();
    if (!/^\d{6}$/.test(code)) return false;

    const secret = getTotpSecret();
    if (!secret) return false;

    let secretBytes = null;
    try {
        secretBytes = decodeBase32(secret);
    } catch (error) {
        return false;
    }

    const step = totpStepSeconds();
    const timeCounter = Math.floor(Date.now() / 1000 / step);
    const window = totpWindow();

    for (let offset = -window; offset <= window; offset += 1) {
        const expected = hotp(secretBytes, timeCounter + offset);
        if (safeEqual(code, expected)) {
            return true;
        }
    }

    return false;
}

function verifyAccessCode(accessCode) {
    if (isTotpEnabled()) {
        return verifyTotpCode(accessCode);
    }
    const configured = getConfiguredAccessCode();
    if (!configured) return false;
    const supplied = String(accessCode || '').trim();
    if (!supplied) return false;
    return safeEqual(supplied, configured);
}

function encodePayload(payload) {
    return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodePayload(value) {
    const decoded = Buffer.from(String(value || ''), 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded);
    return parsed && typeof parsed === 'object' ? parsed : null;
}

function signPayload(payloadPart) {
    const secret = signingSecret();
    return crypto.createHmac('sha256', secret).update(payloadPart).digest('base64url');
}

function issueAdminToken(meta = {}) {
    if (!isConfigured()) {
        return { ok: false, error: 'Admin authentication is not configured on the server.' };
    }
    const now = Date.now();
    const exp = now + tokenTtlMs();
    const payload = {
        sub: 'admin',
        iat: now,
        exp,
        v: 1,
        amr: isTotpEnabled() ? 'totp' : 'code'
    };
    if (meta?.ip) {
        payload.ip = String(meta.ip).slice(0, 120);
    }

    const payloadPart = encodePayload(payload);
    const sig = signPayload(payloadPart);
    return {
        ok: true,
        token: `${payloadPart}.${sig}`,
        payload
    };
}

function verifyAdminToken(token) {
    try {
        const rawToken = String(token || '').trim();
        if (!rawToken) return { ok: false, reason: 'missing' };
        const parts = rawToken.split('.');
        if (parts.length !== 2) return { ok: false, reason: 'malformed' };
        const [payloadPart, sigPart] = parts;
        const expectedSig = signPayload(payloadPart);
        if (!safeEqual(sigPart, expectedSig)) return { ok: false, reason: 'signature' };
        const payload = decodePayload(payloadPart);
        if (!payload || payload.sub !== 'admin') return { ok: false, reason: 'payload' };
        const now = Date.now();
        if (!Number.isFinite(Number(payload.exp)) || Number(payload.exp) <= now) {
            return { ok: false, reason: 'expired' };
        }
        return { ok: true, payload };
    } catch (error) {
        return { ok: false, reason: 'invalid' };
    }
}

function readBearerToken(req) {
    const authorization = String(req?.headers?.authorization || req?.headers?.Authorization || '').trim();
    if (!authorization) return '';
    const [scheme, token] = authorization.split(/\s+/);
    if (!/^bearer$/i.test(String(scheme || ''))) return '';
    return String(token || '').trim();
}

function authorizeRequest(req) {
    if (!isConfigured()) {
        return { ok: false, status: 500, error: 'Admin access is not configured on the server.' };
    }

    const queryToken = String(req?.query?.admin_token || req?.query?.adminToken || '').trim();
    if (queryToken) {
        const verifiedQuery = verifyAdminToken(queryToken);
        if (verifiedQuery.ok) {
            return { ok: true, via: 'query-token', payload: verifiedQuery.payload };
        }
    }

    const bearer = readBearerToken(req);
    if (bearer) {
        const verified = verifyAdminToken(bearer);
        if (verified.ok) {
            return { ok: true, via: 'token', payload: verified.payload };
        }
    }

    const headerCode = String(req?.headers?.['x-admin-code'] || '').trim();
    if (headerCode && verifyAccessCode(headerCode)) {
        return { ok: true, via: 'code' };
    }

    return { ok: false, status: 401, error: 'Unauthorized' };
}

function requireAdmin(req, res) {
    const auth = authorizeRequest(req);
    if (!auth.ok) {
        res.status(auth.status || 401).json({ error: auth.error || 'Unauthorized' });
        return null;
    }
    return auth;
}

module.exports = {
    isConfigured,
    isTotpEnabled,
    verifyAccessCode,
    issueAdminToken,
    verifyAdminToken,
    requireAdmin,
    authorizeRequest
};
