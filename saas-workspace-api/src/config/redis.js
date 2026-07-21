'use strict';

/**
 * src/config/redis.js
 *
 * Exports a Redis client for token blacklisting and optional caching.
 * Redis is optional — if REDIS_ENABLED=false, all methods become no-ops
 * so the rest of the application doesn't need to handle the absence.
 */

const { createClient } = require('redis');
const config = require('./index');
const logger = require('../utils/logger');

let client = null;
let isConnected = false;

// In-memory fallback for token blacklisting when Redis is disabled
const memoryStore = new Map();

async function connect() {
  if (!config.redis.enabled) {
    logger.info('Redis disabled — token blacklisting will use in-memory fallback');
    return;
  }

  client = createClient({ url: config.redis.url });

  client.on('error', (err) => logger.error({ err }, 'Redis client error'));
  client.on('connect', () => logger.info('Redis connected'));
  client.on('reconnecting', () => logger.warn('Redis reconnecting'));

  await client.connect();
  isConnected = true;
}

async function get(key) {
  if (!isConnected || !client) return memoryStore.get(key) || null;
  return client.get(key);
}

async function set(key, value, ttlSeconds) {
  if (!isConnected || !client) {
    memoryStore.set(key, value);
    if (ttlSeconds) {
      setTimeout(() => memoryStore.delete(key), ttlSeconds * 1000);
    }
    return;
  }
  await client.set(key, value, { EX: ttlSeconds });
}

async function del(key) {
  if (!isConnected || !client) {
    memoryStore.delete(key);
    return;
  }
  await client.del(key);
}

async function exists(key) {
  if (!isConnected || !client) return memoryStore.has(key);
  const result = await client.exists(key);
  return result === 1;
}

async function disconnect() {
  if (client && isConnected) {
    await client.quit();
    isConnected = false;
  }
  memoryStore.clear();
}

module.exports = { connect, get, set, del, exists, disconnect };
