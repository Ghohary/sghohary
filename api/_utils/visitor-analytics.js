const crypto = require('crypto');
const {
    isRedisConfigured,
    readStore,
    writeStore
} = require('./json-store');

const VISITOR_ANALYTICS_KEY = 'ghohary:visitor-analytics';
const VISITOR_LIVE_SESSIONS_KEY = 'ghohary:visitor-live-sessions';
const LIVE_SESSION_PREFIX = 'visitor-live/';
const LIVE_WINDOW_MS = 20 * 1000;
const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;
const RETENTION_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const ANALYTICS_STATE_READ_TTL_MS = 5000;
const LIVE_OVERLAY_READ_TTL_MS = 4000;
const DAILY_WINDOW_DAYS = 7;
const MAX_SESSION_COUNT = 1200;
const ANALYTICS_STATE_PERSIST_GAP_MS = 12000;
const ANALYTICS_LIVE_SESSION_PERSIST_GAP_MS = 6000;
const MIN_REAL_LIVE_HEARTBEATS = 2;
const MIN_REAL_LIVE_DWELL_MS = 8000;
const BOT_USER_AGENT_REGEX = /(bot|spider|crawl|slurp|bingpreview|headless|phantom|preview|facebookexternalhit|telegrambot|discordbot|curl|wget|python-requests|axios|postman|googleweblight|slackbot|linkedinbot|embedly)/i;
const INTERNAL_PATH_PREFIXES = ['/admin', '/api'];

if (!globalThis.__ghoharyAnalyticsStateCache) {
    globalThis.__ghoharyAnalyticsStateCache = {
        sessions: {},
        updatedAt: null,
        fetchedAt: 0
    };
}

if (!globalThis.__ghoharyLiveOverlayCache) {
    globalThis.__ghoharyLiveOverlayCache = {
        sessions: [],
        fetchedAt: 0
    };
}

if (!globalThis.__ghoharyAnalyticsStateWriteThrottle) {
    globalThis.__ghoharyAnalyticsStateWriteThrottle = {};
}

if (!globalThis.__ghoharyAnalyticsLiveSessionWriteThrottle) {
    globalThis.__ghoharyAnalyticsLiveSessionWriteThrottle = {};
}

function setCachedAnalyticsState(state) {
    const sessions = pruneSessions(state?.sessions || {});
    const updatedAt = safeText(state?.updatedAt, 64) || null;
    const fetchedAt = Number.isFinite(Number(state?.fetchedAt))
        ? Number(state.fetchedAt)
        : Date.now();
    globalThis.__ghoharyAnalyticsStateCache = {
        sessions,
        updatedAt,
        fetchedAt
    };
    return {
        sessions,
        updatedAt,
        fetchedAt
    };
}

function getCachedAnalyticsState() {
    const cached = globalThis.__ghoharyAnalyticsStateCache || { sessions: {}, updatedAt: null, fetchedAt: 0 };
    return {
        sessions: pruneSessions(cached.sessions || {}),
        updatedAt: safeText(cached.updatedAt, 64) || null,
        fetchedAt: Number.isFinite(Number(cached.fetchedAt)) ? Number(cached.fetchedAt) : 0
    };
}

function analyticsStoreConfigured() {
    return isRedisConfigured();
}

function parseBody(req) {
    if (!req || !req.body) return {};
    if (typeof req.body === 'string') {
        try {
            return JSON.parse(req.body);
        } catch (error) {
            return {};
        }
    }
    return req.body;
}

function safeText(value, maxLen = 120) {
    return String(value || '').trim().slice(0, Math.max(0, maxLen));
}

function decodeHeaderText(value, maxLen = 120) {
    const raw = safeText(value, Math.max(maxLen, 1) * 3);
    if (!raw) return '';
    let normalized = raw.replace(/\+/g, '%20');
    for (let i = 0; i < 3; i += 1) {
        try {
            const decoded = decodeURIComponent(normalized);
            if (decoded === normalized) break;
            normalized = decoded;
        } catch (error) {
            break;
        }
    }
    return safeText(normalized, maxLen);
}

function normalizeSessionId(value) {
    const id = safeText(value, 128);
    if (!id) return '';
    if (!/^[a-zA-Z0-9_-]{8,128}$/.test(id)) return '';
    return id;
}

function normalizePath(value) {
    const raw = safeText(value, 260);
    if (!raw) return '/';
    if (raw.startsWith('/')) return raw;
    return `/${raw.replace(/^\/+/, '')}`;
}

function normalizeReferrer(value) {
    const raw = safeText(value, 260);
    if (!raw) return '';
    try {
        const parsed = new URL(raw, 'https://mohsenghohary.net');
        return safeText(parsed.hostname || raw, 160);
    } catch (error) {
        return raw;
    }
}

function toFiniteNumber(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string' && value.trim() === '') return null;
    const num = Number(value);
    if (!Number.isFinite(num)) return null;
    return num;
}

function isInvalidCoordinatePair(latitude, longitude) {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return true;
    return Math.abs(latitude) < 0.000001 && Math.abs(longitude) < 0.000001;
}

function parseTimestamp(value) {
    const timestamp = Date.parse(String(value || ''));
    if (!Number.isFinite(timestamp)) return 0;
    return timestamp;
}

function toSafeInteger(value, { min = 0, max = Number.MAX_SAFE_INTEGER, fallback = 0 } = {}) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(max, Math.max(min, Math.round(numeric)));
}

function toBoolean(value, fallback = false) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') {
        if (value === 1) return true;
        if (value === 0) return false;
    }
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
        if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
    }
    return fallback;
}

function inferCheckoutStageFromPath(pathValue) {
    const path = normalizePath(pathValue || '/').toLowerCase();
    if (path.includes('checkout-delivery')) return 'delivery';
    if (path.includes('checkout-email')) return 'email';
    if (path.includes('checkout')) return 'payment';
    if (path.includes('/success')) return 'completed';
    if (path.includes('/cart')) return 'cart';
    return '';
}

function normalizeCheckoutStage(value, pathValue = '/') {
    const stage = safeText(value, 24).toLowerCase();
    if (stage === 'delivery' || stage === 'email' || stage === 'payment' || stage === 'completed' || stage === 'cart') {
        return stage;
    }
    return inferCheckoutStageFromPath(pathValue);
}

function dayKeyDubai(timestamp = Date.now()) {
    try {
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Dubai',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).formatToParts(new Date(timestamp));
        const year = parts.find((part) => part.type === 'year')?.value || '';
        const month = parts.find((part) => part.type === 'month')?.value || '';
        const day = parts.find((part) => part.type === 'day')?.value || '';
        if (year && month && day) return `${year}-${month}-${day}`;
    } catch (error) {
        // fallback below
    }
    return new Date(timestamp).toISOString().slice(0, 10);
}

function getClientIp(req) {
    const forwarded = String(req?.headers?.['x-forwarded-for'] || '')
        .split(',')[0]
        .trim();
    if (forwarded) return forwarded;
    return String(req?.socket?.remoteAddress || '').trim();
}

function hashIp(ip) {
    const safeIp = safeText(ip, 120);
    if (!safeIp) return '';
    return crypto.createHash('sha256').update(safeIp).digest('hex').slice(0, 16);
}

function countryNameFromCode(countryCode) {
    const upper = String(countryCode || '').toUpperCase();
    if (!upper) return '';
    try {
        const display = new Intl.DisplayNames(['en'], { type: 'region' });
        return display.of(upper) || upper;
    } catch (error) {
        return upper;
    }
}

const GCC_COUNTRIES = new Set(['AE', 'SA', 'QA', 'KW', 'BH', 'OM']);
const EUROPE_COUNTRIES = new Set([
    'AL', 'AD', 'AT', 'BE', 'BA', 'BG', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GB', 'GR', 'HR',
    'HU', 'IE', 'IS', 'IT', 'LI', 'LT', 'LU', 'LV', 'MC', 'MD', 'ME', 'MK', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO',
    'RS', 'SE', 'SI', 'SK', 'SM', 'UA', 'VA'
]);
const AMERICAS_COUNTRIES = new Set([
    'US', 'CA', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE', 'UY', 'VE', 'EC', 'BO', 'PY', 'CR', 'PA', 'GT', 'HN', 'NI',
    'SV', 'DO', 'PR', 'JM', 'BS', 'BB', 'TT'
]);
const OCEANIA_COUNTRIES = new Set(['AU', 'NZ', 'FJ', 'PG']);

const COUNTRY_COORDINATES = {
    AE: { latitude: 24.4539, longitude: 54.3773 },
    SA: { latitude: 24.7136, longitude: 46.6753 },
    QA: { latitude: 25.2854, longitude: 51.531 },
    KW: { latitude: 29.3759, longitude: 47.9774 },
    BH: { latitude: 26.2235, longitude: 50.5876 },
    OM: { latitude: 23.588, longitude: 58.3829 },
    GB: { latitude: 51.5072, longitude: -0.1276 },
    FR: { latitude: 48.8566, longitude: 2.3522 },
    IT: { latitude: 41.9028, longitude: 12.4964 },
    DE: { latitude: 52.52, longitude: 13.405 },
    IE: { latitude: 53.3498, longitude: -6.2603 },
    CH: { latitude: 46.948, longitude: 7.4474 },
    BE: { latitude: 50.8503, longitude: 4.3517 },
    CZ: { latitude: 50.0755, longitude: 14.4378 },
    US: { latitude: 38.9072, longitude: -77.0369 },
    CA: { latitude: 45.4215, longitude: -75.6972 },
    AU: { latitude: -35.2809, longitude: 149.13 },
    NZ: { latitude: -41.2866, longitude: 174.7756 },
    IN: { latitude: 28.6139, longitude: 77.209 },
    CN: { latitude: 39.9042, longitude: 116.4074 },
    JP: { latitude: 35.6762, longitude: 139.6503 },
    SG: { latitude: 1.3521, longitude: 103.8198 },
    NL: { latitude: 52.3676, longitude: 4.9041 },
    ES: { latitude: 40.4168, longitude: -3.7038 },
    PT: { latitude: 38.7223, longitude: -9.1393 },
    SE: { latitude: 59.3293, longitude: 18.0686 },
    NO: { latitude: 59.9139, longitude: 10.7522 },
    DK: { latitude: 55.6761, longitude: 12.5683 },
    FI: { latitude: 60.1699, longitude: 24.9384 },
    AT: { latitude: 48.2082, longitude: 16.3738 },
    PL: { latitude: 52.2297, longitude: 21.0122 },
    GR: { latitude: 37.9838, longitude: 23.7275 },
    TR: { latitude: 39.9334, longitude: 32.8597 },
    RU: { latitude: 55.7558, longitude: 37.6176 },
    BR: { latitude: -15.7939, longitude: -47.8828 },
    MX: { latitude: 19.4326, longitude: -99.1332 },
    CO: { latitude: 4.711, longitude: -74.0721 },
    PE: { latitude: -12.0464, longitude: -77.0428 },
    VE: { latitude: 10.4806, longitude: -66.9036 },
    CL: { latitude: -33.4489, longitude: -70.6693 },
    AR: { latitude: -34.6037, longitude: -58.3816 },
    ZA: { latitude: -25.7479, longitude: 28.2293 },
    EG: { latitude: 30.0444, longitude: 31.2357 },
    MA: { latitude: 33.9716, longitude: -6.8498 },
    NG: { latitude: 9.0765, longitude: 7.3986 },
    KE: { latitude: -1.2921, longitude: 36.8219 },
    ET: { latitude: 8.9806, longitude: 38.7578 },
    PK: { latitude: 33.6844, longitude: 73.0479 },
    BD: { latitude: 23.8103, longitude: 90.4125 },
    KR: { latitude: 37.5665, longitude: 126.978 },
    TW: { latitude: 25.033, longitude: 121.5654 },
    HK: { latitude: 22.3193, longitude: 114.1694 },
    MY: { latitude: 3.139, longitude: 101.6869 },
    TH: { latitude: 13.7563, longitude: 100.5018 },
    VN: { latitude: 21.0278, longitude: 105.8342 },
    ID: { latitude: -6.2088, longitude: 106.8456 },
    PH: { latitude: 14.5995, longitude: 120.9842 },
    RO: { latitude: 44.4268, longitude: 26.1025 },
    HU: { latitude: 47.4979, longitude: 19.0402 },
    UA: { latitude: 50.4501, longitude: 30.5234 }
};

const CITY_COORDINATES = {
    AE: {
        'abu dhabi': { latitude: 24.4539, longitude: 54.3773 },
        dubai: { latitude: 25.2048, longitude: 55.2708 },
        sharjah: { latitude: 25.3463, longitude: 55.4209 }
    },
    SA: {
        riyadh: { latitude: 24.7136, longitude: 46.6753 },
        jeddah: { latitude: 21.5433, longitude: 39.1728 }
    },
    GB: {
        london: { latitude: 51.5072, longitude: -0.1276 },
        manchester: { latitude: 53.4808, longitude: -2.2426 }
    },
    FR: {
        paris: { latitude: 48.8566, longitude: 2.3522 },
        lyon: { latitude: 45.764, longitude: 4.8357 }
    },
    IT: {
        rome: { latitude: 41.9028, longitude: 12.4964 },
        milan: { latitude: 45.4642, longitude: 9.19 }
    },
    DE: {
        berlin: { latitude: 52.52, longitude: 13.405 },
        munich: { latitude: 48.1351, longitude: 11.582 }
    },
    ES: {
        madrid: { latitude: 40.4168, longitude: -3.7038 },
        barcelona: { latitude: 41.3851, longitude: 2.1734 }
    },
    US: {
        'new york': { latitude: 40.7128, longitude: -74.006 },
        'los angeles': { latitude: 34.0522, longitude: -118.2437 },
        chicago: { latitude: 41.8781, longitude: -87.6298 },
        miami: { latitude: 25.7617, longitude: -80.1918 },
        dallas: { latitude: 32.7767, longitude: -96.797 },
        'san francisco': { latitude: 37.7749, longitude: -122.4194 },
        seattle: { latitude: 47.6062, longitude: -122.3321 }
    },
    CA: {
        toronto: { latitude: 43.6532, longitude: -79.3832 },
        montreal: { latitude: 45.5017, longitude: -73.5673 },
        vancouver: { latitude: 49.2827, longitude: -123.1207 }
    },
    BR: {
        'sao paulo': { latitude: -23.5505, longitude: -46.6333 },
        'rio de janeiro': { latitude: -22.9068, longitude: -43.1729 }
    },
    MX: {
        'mexico city': { latitude: 19.4326, longitude: -99.1332 },
        guadalajara: { latitude: 20.6597, longitude: -103.3496 }
    },
    TR: {
        istanbul: { latitude: 41.0082, longitude: 28.9784 },
        ankara: { latitude: 39.9334, longitude: 32.8597 }
    },
    IN: {
        mumbai: { latitude: 19.076, longitude: 72.8777 },
        delhi: { latitude: 28.6139, longitude: 77.209 },
        bengaluru: { latitude: 12.9716, longitude: 77.5946 }
    },
    CN: {
        beijing: { latitude: 39.9042, longitude: 116.4074 },
        shanghai: { latitude: 31.2304, longitude: 121.4737 },
        shenzhen: { latitude: 22.5431, longitude: 114.0579 }
    },
    JP: {
        tokyo: { latitude: 35.6762, longitude: 139.6503 },
        osaka: { latitude: 34.6937, longitude: 135.5023 }
    },
    KR: {
        seoul: { latitude: 37.5665, longitude: 126.978 },
        busan: { latitude: 35.1796, longitude: 129.0756 }
    },
    SG: {
        singapore: { latitude: 1.3521, longitude: 103.8198 }
    },
    AU: {
        sydney: { latitude: -33.8688, longitude: 151.2093 },
        melbourne: { latitude: -37.8136, longitude: 144.9631 }
    }
};

function continentFromCountry(countryCode, headerContinent) {
    const rawHeader = String(headerContinent || '').trim().toLowerCase();
    if (rawHeader) {
        if (rawHeader.startsWith('eu')) return 'Europe';
        if (rawHeader.startsWith('na') || rawHeader.startsWith('sa') || rawHeader.includes('america')) return 'America';
        if (rawHeader.startsWith('oc')) return 'Australia';
        if (rawHeader.startsWith('as')) return 'Asia';
        if (rawHeader.startsWith('af')) return 'Africa';
    }

    const code = String(countryCode || '').toUpperCase();
    if (!code) return '';
    if (GCC_COUNTRIES.has(code)) return 'GCC';
    if (EUROPE_COUNTRIES.has(code)) return 'Europe';
    if (AMERICAS_COUNTRIES.has(code)) return 'America';
    if (OCEANIA_COUNTRIES.has(code)) return 'Australia';
    return 'Asia';
}

function normalizeCityKey(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[.]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function resolveCityCoordinates(city, countryCode) {
    const cityKey = normalizeCityKey(city);
    const code = String(countryCode || '').toUpperCase();
    if (!cityKey || !code) return null;
    const countryCities = CITY_COORDINATES[code];
    if (!countryCities || typeof countryCities !== 'object') return null;
    return countryCities[cityKey] || null;
}

function toTitleCaseWords(value) {
    return String(value || '')
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1).toLowerCase()}`)
        .join(' ');
}

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
    const earthRadiusKm = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
}

function resolveNearestCityFromCoordinates(latitude, longitude, countryCode) {
    const lat = toFiniteNumber(latitude);
    const lon = toFiniteNumber(longitude);
    const code = String(countryCode || '').toUpperCase();
    if (isInvalidCoordinatePair(lat, lon) || !code) return null;
    const countryCities = CITY_COORDINATES[code];
    if (!countryCities || typeof countryCities !== 'object') return null;

    let nearest = null;
    Object.entries(countryCities).forEach(([cityKey, point]) => {
        const cityLat = toFiniteNumber(point?.latitude);
        const cityLon = toFiniteNumber(point?.longitude);
        if (isInvalidCoordinatePair(cityLat, cityLon)) return;
        const distanceKm = haversineDistanceKm(lat, lon, cityLat, cityLon);
        if (!nearest || distanceKm < nearest.distanceKm) {
            nearest = {
                city: toTitleCaseWords(cityKey),
                distanceKm
            };
        }
    });

    if (!nearest) return null;
    if (nearest.distanceKm > 220) return null;
    return nearest.city;
}

function sanitizeCartProductLine(item) {
    if (!item || typeof item !== 'object') return null;
    const name = safeText(item?.name, 220).trim();
    const id = safeText(item?.id, 128).trim();
    const quantity = toSafeInteger(item?.quantity, { min: 0, max: 999, fallback: 0 });
    if (!name && !id) return null;
    return {
        id,
        name,
        quantity
    };
}

function sanitizeCartProducts(rawProducts) {
    if (!Array.isArray(rawProducts)) return [];
    const items = [];
    const seen = new Set();
    rawProducts.forEach((entry) => {
        const product = sanitizeCartProductLine(entry);
        if (!product) return;
        const key = safeText(`${product.id}|${product.name}`, 280);
        if (!key || seen.has(key)) return;
        seen.add(key);
        items.push(product);
    });
    return items.slice(0, 8);
}

function resolveSessionCoordinates(session) {
    const directLatitude = toFiniteNumber(session?.latitude);
    const directLongitude = toFiniteNumber(session?.longitude);
    if (
        Number.isFinite(directLatitude) &&
        Number.isFinite(directLongitude) &&
        !isInvalidCoordinatePair(directLatitude, directLongitude)
    ) {
        return { latitude: directLatitude, longitude: directLongitude, precise: true };
    }

    const countryCode = String(session?.countryCode || '').toUpperCase();
    const cityPoint = resolveCityCoordinates(session?.city, countryCode);
    if (cityPoint) {
        return { latitude: cityPoint.latitude, longitude: cityPoint.longitude, precise: false };
    }

    const countryPoint = resolveCountryCoordinates(countryCode);
    if (countryPoint) {
        return { latitude: countryPoint.latitude, longitude: countryPoint.longitude, precise: false };
    }

    return null;
}

function geoFromRequest(req) {
    const countryCode = safeText(req?.headers?.['x-vercel-ip-country'], 8).toUpperCase();
    const region = decodeHeaderText(req?.headers?.['x-vercel-ip-country-region'], 80);
    const city = decodeHeaderText(req?.headers?.['x-vercel-ip-city'], 80);
    const timezone = decodeHeaderText(req?.headers?.['x-vercel-ip-timezone'], 80);
    const latitude = toFiniteNumber(req?.headers?.['x-vercel-ip-latitude']);
    const longitude = toFiniteNumber(req?.headers?.['x-vercel-ip-longitude']);
    const continent = continentFromCountry(countryCode, req?.headers?.['x-vercel-ip-continent']);

    return {
        countryCode,
        country: countryNameFromCode(countryCode),
        region,
        city,
        timezone,
        latitude,
        longitude,
        continent,
        ipHash: hashIp(getClientIp(req))
    };
}

function normalizeSessions(rawSessions) {
    if (!rawSessions || typeof rawSessions !== 'object') return {};
    const sessions = {};
    Object.entries(rawSessions).forEach(([key, value]) => {
        const session = value && typeof value === 'object' ? value : null;
        if (!session) return;
        const sessionId = normalizeSessionId(session.sessionId || key);
        if (!sessionId) return;
        const lastSeenAt = parseTimestamp(session.lastSeenAt) > 0
            ? new Date(parseTimestamp(session.lastSeenAt)).toISOString()
            : '';
        if (!lastSeenAt) return;
        const firstSeenAt = parseTimestamp(session.firstSeenAt) > 0
            ? new Date(parseTimestamp(session.firstSeenAt)).toISOString()
            : lastSeenAt;
        const parsedFirstSeenToday = parseTimestamp(session.firstSeenTodayAt);
        const firstSeenTodayAt = parsedFirstSeenToday > 0
            ? new Date(parsedFirstSeenToday).toISOString()
            : firstSeenAt;
        const visitorDayKey = safeText(session.visitorDayKey, 16);
        const cartItems = toSafeInteger(session.cartItems, { min: 0, max: 999, fallback: 0 });
        const cartUpdatedMs = parseTimestamp(session.cartUpdatedAt);
        const lastCheckoutMs = parseTimestamp(session.lastCheckoutAt);
        const normalizedPath = normalizePath(session.lastPath || '/');
        const checkoutStage = normalizeCheckoutStage(session.checkoutStage, normalizedPath);
        const reachedCheckout = toBoolean(
            session.reachedCheckout,
            checkoutStage === 'delivery' || checkoutStage === 'email' || checkoutStage === 'payment' || checkoutStage === 'completed'
        );
        sessions[sessionId] = {
            sessionId,
            firstSeenAt,
            lastSeenAt,
            firstSeenTodayAt,
            visitorDayKey,
            lastReason: safeText(session.lastReason, 24).toLowerCase(),
            lastPath: normalizedPath,
            lastReferrer: normalizeReferrer(session.lastReferrer || ''),
            language: safeText(session.language, 40),
            timezone: decodeHeaderText(session.timezone, 80),
            viewport: safeText(session.viewport, 40),
            userAgent: safeText(session.userAgent, 220),
            ipHash: safeText(session.ipHash, 24),
            geoSource: safeText(session.geoSource, 24),
            countryCode: safeText(session.countryCode, 8).toUpperCase(),
            country: safeText(session.country, 80),
            region: decodeHeaderText(session.region, 80),
            city: decodeHeaderText(session.city, 80),
            continent: safeText(session.continent, 24),
            latitude: toFiniteNumber(session.latitude),
            longitude: toFiniteNumber(session.longitude),
            heartbeatCount: Math.max(1, Number(session.heartbeatCount || 1)),
            cartItems,
            hasCart: toBoolean(session.hasCart, cartItems > 0),
            cartUpdatedAt: cartUpdatedMs > 0 ? new Date(cartUpdatedMs).toISOString() : '',
            cartProducts: sanitizeCartProducts(session.cartProducts),
            checkoutStage,
            reachedCheckout,
            lastCheckoutAt: lastCheckoutMs > 0 ? new Date(lastCheckoutMs).toISOString() : ''
        };
    });
    return sessions;
}

function pruneSessions(inputSessions, nowMs = Date.now()) {
    const sessions = normalizeSessions(inputSessions);
    const entries = Object.values(sessions)
        .filter((session) => {
            const seenAt = parseTimestamp(session.lastSeenAt);
            return seenAt > 0 && seenAt >= nowMs - RETENTION_WINDOW_MS;
        })
        .sort((a, b) => parseTimestamp(b.lastSeenAt) - parseTimestamp(a.lastSeenAt))
        .slice(0, MAX_SESSION_COUNT);

    const compact = {};
    entries.forEach((session) => {
        compact[session.sessionId] = session;
    });
    return compact;
}

async function readAnalyticsState() {
    const cachedState = getCachedAnalyticsState();
    if (!analyticsStoreConfigured()) return cachedState;
    if ((Date.now() - cachedState.fetchedAt) < ANALYTICS_STATE_READ_TTL_MS) return cachedState;

    try {
        const payload = await readStore(VISITOR_ANALYTICS_KEY, { fallback: null });
        if (!payload || typeof payload !== 'object') {
            return cachedState;
        }
        const sessions = payload && typeof payload === 'object' ? (payload.sessions || {}) : {};
        return setCachedAnalyticsState({
            sessions: pruneSessions(sessions),
            updatedAt: safeText(payload?.updatedAt, 64),
            fetchedAt: Date.now()
        });
    } catch (error) {
        if (error && String(error.message).includes('Redis storage is not configured')) {
            return cachedState;
        }
        return cachedState;
    }
}

async function writeAnalyticsState(state) {
    const sessions = pruneSessions(state?.sessions || {});
    const payload = {
        sessions,
        updatedAt: new Date().toISOString()
    };
    if (!analyticsStoreConfigured()) {
        setCachedAnalyticsState(payload);
        return true;
    }
    await writeStore(VISITOR_ANALYTICS_KEY, payload);
    setCachedAnalyticsState(payload);
    return true;
}

function liveSessionCacheKey(sessionId) {
    const normalizedSessionId = normalizeSessionId(sessionId);
    if (!normalizedSessionId) return '';
    return `${LIVE_SESSION_PREFIX}${normalizedSessionId}.json`;
}

async function writeLiveSession(session) {
    if (!analyticsStoreConfigured()) return false;
    const sessionId = normalizeSessionId(session?.sessionId);
    if (!sessionId) return false;
    const normalized = normalizeSessions({ [sessionId]: session || {} });
    const safeSession = normalized[sessionId];
    if (!safeSession) return false;
    const existing = await readStore(VISITOR_LIVE_SESSIONS_KEY, { fallback: {} });
    const sessions = normalizeSessions(existing || {});
    sessions[sessionId] = safeSession;
    const pruned = pruneSessions(sessions);
    await writeStore(VISITOR_LIVE_SESSIONS_KEY, pruned);
    globalThis.__ghoharyLiveOverlayCache = {
        sessions: Object.values(pruned),
        fetchedAt: Date.now()
    };
    return true;
}

async function readLiveOverlaySessions(nowMs = Date.now()) {
    if (!analyticsStoreConfigured()) return [];
    const cachedOverlay = globalThis.__ghoharyLiveOverlayCache || { sessions: [], fetchedAt: 0 };
    if ((nowMs - Number(cachedOverlay.fetchedAt || 0)) < LIVE_OVERLAY_READ_TTL_MS) {
        return Array.isArray(cachedOverlay.sessions) ? cachedOverlay.sessions : [];
    }
    try {
        const liveSessions = await readStore(VISITOR_LIVE_SESSIONS_KEY, { fallback: {} });
        const activeSessions = normalizeSessions(liveSessions || {});
        const sessionEntries = Object.values(activeSessions);
        if (!sessionEntries.length) return [];
        const overlayCutoff = nowMs - Math.max(LIVE_WINDOW_MS * 8, 2 * 60 * 1000);
        const recentSessions = sessionEntries
            .filter((entry) => {
                const heartbeatAt = parseTimestamp(entry?.lastSeenAt || entry?.uploadedAt || entry?.uploaded || '');
                return heartbeatAt >= overlayCutoff;
            })
            .sort((a, b) => {
                const aUploaded = parseTimestamp(a?.lastSeenAt || a?.uploadedAt || a?.uploaded || '');
                const bUploaded = parseTimestamp(b?.lastSeenAt || b?.uploadedAt || b?.uploaded || '');
                return bUploaded - aUploaded;
            })
            .slice(0, 60);
        const filteredLiveSessions = recentSessions
            .map((session) => normalizeSessions({ [normalizeSessionId(session?.sessionId)]: session })[normalizeSessionId(session?.sessionId)])
            .filter(Boolean);
        globalThis.__ghoharyLiveOverlayCache = {
            sessions: filteredLiveSessions,
            fetchedAt: nowMs
        };
        return filteredLiveSessions;
    } catch (error) {
        return [];
    }
}

function aggregateBy(items, keyResolver, labelResolver) {
    const map = new Map();
    items.forEach((item) => {
        const key = keyResolver(item);
        if (!key) return;
        const current = map.get(key) || {
            key,
            label: labelResolver(item),
            count: 0
        };
        current.count += 1;
        map.set(key, current);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

function resolveCountryCoordinates(countryCode) {
    const code = String(countryCode || '').toUpperCase();
    if (!code) return null;
    return COUNTRY_COORDINATES[code] || null;
}

function resolveVisitorIdentity(session) {
    const ipIdentity = safeText(session?.ipHash, 24);
    if (ipIdentity) return `ip:${ipIdentity}`;

    const sessionIdentity = safeText(session?.sessionId, 128);
    if (sessionIdentity) return `sid:${sessionIdentity}`;

    const fallbackIdentity = safeText(session?.userAgent, 120);
    if (fallbackIdentity) return `ua:${fallbackIdentity}`;

    return '';
}

function isLikelyBotSession(session) {
    const userAgent = safeText(session?.userAgent, 220);
    if (!userAgent) return false;
    return BOT_USER_AGENT_REGEX.test(userAgent);
}

function isInternalSessionPath(pathValue) {
    const path = normalizePath(pathValue || '/');
    return INTERNAL_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function isQualifiedLiveSession(session) {
    const heartbeatCount = Math.max(0, Number(session?.heartbeatCount || 0));
    const lastReason = safeText(session?.lastReason, 24).toLowerCase();
    if (heartbeatCount >= 1 && (lastReason === 'init' || lastReason === 'visible' || lastReason === 'engaged' || lastReason === 'pulse' || lastReason === 'commerce')) {
        return true;
    }
    if (heartbeatCount >= MIN_REAL_LIVE_HEARTBEATS) return true;

    const firstSeenMs = Number.isFinite(session?.firstSeenMs) ? Number(session.firstSeenMs) : parseTimestamp(session?.firstSeenAt);
    const lastSeenMs = Number.isFinite(session?.lastSeenMs) ? Number(session.lastSeenMs) : parseTimestamp(session?.lastSeenAt);
    if (firstSeenMs > 0 && lastSeenMs > 0 && (lastSeenMs - firstSeenMs) >= MIN_REAL_LIVE_DWELL_MS) {
        return true;
    }

    return false;
}

function buildAnalyticsSnapshot(state, nowMs = Date.now()) {
    const sessions = pruneSessions(state?.sessions || {}, nowMs);
    const todayKey = dayKeyDubai(nowMs);
    const all = Object.values(sessions)
        .map((session) => ({
            ...session,
            firstSeenMs: parseTimestamp(session.firstSeenAt),
            firstSeenTodayMs: parseTimestamp(session.firstSeenTodayAt),
            lastSeenMs: parseTimestamp(session.lastSeenAt)
        }))
        .filter((session) => session.lastSeenMs > 0)
        .sort((a, b) => b.lastSeenMs - a.lastSeenMs);

    const humanSessions = all.filter((session) => {
        if (isLikelyBotSession(session)) return false;
        if (isInternalSessionPath(session.lastPath)) return false;
        return true;
    });

    const recentCutoff = nowMs - RECENT_WINDOW_MS;
    const liveCutoff = nowMs - LIVE_WINDOW_MS;
    const recentAll = all.filter((session) => session.lastSeenMs >= recentCutoff);
    const recentHuman = humanSessions.filter((session) => session.lastSeenMs >= recentCutoff);
    const recent = recentHuman.length ? recentHuman : recentAll;

    const liveAll = recentAll.filter((session) => session.lastSeenMs >= liveCutoff);
    const liveHumanQualified = recentHuman.filter((session) => session.lastSeenMs >= liveCutoff && isQualifiedLiveSession(session));
    const liveAllQualified = recentAll.filter((session) => session.lastSeenMs >= liveCutoff && isQualifiedLiveSession(session));
    const live = liveHumanQualified.length
        ? liveHumanQualified
        : (liveAllQualified.length ? liveAllQualified : liveAll);

    const todayOrdered = all
        .filter((session) => String(session.visitorDayKey || '').trim() === todayKey)
        .sort((a, b) => {
            const aFirst = Number.isFinite(a.firstSeenTodayMs) && a.firstSeenTodayMs > 0 ? a.firstSeenTodayMs : a.lastSeenMs;
            const bFirst = Number.isFinite(b.firstSeenTodayMs) && b.firstSeenTodayMs > 0 ? b.firstSeenTodayMs : b.lastSeenMs;
            if (aFirst !== bFirst) return aFirst - bFirst;
            return String(a.sessionId || '').localeCompare(String(b.sessionId || ''));
        });
    const todayVisitorsByIdentity = new Map();
    todayOrdered.forEach((session) => {
        const visitorIdentity = resolveVisitorIdentity(session) || `sid:${String(session.sessionId || '').trim()}`;
        if (!visitorIdentity) return;
        const firstSeenMs = Number.isFinite(session.firstSeenTodayMs) && session.firstSeenTodayMs > 0
            ? session.firstSeenTodayMs
            : session.lastSeenMs;
        const previous = todayVisitorsByIdentity.get(visitorIdentity);
        if (!previous || firstSeenMs < previous.firstSeenMs) {
            todayVisitorsByIdentity.set(visitorIdentity, {
                identity: visitorIdentity,
                firstSeenMs,
                sessionId: String(session.sessionId || '').trim()
            });
        }
    });
    const visitorNumberByIdentity = new Map();
    Array.from(todayVisitorsByIdentity.values())
        .sort((a, b) => {
            if (a.firstSeenMs !== b.firstSeenMs) return a.firstSeenMs - b.firstSeenMs;
            return String(a.sessionId || '').localeCompare(String(b.sessionId || ''));
        })
        .forEach((visitor, index) => {
            visitorNumberByIdentity.set(visitor.identity, index + 1);
        });
    const visitorNumberBySession = new Map();
    all.forEach((session) => {
        const sessionId = String(session.sessionId || '').trim();
        if (!sessionId) return;
        const sameDay = String(session.visitorDayKey || '').trim() === todayKey;
        if (!sameDay) {
            visitorNumberBySession.set(sessionId, null);
            return;
        }
        const visitorIdentity = resolveVisitorIdentity(session) || `sid:${sessionId}`;
        const visitorNumber = visitorNumberByIdentity.get(visitorIdentity) || null;
        visitorNumberBySession.set(sessionId, visitorNumber);
    });

    const topCountries = aggregateBy(
        recent,
        (item) => String(item.countryCode || item.country || '').trim(),
        (item) => String(item.country || item.countryCode || 'Unknown').trim()
    ).map((row) => ({
        countryCode: String(row.key || '').toUpperCase(),
        country: row.label,
        count: row.count
    }));

    const topCities = aggregateBy(
        recent,
        (item) => `${String(item.city || '').trim()}|${String(item.countryCode || '').trim()}`,
        (item) => {
            const city = String(item.city || '').trim();
            const country = String(item.country || item.countryCode || '').trim();
            return city ? `${city}, ${country || 'Unknown'}` : '';
        }
    ).filter((row) => row.label);

    const countryContextByCode = new Map();
    recent.forEach((item) => {
        const code = String(item.countryCode || '').toUpperCase();
        if (!code || countryContextByCode.has(code)) return;
        countryContextByCode.set(code, {
            country: String(item.country || countryNameFromCode(code) || code).trim(),
            continent: String(item.continent || '').trim()
        });
    });

    const countryAnchors = topCountries
        .map((row) => {
            const code = String(row.countryCode || '').toUpperCase();
            const context = countryContextByCode.get(code) || {};
            const coordinates = resolveCountryCoordinates(code);
            if (!coordinates) return null;
            return {
                countryCode: code,
                country: context.country || row.country || code || 'Unknown',
                count: Number(row.count || 0),
                latitude: coordinates.latitude,
                longitude: coordinates.longitude
            };
        })
        .filter(Boolean)
        .slice(0, 100);

    const toPoint = (item) => {
        const coordinates = resolveSessionCoordinates(item);
        if (!coordinates) return null;
        return {
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            precise: Boolean(coordinates.precise),
            countryCode: String(item.countryCode || '').toUpperCase(),
            country: item.country || item.countryCode || '',
            city: item.city || '',
            page: item.lastPath || '/',
            lastSeenAt: item.lastSeenAt
        };
    };

    const pointsRecent = recent
        .map(toPoint)
        .filter(Boolean)
        .slice(0, 300);

    const pointsLive = live
        .map(toPoint)
        .filter(Boolean)
        .slice(0, 120);

    const dayMs = 24 * 60 * 60 * 1000;
    const dailyDayKeys = [];
    for (let i = DAILY_WINDOW_DAYS - 1; i >= 0; i -= 1) {
        dailyDayKeys.push(dayKeyDubai(nowMs - (i * dayMs)));
    }
    const dailyVisitorByDay = new Map(dailyDayKeys.map((dayKey) => [dayKey, new Set()]));
    all.forEach((item) => {
        const sessionDayKey = safeText(item.visitorDayKey, 16) || dayKeyDubai(item.lastSeenMs);
        const bucket = dailyVisitorByDay.get(sessionDayKey);
        if (!bucket) return;
        const identity = resolveVisitorIdentity(item) || `sid:${String(item.sessionId || '').trim()}`;
        if (!identity) return;
        bucket.add(identity);
    });
    const daily = dailyDayKeys.map((dayKey) => {
        const [year, month, day] = String(dayKey).split('-').map((part) => Number(part));
        const validDate = Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
            ? new Date(Date.UTC(year, Math.max(0, month - 1), day))
            : new Date(nowMs);
        return {
            date: dayKey,
            label: validDate.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                timeZone: 'UTC'
            }),
            count: Number(dailyVisitorByDay.get(dayKey)?.size || 0)
        };
    });

    const hourlyBuckets = new Array(24).fill(0);
    recent.forEach((item) => {
        const hourDelta = Math.floor((nowMs - item.lastSeenMs) / (60 * 60 * 1000));
        if (hourDelta < 0 || hourDelta >= 24) return;
        const bucketIndex = 23 - hourDelta;
        hourlyBuckets[bucketIndex] += 1;
    });
    const hourly = hourlyBuckets.map((count, index) => {
        const hourDate = new Date(nowMs - ((23 - index) * 60 * 60 * 1000));
        const label = hourDate.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit'
        });
        return { label, count };
    });

    const deriveDeviceType = (item) => {
        const viewport = safeText(item?.viewport, 40).toLowerCase();
        const userAgent = safeText(item?.userAgent, 240).toLowerCase();
        const widthMatch = viewport.match(/(\d{2,5})\s*[x×]/i);
        const width = widthMatch ? Number(widthMatch[1]) : null;
        if (Number.isFinite(width)) {
            if (width <= 767) return 'mobile';
            if (width <= 1024) return 'tablet';
            return 'desktop';
        }
        if (/(ipad|tablet|kindle|playbook|silk)/i.test(userAgent)) return 'tablet';
        if (/(iphone|android|mobile|phone|ipod|opera mini|iemobile)/i.test(userAgent)) return 'mobile';
        return 'desktop';
    };

    const mapVisitor = (item) => ({
        sessionId: item.sessionId,
        visitorNumber: visitorNumberBySession.get(String(item.sessionId || '')) || null,
        countryCode: item.countryCode,
        country: item.country || item.countryCode || '',
        region: item.region || '',
        city: item.city || '',
        continent: item.continent || '',
        page: item.lastPath || '/',
        referrer: item.lastReferrer || '',
        language: item.language || '',
        timezone: item.timezone || '',
        viewport: item.viewport || '',
        deviceType: deriveDeviceType(item),
        cartItems: toSafeInteger(item.cartItems, { min: 0, max: 999, fallback: 0 }),
        hasCart: toBoolean(item.hasCart, Number(item.cartItems || 0) > 0),
        cartUpdatedAt: item.cartUpdatedAt || '',
        checkoutStage: normalizeCheckoutStage(item.checkoutStage, item.lastPath || '/'),
        reachedCheckout: toBoolean(item.reachedCheckout, false),
        lastCheckoutAt: item.lastCheckoutAt || '',
        heartbeatCount: Math.max(1, Number(item.heartbeatCount || 1)),
        cartProducts: Array.isArray(item.cartProducts) ? sanitizeCartProducts(item.cartProducts) : [],
        firstSeenAt: item.firstSeenAt,
        lastSeenAt: item.lastSeenAt
    });

    return {
        generatedAt: new Date(nowMs).toISOString(),
        windows: {
            liveSeconds: Math.max(1, Math.round(LIVE_WINDOW_MS / 1000)),
            liveMinutes: Math.max(1, Math.ceil(LIVE_WINDOW_MS / 60000)),
            recentHours: 24,
            dailyDays: DAILY_WINDOW_DAYS
        },
        summary: {
            liveCount: live.length,
            recent24hCount: recent.length,
            countriesCount: topCountries.length,
            citiesCount: topCities.length
        },
        liveVisitors: live.slice(0, 60).map(mapVisitor),
        recentVisitors: recent.slice(0, 120).map(mapVisitor),
        topCountries: topCountries.slice(0, 40),
        topCities: topCities.slice(0, 40).map((row) => ({
            city: row.label,
            count: row.count
        })),
        points: {
            live: pointsLive,
            recent: pointsRecent,
            countries: countryAnchors
        },
        hourly,
        daily
    };
}

async function recordVisitorHeartbeat(req, payload = {}) {
    const sessionId = normalizeSessionId(payload?.sid);
    if (!sessionId) {
        return { ok: false, status: 400, error: 'Invalid visitor session.' };
    }

    const state = await readAnalyticsState();
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const todayKey = dayKeyDubai(nowMs);
    const current = normalizeSessions(state.sessions || {});
    const previous = current[sessionId] || {};
    const geo = geoFromRequest(req);

    const firstSeenPrevious = parseTimestamp(previous.firstSeenAt);
    const previousTodaySeenMs = parseTimestamp(previous.firstSeenTodayAt);
    const sameDaySession = String(previous.visitorDayKey || '').trim() === todayKey && previousTodaySeenMs > 0;
    const reason = safeText(payload?.reason, 24).toLowerCase();
    const payloadCountryCode = safeText(payload?.countryCode, 8).toUpperCase();
    const payloadCity = decodeHeaderText(payload?.city, 80);
    const payloadRegion = decodeHeaderText(payload?.region, 80);
    const payloadGeoSource = safeText(payload?.geoSource, 24).toLowerCase();
    const payloadLatitude = toFiniteNumber(payload?.latitude);
    const payloadLongitude = toFiniteNumber(payload?.longitude);
    const payloadPairValid = !isInvalidCoordinatePair(payloadLatitude, payloadLongitude);
    const geoLatitude = toFiniteNumber(geo.latitude);
    const geoLongitude = toFiniteNumber(geo.longitude);
    const geoPairValid = !isInvalidCoordinatePair(geoLatitude, geoLongitude);
    const previousLatitude = toFiniteNumber(previous.latitude);
    const previousLongitude = toFiniteNumber(previous.longitude);
    const previousPairValid = !isInvalidCoordinatePair(previousLatitude, previousLongitude);
    const latitude = payloadPairValid
        ? payloadLatitude
        : (geoPairValid ? geoLatitude : (previousPairValid ? previousLatitude : null));
    const longitude = payloadPairValid
        ? payloadLongitude
        : (geoPairValid ? geoLongitude : (previousPairValid ? previousLongitude : null));
    const coordinatesValid = !isInvalidCoordinatePair(latitude, longitude);
    const countryCode = payloadCountryCode || geo.countryCode || previous.countryCode || '';
    const nearestCity = coordinatesValid
        ? resolveNearestCityFromCoordinates(latitude, longitude, countryCode)
        : null;
    const country = payloadCountryCode
        ? (countryNameFromCode(countryCode) || geo.country || previous.country || countryCode)
        : (geo.country || previous.country || countryNameFromCode(countryCode) || countryCode);
    const lastPath = normalizePath(payload?.path || payload?.page || previous.lastPath || '/');
    const payloadCartItemsRaw = toFiniteNumber(payload?.cartItems);
    const previousCartItems = toSafeInteger(previous.cartItems, { min: 0, max: 999, fallback: 0 });
    const hasPayloadCartProducts = Object.prototype.hasOwnProperty.call(payload || {}, 'cartProducts');
    const payloadCartProducts = sanitizeCartProducts(payload?.cartProducts);
    const cartItems = payloadCartItemsRaw === null
        ? previousCartItems
        : toSafeInteger(payloadCartItemsRaw, { min: 0, max: 999, fallback: 0 });
    const hasCart = payloadCartItemsRaw !== null
        ? cartItems > 0
        : toBoolean(payload?.hasCart, Boolean(previous.hasCart) || previousCartItems > 0);
    const payloadCartUpdatedMs = toFiniteNumber(payload?.cartUpdatedAt);
    const previousCartUpdatedMs = parseTimestamp(previous.cartUpdatedAt);
    const cartUpdatedAt = payloadCartUpdatedMs !== null && payloadCartUpdatedMs > 0
        ? new Date(toSafeInteger(payloadCartUpdatedMs, { min: 0, max: Number.MAX_SAFE_INTEGER, fallback: nowMs })).toISOString()
        : (previousCartUpdatedMs > 0 ? new Date(previousCartUpdatedMs).toISOString() : '');
    const checkoutStage = normalizeCheckoutStage(payload?.checkoutStage || previous.checkoutStage || '', lastPath);
    const payloadReachedCheckout = toBoolean(payload?.reachedCheckout, false);
    const reachedByStage = checkoutStage === 'delivery'
        || checkoutStage === 'email'
        || checkoutStage === 'payment'
        || checkoutStage === 'completed';
    const reachedCheckout = Boolean(previous.reachedCheckout) || payloadReachedCheckout || reachedByStage;
    const previousLastCheckoutMs = parseTimestamp(previous.lastCheckoutAt);
    const lastCheckoutAt = reachedByStage || payloadReachedCheckout
        ? nowIso
        : (previousLastCheckoutMs > 0 ? new Date(previousLastCheckoutMs).toISOString() : '');
    const resolvedCartProducts = hasPayloadCartProducts
        ? payloadCartProducts
        : (payloadCartItemsRaw === null && cartItems > 0 && Array.isArray(previous.cartProducts)
            ? sanitizeCartProducts(previous.cartProducts)
            : (cartItems > 0 ? payloadCartProducts : []));

    current[sessionId] = {
        sessionId,
        firstSeenAt: firstSeenPrevious > 0 ? new Date(firstSeenPrevious).toISOString() : nowIso,
        lastSeenAt: nowIso,
        firstSeenTodayAt: sameDaySession ? new Date(previousTodaySeenMs).toISOString() : nowIso,
        visitorDayKey: todayKey,
        lastReason: safeText(payload?.reason || previous.lastReason || '', 24).toLowerCase(),
        lastPath,
        lastReferrer: normalizeReferrer(payload?.referrer || previous.lastReferrer || ''),
        language: safeText(payload?.lang || payload?.language || previous.language || '', 40),
        timezone: safeText(payload?.tz || payload?.timezone || geo.timezone || previous.timezone || '', 80),
        viewport: safeText(payload?.viewport || previous.viewport || '', 40),
        userAgent: safeText(req?.headers?.['user-agent'] || previous.userAgent || '', 220),
        ipHash: geo.ipHash || previous.ipHash || '',
        geoSource: payloadGeoSource || previous.geoSource || '',
        countryCode,
        country,
        region: payloadRegion || geo.region || previous.region || '',
        city: payloadCity || nearestCity || geo.city || previous.city || '',
        continent: geo.continent || previous.continent || '',
        latitude: coordinatesValid ? latitude : null,
        longitude: coordinatesValid ? longitude : null,
        heartbeatCount: Math.max(1, Number(previous.heartbeatCount || 0) + 1),
        cartItems,
        hasCart,
        cartProducts: resolvedCartProducts,
        cartUpdatedAt,
        checkoutStage,
        reachedCheckout,
        lastCheckoutAt
    };

    const prunedSessions = pruneSessions(current, nowMs);
    const nowPersistStateMs = Number(globalThis.__ghoharyAnalyticsStateWriteThrottle[sessionId] || 0);
    const nowPersistLiveMs = Number(globalThis.__ghoharyAnalyticsLiveSessionWriteThrottle[sessionId] || 0);
    const previousSession = {
        lastPath: previous.lastPath || '',
        lastReason: previous.lastReason || '',
        checkoutStage: previous.checkoutStage || '',
        reachedCheckout: Boolean(previous.reachedCheckout),
        hasCart: Boolean(previous.hasCart),
        cartItems: toSafeInteger(previous.cartItems, { min: 0, max: 999, fallback: 0 }),
        cartUpdatedAt: previous.cartUpdatedAt || '',
        countryCode: previous.countryCode || '',
        city: previous.city || ''
    };
    const currentSession = {
        lastPath: normalizePath(lastPath),
        lastReason: safeText(payload?.reason || previous.lastReason || '', 24).toLowerCase(),
        checkoutStage,
        reachedCheckout: Boolean(reachedCheckout),
        hasCart: Boolean(hasCart),
        cartItems: toSafeInteger(cartItems, { min: 0, max: 999, fallback: 0 }),
        cartUpdatedAt: cartUpdatedAt,
        countryCode: countryCode,
        city: payloadCity || nearestCity || geo.city || previous.city || ''
    };

    const hasMeaningfulDelta = (
        reason !== 'pulse'
        || currentSession.lastPath !== previousSession.lastPath
        || currentSession.lastReason !== previousSession.lastReason
        || currentSession.checkoutStage !== previousSession.checkoutStage
        || currentSession.reachedCheckout !== previousSession.reachedCheckout
        || currentSession.hasCart !== previousSession.hasCart
        || currentSession.cartItems !== previousSession.cartItems
        || currentSession.cartUpdatedAt !== previousSession.cartUpdatedAt
        || currentSession.countryCode !== previousSession.countryCode
        || currentSession.city !== previousSession.city
    );
    const shouldPersistState = hasMeaningfulDelta || nowPersistStateMs === 0 || (nowMs - nowPersistStateMs >= ANALYTICS_STATE_PERSIST_GAP_MS);
    const shouldPersistLiveSession = reason !== 'pulse' || nowPersistLiveMs === 0 || (nowMs - nowPersistLiveMs >= ANALYTICS_LIVE_SESSION_PERSIST_GAP_MS);

    if (shouldPersistState) {
        await writeAnalyticsState({ sessions: prunedSessions });
        globalThis.__ghoharyAnalyticsStateWriteThrottle[sessionId] = nowMs;
    } else {
        setCachedAnalyticsState({
            sessions: prunedSessions,
            updatedAt: nowIso,
            fetchedAt: nowMs
        });
    }

    if (shouldPersistLiveSession) {
        await writeLiveSession(prunedSessions[sessionId] || current[sessionId]);
        globalThis.__ghoharyAnalyticsLiveSessionWriteThrottle[sessionId] = nowMs;
    }

    return { ok: true, status: 200 };
}

module.exports = {
    analyticsStoreConfigured,
    parseBody,
    readAnalyticsState,
    writeAnalyticsState,
    readLiveOverlaySessions,
    recordVisitorHeartbeat,
    buildAnalyticsSnapshot,
    LIVE_WINDOW_MS,
    RECENT_WINDOW_MS,
    DAILY_WINDOW_DAYS
};
