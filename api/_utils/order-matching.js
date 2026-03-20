const GOLD_FRINGES_SKU = 'GH-GOLDFR-740647';

function normalizeText(value) {
    return String(value || '').trim();
}

function normalizeLookupName(value) {
    return normalizeText(value).toLowerCase();
}

function normalizeSkuValue(value) {
    return normalizeText(value)
        .toUpperCase()
        .replace(/[^A-Z0-9-]/g, '')
        .replace(/-{2,}/g, '-')
        .replace(/^-+|-+$/g, '');
}

function inferSkuByAlias(value) {
    const normalized = normalizeLookupName(value)
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!normalized) return '';

    if (/\bgold(?:en)?\s+fringes\b/.test(normalized) || /\bfringe?s?\s+gold\b/.test(normalized)) {
        return GOLD_FRINGES_SKU;
    }

    return '';
}

function resolveAliasSku(value) {
    return inferSkuByAlias(value);
}

function isGoldenFringesAlias(value) {
    return Boolean(resolveAliasSku(value));
}

function stripSizeFromName(value) {
    const candidate = normalizeText(value);
    if (!candidate) return '';
    return candidate
        .replace(/\s*[\[\(]\s*size[^)\]]*[\)\]]\s*$/i, '')
        .replace(/\s*-\s*size\s+.*$/i, '')
        .trim();
}

function normalizeForMatch(value) {
    const normalized = normalizeLookupName(value)
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!normalized) return [];

    return normalized
        .split(' ')
        .map((word) => {
            const trimmed = word.trim();
            if (!trimmed) return '';
            if (trimmed === 'golden') return 'gold';
            if (trimmed.length > 4 && trimmed.endsWith('ing')) return trimmed.slice(0, -3);
            if (trimmed.length > 3 && trimmed.endsWith('en')) return trimmed.slice(0, -2);
            if (trimmed.length > 3 && trimmed.endsWith('es')) return trimmed.slice(0, -1);
            return trimmed;
        })
        .filter(Boolean);
}

function findFallbackMatchByTokens(name, itemPrice, productLookup) {
    if (!productLookup || !name) return null;
    const sourceTokens = normalizeForMatch(name);
    if (!sourceTokens.length) return null;

    const sourceTokenSet = new Set(sourceTokens);
    let bestMatch = null;
    let bestScore = 0;

    const candidates = productLookup?.byId?.values ? productLookup.byId.values() : [];
    for (const product of candidates) {
        const candidateTokens = normalizeForMatch(product?.name || '');
        if (!candidateTokens.length) continue;
        const candidateSet = new Set(candidateTokens);
        let overlap = 0;
        for (const token of sourceTokenSet) {
            if (candidateSet.has(token)) overlap += 1;
        }
        if (overlap === 0) continue;

        let score = overlap * 100;
        if (Number.isFinite(itemPrice) && Number.isFinite(product?.price)) {
            if (Math.abs(Number(product.price) - itemPrice) <= 0.01) {
                score += 50;
            } else if (Math.abs(Number(product.price) - itemPrice) <= 1) {
                score += 10;
            }
        }

        if (score > bestScore) {
            bestMatch = product;
            bestScore = score;
        }
    }

    return bestMatch;
}

module.exports = {
    GOLD_FRINGES_SKU,
    normalizeText,
    normalizeLookupName,
    normalizeSkuValue,
    inferSkuByAlias,
    resolveAliasSku,
    isGoldenFringesAlias,
    stripSizeFromName,
    normalizeForMatch,
    findFallbackMatchByTokens
};
