const RESET_LIMIT = 2;
const BAN_CACHE_TTL = 5 * 60 * 1e3;
const banCache = new Map();

function resolvePlainId(target) {
  if (!target) return "";
  if (typeof target === "string") return target;
  if (target.plainUserId) return String(target.plainUserId);
  if (target.session?.userId) return String(target.session.userId);
  if (target.userId) return String(target.userId);
  return "";
}

async function normalizeRecord(ctx, record) {
  if (!record) return null;
  const updates = {};
  if (record.resetCount == null) {
    updates.resetCount = record.lastResetTime ? 1 : 0;
  }
  if (record.isBanned == null) {
    updates.isBanned = false;
  }
  if (Object.keys(updates).length) {
    await ctx.database.set("player_market_reset_logs", { userId: record.userId }, updates);
    Object.assign(record, updates);
  }
  return record;
}

async function getResetRecord(ctx, identifier) {
  const plainId = resolvePlainId(identifier);
  if (!plainId) return null;
  const records = await ctx.database.get("player_market_reset_logs", { plainUserId: plainId });
  if (!records.length) return null;
  return await normalizeRecord(ctx, records[0]);
}

async function upsertResetRecord(ctx, player, updates = {}) {
  const plainId = resolvePlainId(player);
  if (!plainId) return null;
  const records = await ctx.database.get("player_market_reset_logs", { plainUserId: plainId });
  const now = updates.lastResetTime ?? Date.now();
  if (records.length) {
    const existing = records[0];
    const payload = {
      scopeId: player.scopeId || existing.scopeId || "",
      plainUserId: plainId,
      lastResetTime: now,
      resetCount: updates.resetCount ?? existing.resetCount ?? (existing.lastResetTime ? 1 : 0),
      isBanned: updates.isBanned ?? existing.isBanned ?? false
    };
    await ctx.database.set("player_market_reset_logs", { userId: existing.userId }, payload);
    banCache.delete(plainId);
    return { ...existing, ...payload };
  }
  const payload = {
    userId: player.userId || plainId,
    scopeId: player.scopeId || "",
    plainUserId: plainId,
    lastResetTime: now,
    resetCount: updates.resetCount ?? 0,
    isBanned: updates.isBanned ?? false
  };
  await ctx.database.create("player_market_reset_logs", payload);
  banCache.delete(plainId);
  return payload;
}

async function isResetBanned(ctx, identifier) {
  const plainId = resolvePlainId(identifier);
  if (!plainId) return false;
  const cached = banCache.get(plainId);
  const now = Date.now();
  if (cached && now - cached.timestamp < BAN_CACHE_TTL) {
    return cached.value;
  }
  const record = await getResetRecord(ctx, plainId);
  const value = record?.isBanned ?? false;
  banCache.set(plainId, { value, timestamp: now });
  return value;
}

function invalidateResetCache(identifier) {
  const plainId = resolvePlainId(identifier);
  if (plainId) banCache.delete(plainId);
}

module.exports = {
  RESET_LIMIT,
  resolvePlainId,
  getResetRecord,
  upsertResetRecord,
  isResetBanned,
  invalidateResetCache
};
