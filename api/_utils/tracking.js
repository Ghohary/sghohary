const FEDEX_TOKEN_PATH = '/oauth/token';
const FEDEX_TRACK_PATH = '/track/v1/trackingnumbers';
const DHL_TRACK_PATH = '/track/shipments';

let cachedFedexToken = null;
let cachedFedexTokenExpiry = 0;

function trackingError(message, code = 'TRACKING_ERROR') {
    const error = new Error(message);
    error.code = code;
    return error;
}

function cleanTrackingNumber(value) {
    return String(value || '').trim().replace(/\s+/g, '');
}

function compactLocation(parts) {
    return parts
        .map((part) => String(part || '').trim())
        .filter(Boolean)
        .join(', ');
}

function isDeliveredStatus(value) {
    const status = String(value || '').toLowerCase();
    if (!status) return false;
    return /(delivered|signed|proof of delivery|shipment delivered|successfully delivered)/.test(status);
}

function getFedexBase() {
    const env = (process.env.FEDEX_ENV || 'production').toLowerCase();
    return env === 'sandbox' ? 'https://apis-sandbox.fedex.com' : 'https://apis.fedex.com';
}

async function getFedexToken() {
    const now = Date.now();
    if (cachedFedexToken && cachedFedexTokenExpiry > now + 30_000) {
        return cachedFedexToken;
    }

    const clientId = process.env.FEDEX_CLIENT_ID;
    const clientSecret = process.env.FEDEX_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        throw trackingError('FedEx credentials are not configured.', 'CONFIG_MISSING');
    }

    const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret
    }).toString();

    const response = await fetch(`${getFedexBase()}${FEDEX_TOKEN_PATH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
    });

    if (!response.ok) {
        const text = await response.text();
        throw trackingError(`FedEx auth failed: ${text}`, 'PROVIDER_ERROR');
    }

    const data = await response.json();
    cachedFedexToken = data.access_token;
    cachedFedexTokenExpiry = now + (Number(data.expires_in || 0) * 1000);
    return cachedFedexToken;
}

function extractFedexSummary(trackData) {
    const result = trackData?.output?.completeTrackResults?.[0]?.trackResults?.[0];
    if (!result) return null;

    const status = result.latestStatusDetail?.statusByLocale
        || result.latestStatusDetail?.description
        || result.latestStatusDetail?.statusByEnglish
        || 'Status unavailable';

    const latestScan = Array.isArray(result.scanEvents) ? result.scanEvents[0] : null;
    const lastScan = latestScan
        ? {
            description: latestScan.eventDescription || latestScan.eventType || '',
            date: latestScan.date || latestScan.dateTime || '',
            location: compactLocation([
                latestScan.scanLocation?.city,
                latestScan.scanLocation?.countryCode
            ])
        }
        : null;

    const etaEntry = Array.isArray(result.dateAndTimes)
        ? result.dateAndTimes.find((entry) => /estimated/i.test(entry.type || ''))
        : null;
    const estimatedDelivery = etaEntry?.dateOrTimestamp || etaEntry?.date || '';

    const scans = Array.isArray(result.scanEvents)
        ? result.scanEvents.map((event) => ({
            description: event.eventDescription || event.eventType || '',
            date: event.date || event.dateTime || '',
            location: compactLocation([
                event.scanLocation?.city,
                event.scanLocation?.countryCode
            ])
        }))
        : [];

    return {
        status,
        lastScan,
        estimatedDelivery,
        scans,
        delivered: isDeliveredStatus(status) || scans.some((scan) => isDeliveredStatus(scan.description))
    };
}

async function trackWithFedex(trackingNumber) {
    const token = await getFedexToken();
    const response = await fetch(`${getFedexBase()}${FEDEX_TRACK_PATH}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            trackingInfo: [{ trackingNumberInfo: { trackingNumber } }],
            includeDetailedScans: true
        })
    });

    if (!response.ok) {
        const text = await response.text();
        const code = /not found|invalid|does not exist|no tracking/i.test(text) ? 'NOT_FOUND' : 'PROVIDER_ERROR';
        throw trackingError(`FedEx tracking failed: ${text}`, code);
    }

    const data = await response.json();
    const summary = extractFedexSummary(data);
    if (!summary) {
        throw trackingError('FedEx did not return tracking data for this number.', 'NOT_FOUND');
    }
    if (
        String(summary.status || '').toLowerCase() === 'status unavailable'
        && !summary.lastScan
        && (!Array.isArray(summary.scans) || summary.scans.length === 0)
    ) {
        throw trackingError('FedEx did not return tracking data for this number.', 'NOT_FOUND');
    }

    return summary;
}

function getDhlTrackBase() {
    return String(process.env.DHL_TRACK_BASE || 'https://api-eu.dhl.com').replace(/\/+$/, '');
}

function parseDhlEvent(event) {
    return {
        description: String(
            event?.description
            || event?.status
            || event?.eventDescription
            || event?.eventType
            || ''
        ).trim(),
        date: String(event?.timestamp || event?.date || event?.dateTime || '').trim(),
        location: compactLocation([
            event?.location?.displayName,
            event?.location?.address?.addressLocality,
            event?.location?.address?.addressRegion,
            event?.location?.address?.postalCode,
            event?.location?.address?.addressCountry,
            event?.location?.city,
            event?.location?.countryCode
        ])
    };
}

function extractDhlSummary(payload) {
    const shipment = payload?.shipments?.[0] || payload?.results?.[0] || null;
    if (!shipment) return null;

    const status = String(
        shipment?.status?.status
        || shipment?.status?.description
        || shipment?.status?.statusCode
        || shipment?.currentStatus
        || 'Status unavailable'
    ).trim();

    const statusEvent = {
        description: status || 'Status update',
        date: String(
            shipment?.status?.timestamp
            || shipment?.status?.date
            || shipment?.status?.dateTime
            || ''
        ).trim(),
        location: compactLocation([
            shipment?.status?.location?.displayName,
            shipment?.status?.location?.address?.addressLocality,
            shipment?.status?.location?.address?.addressRegion,
            shipment?.status?.location?.address?.postalCode,
            shipment?.status?.location?.address?.addressCountry
        ])
    };

    const rawEvents = Array.isArray(shipment?.events)
        ? shipment.events
        : (Array.isArray(shipment?.checkpoints) ? shipment.checkpoints : []);
    const scans = rawEvents
        .map(parseDhlEvent)
        .filter((event) => event.description || event.date || event.location);

    const lastScan = scans[0] || statusEvent;
    const timeframe = shipment?.estimatedDeliveryTimeFrame || {};
    const estimatedDelivery = String(
        timeframe?.estimatedFrom
        || timeframe?.estimatedThrough
        || shipment?.estimatedDeliveryDate
        || shipment?.delivery?.estimatedTime
        || ''
    ).trim();

    return {
        status,
        lastScan,
        estimatedDelivery,
        scans,
        delivered: isDeliveredStatus(status) || scans.some((scan) => isDeliveredStatus(scan.description))
    };
}

async function trackWithDhl(trackingNumber) {
    const apiKey = String(process.env.DHL_API_KEY || '').trim();
    if (!apiKey) {
        throw trackingError('DHL API key is not configured.', 'CONFIG_MISSING');
    }

    const url = `${getDhlTrackBase()}${DHL_TRACK_PATH}?trackingNumber=${encodeURIComponent(trackingNumber)}`;
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'DHL-API-Key': apiKey,
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        const text = await response.text();
        const code = response.status === 404 || /not found|invalid|unknown/i.test(text) ? 'NOT_FOUND' : 'PROVIDER_ERROR';
        throw trackingError(`DHL tracking failed: ${text}`, code);
    }

    const data = await response.json();
    const summary = extractDhlSummary(data);
    if (!summary) {
        throw trackingError('DHL did not return tracking data for this number.', 'NOT_FOUND');
    }

    return summary;
}

function preferredCarrierOrder(trackingNumber, preferredCarrier = '') {
    const preferred = String(preferredCarrier || '').trim().toLowerCase();
    if (preferred === 'dhl') return ['dhl', 'fedex'];
    if (preferred === 'fedex') return ['fedex', 'dhl'];

    const number = cleanTrackingNumber(trackingNumber).toUpperCase();
    const likelyDhl = /^JD[0-9A-Z]{10,30}$/.test(number)
        || /^JJD[0-9A-Z]{8,30}$/.test(number)
        || /^3S[0-9A-Z]{8,30}$/.test(number)
        || /^[A-Z]{2}[0-9]{9}[A-Z]{2}$/.test(number)
        || /^[0-9]{10}$/.test(number);
    const likelyFedex = /^[0-9]{12}$/.test(number)
        || /^[0-9]{15}$/.test(number)
        || /^[0-9]{20}$/.test(number)
        || /^[0-9]{22}$/.test(number)
        || /^[0-9]{34}$/.test(number);

    if (likelyDhl && !likelyFedex) return ['dhl', 'fedex'];
    if (likelyFedex && !likelyDhl) return ['fedex', 'dhl'];
    if (likelyDhl) return ['dhl', 'fedex'];
    return ['fedex', 'dhl'];
}

async function trackShipment({ trackingNumber, carrier } = {}) {
    const cleanedTrackingNumber = cleanTrackingNumber(trackingNumber);
    if (!cleanedTrackingNumber) {
        throw trackingError('Tracking number required', 'VALIDATION');
    }

    const candidates = preferredCarrierOrder(cleanedTrackingNumber, carrier);
    const attempts = [];

    for (const candidate of candidates) {
        try {
            const summary = candidate === 'dhl'
                ? await trackWithDhl(cleanedTrackingNumber)
                : await trackWithFedex(cleanedTrackingNumber);
            return {
                carrier: candidate,
                summary
            };
        } catch (error) {
            attempts.push({ carrier: candidate, error });
        }
    }

    const hasConfigMissing = attempts.some((attempt) => attempt.error?.code === 'CONFIG_MISSING');
    if (hasConfigMissing) {
        return {
            carrier: 'manual',
            warning: 'Live tracking API is not configured for one or more carriers.',
            summary: {
                status: 'Tracking number saved',
                lastScan: null,
                estimatedDelivery: '',
                scans: [],
                delivered: false
            }
        };
    }

    const firstError = attempts[0]?.error;
    if (firstError) {
        throw firstError;
    }
    throw trackingError('Tracking failed', 'TRACKING_ERROR');
}

module.exports = {
    cleanTrackingNumber,
    trackShipment
};
