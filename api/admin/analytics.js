const { requireAdmin } = require('../_utils/admin-auth');
const { readAnalyticsState } = require('../_utils/visitor-analytics');

const ACTIVE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (!requireAdmin(req, res)) {
        return;
    }

    res.setHeader('Cache-Control', 'no-store, max-age=0');

    try {
        const state = await readAnalyticsState();
        const sessions = state?.sessions || {};
        const nowMs = Date.now();
        const cutoff = nowMs - ACTIVE_WINDOW_MS;

        // Filter all sessions seen within 15 minutes, skip bots and internal paths
        const BOT_RE = /(bot|spider|crawl|slurp|bingpreview|headless|phantom|preview|facebookexternalhit|telegrambot|discordbot|curl|wget|python-requests|axios|postman|googleweblight|slackbot|linkedinbot|embedly)/i;
        const activeVisitors = [];

        for (const session of Object.values(sessions)) {
            const lastSeenAt = session?.lastSeenAt || '';
            const lastSeenMs = lastSeenAt ? new Date(lastSeenAt).getTime() : 0;
            if (!lastSeenMs || lastSeenMs < cutoff) continue;

            // Skip bots
            const ua = String(session?.userAgent || '');
            if (ua && BOT_RE.test(ua)) continue;

            // Skip internal paths
            const path = String(session?.lastPath || '/');
            if (path.startsWith('/admin') || path.startsWith('/api')) continue;

            const countryCode = String(session?.countryCode || '').toUpperCase();
            if (!countryCode) continue;

            activeVisitors.push({
                countryCode,
                country: session?.country || countryCode,
                lastSeenAt,
            });
        }

        // Aggregate by country for summary
        const countryMap = new Map();
        for (const v of activeVisitors) {
            const existing = countryMap.get(v.countryCode);
            if (existing) {
                existing.count += 1;
            } else {
                countryMap.set(v.countryCode, {
                    countryCode: v.countryCode,
                    country: v.country,
                    count: 1,
                });
            }
        }
        const topCountries = Array.from(countryMap.values())
            .sort((a, b) => b.count - a.count);

        return res.status(200).json({
            generatedAt: new Date(nowMs).toISOString(),
            liveCount: activeVisitors.length,
            liveVisitors: activeVisitors,
            topCountries,
        });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to read analytics', detail: String(error?.message || error) });
    }
}
