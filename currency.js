(function() {
    'use strict';

    const CONSENT_KEY = 'ghoharyCookieConsent';
    const GEO_KEY = 'ghoharyGeo';
    const SELECTED_COUNTRY_KEY = 'ghoharySelectedCountry';
    const SELECTED_COUNTRY_SESSION_KEY = 'ghoharySelectedCountrySession';
    const STATE_KEY = 'ghoharyCurrencyState';
    const RATE_CACHE_KEY = 'ghoharyCurrencyRateCache';
    const RATE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

    const EURO_COUNTRIES = new Set([
        'Albania',
        'Andorra',
        'Armenia',
        'Austria',
        'Azerbaijan',
        'Belarus',
        'Belgium',
        'Bosnia and Herzegovina',
        'Bulgaria',
        'Croatia',
        'Cyprus',
        'Czech Republic',
        'Czechia',
        'Denmark',
        'Estonia',
        'Finland',
        'France',
        'Georgia',
        'Germany',
        'Greece',
        'Hungary',
        'Iceland',
        'Ireland',
        'Italy',
        'Kosovo',
        'Latvia',
        'Liechtenstein',
        'Lithuania',
        'Luxembourg',
        'Malta',
        'Moldova',
        'Monaco',
        'Montenegro',
        'Netherlands',
        'North Macedonia',
        'Norway',
        'Poland',
        'Portugal',
        'Romania',
        'San Marino',
        'Serbia',
        'Slovakia',
        'Slovenia',
        'Spain',
        'Sweden',
        'Switzerland',
        'Turkey',
        'United Kingdom',
        'Vatican City'
    ]);

    const COUNTRY_CURRENCY = {
        'United Arab Emirates': 'AED',
        'Saudi Arabia': 'SAR',
        'Qatar': 'QAR',
        'Kuwait': 'KWD',
        'Bahrain': 'BHD',
        'Oman': 'OMR',
        'United States': 'USD',
        'Canada': 'CAD',
        'Australia': 'AUD',
        'New Zealand': 'NZD',
        'United Kingdom': 'GBP',
        'Turkey': 'TRY'
    };

    const COUNTRY_CODE_CURRENCY = {
        AE: 'AED',
        SA: 'SAR',
        QA: 'QAR',
        KW: 'KWD',
        BH: 'BHD',
        OM: 'OMR',
        US: 'USD',
        CA: 'CAD',
        AU: 'AUD',
        NZ: 'NZD',
        GB: 'GBP',
        TR: 'TRY'
    };

    function getCurrencyForCountry(countryName, countryCode) {
        if (countryCode && COUNTRY_CODE_CURRENCY[countryCode]) {
            return COUNTRY_CODE_CURRENCY[countryCode];
        }
        if (countryName && COUNTRY_CURRENCY[countryName]) {
            return COUNTRY_CURRENCY[countryName];
        }
        if (countryName && EURO_COUNTRIES.has(countryName)) {
            return 'EUR';
        }
        return 'AED';
    }

    function readCachedRate(code) {
        try {
            const cached = JSON.parse(localStorage.getItem(RATE_CACHE_KEY) || 'null');
            if (!cached || cached.code !== code || !cached.rate || !cached.updatedAt) return null;
            if (Date.now() - cached.updatedAt > RATE_TTL_MS) return null;
            return cached.rate;
        } catch (error) {
            return null;
        }
    }

    function writeCachedRate(code, rate) {
        localStorage.setItem(RATE_CACHE_KEY, JSON.stringify({
            code,
            rate,
            updatedAt: Date.now()
        }));
    }

    async function fetchRate(code) {
        if (code === 'AED') return 1;
        const cached = readCachedRate(code);
        if (cached) return cached;
        const endpoints = [
            `https://open.er-api.com/v6/latest/AED`,
            `https://api.exchangerate.host/latest?base=AED&symbols=${code}`
        ];

        for (const url of endpoints) {
            try {
                const response = await fetch(url);
                if (!response.ok) continue;
                const data = await response.json();
                const rateSource = data && data.rates ? data.rates : null;
                const rate = rateSource ? Number(rateSource[code]) : null;
                if (!rate) continue;
                writeCachedRate(code, rate);
                return rate;
            } catch (error) {
                // try next endpoint
            }
        }

        return null;
    }

    function getSelectedCountry() {
        const stored = localStorage.getItem(SELECTED_COUNTRY_KEY) || sessionStorage.getItem(SELECTED_COUNTRY_SESSION_KEY);
        if (!stored) return null;
        try {
            return JSON.parse(stored);
        } catch (error) {
            return null;
        }
    }

    async function getGeo() {
        try {
            const stored = JSON.parse(localStorage.getItem(GEO_KEY) || 'null');
            if (stored) return stored;
        } catch (error) {
            // ignore
        }
        try {
            const response = await fetch('https://ipapi.co/json/');
            if (!response.ok) return null;
            const data = await response.json();
            if (!data) return null;
            const geo = {
                country: data.country_name || '',
                countryCode: data.country_code || '',
                city: data.city || '',
                region: data.region || ''
            };
            localStorage.setItem(GEO_KEY, JSON.stringify(geo));
            return geo;
        } catch (error) {
            return null;
        }
    }

    async function initCurrency() {
        const selection = getSelectedCountry();
        const consented = localStorage.getItem(CONSENT_KEY) === 'accepted';

        if (!consented && !selection) {
            setCurrencyState({ code: 'AED', rate: 1, source: 'default' });
            return;
        }

        const geo = selection || await getGeo();
        const code = getCurrencyForCountry(geo?.country, geo?.countryCode);
        const rate = await fetchRate(code);
        if (!rate && code !== 'AED') {
            setCurrencyState({ code: 'AED', rate: 1, source: 'fallback' });
            return;
        }
        setCurrencyState({ code, rate: rate || 1, source: selection ? 'manual' : 'geo' });
    }

    function setCurrencyState(state) {
        const payload = {
            code: state.code || 'AED',
            rate: Number(state.rate || 1),
            source: state.source || 'default'
        };
        localStorage.setItem(STATE_KEY, JSON.stringify(payload));
        window.ghoharyCurrencyState = payload;
        window.dispatchEvent(new CustomEvent('currencyUpdated', { detail: payload }));
    }

    function getCurrencyState() {
        if (window.ghoharyCurrencyState) return window.ghoharyCurrencyState;
        try {
            const stored = JSON.parse(localStorage.getItem(STATE_KEY) || 'null');
            if (stored && stored.code && stored.rate) {
                window.ghoharyCurrencyState = stored;
                return stored;
            }
        } catch (error) {
            // ignore
        }
        return { code: 'AED', rate: 1, source: 'default' };
    }

    function formatMoney(amountAED) {
        const state = getCurrencyState();
        const amount = Number(amountAED || 0) * (state.rate || 1);
        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: state.code,
                maximumFractionDigits: 2
            }).format(amount);
        } catch (error) {
            return `${state.code} ${amount.toLocaleString()}`;
        }
    }

    function getCurrencyCode() {
        return getCurrencyState().code;
    }

    window.formatMoney = formatMoney;
    window.getCurrencyCode = getCurrencyCode;

    initCurrency();

    window.addEventListener('locationSelected', () => {
        initCurrency();
    });
})();
