const { createClient } = require('redis');

const redisUrl = process.env.ghohary_REDIS_URL || process.env.REDIS_URL || '';
let redisClient = null;
let redisConnecting = null;

function toText(value, fallback = '') {
  return String(value || '').trim() || fallback;
}

function getCollectionValue(payload, keys) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return null;

  for (const path of keys) {
    const parts = String(path).split('.');
    let current = payload;
    let valid = true;
    for (const part of parts) {
      if (!current || typeof current !== 'object' || !(part in current)) {
        valid = false;
        break;
      }
      current = current[part];
    }
    if (valid && Array.isArray(current)) {
      return current;
    }
  }

  return null;
}

function isRedisConfigured() {
  return Boolean(redisUrl);
}

async function getRedisClient() {
  if (!isRedisConfigured()) {
    return null;
  }

  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  if (!redisConnecting) {
    redisClient = createClient({ url: redisUrl });
    redisConnecting = redisClient.connect().catch((error) => {
      redisConnecting = null;
      throw error;
    });
  }

  await redisConnecting;
  return redisClient;
}

async function readStore(key, { fallback = null } = {}) {
  const client = await getRedisClient();
  if (!client) {
    return fallback;
  }

  const raw = await client.get(key);
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (error) {
    return fallback;
  }
}

async function writeStore(key, value) {
  const client = await getRedisClient();
  if (!client) {
    throw new Error('Redis storage is not configured.');
  }
  const serializable = value === undefined ? null : value;
  await client.set(key, JSON.stringify(serializable));
  return true;
}

async function readCollection(key, { collectionKeys = [], fallback = [] } = {}) {
  const payload = await readStore(key, { fallback: null });
  if (!payload) return fallback;

  const found = getCollectionValue(payload, collectionKeys);
  if (found) return found;

  if (Array.isArray(payload)) return payload;

  return fallback;
}

async function writeCollection(key, collection, { collectionKey = 'items' } = {}) {
  await writeStore(key, {
    [collectionKey]: Array.isArray(collection) ? collection : [],
    updatedAt: new Date().toISOString()
  });
}

module.exports = {
  isRedisConfigured,
  readStore,
  writeStore,
  readCollection,
  writeCollection,
  toText
};
