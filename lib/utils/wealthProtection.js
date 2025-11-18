const { getScopeKey } = require("./playerHelpers");

const WEALTH_CACHE_TTL = 60 * 1e3;
const wealthCache = new Map();

function computeWealth(user) {
  if (!user)
    return 0;
  const balance = Math.max(0, Number(user.balance) || 0);
  const deposit = Math.max(0, Number(user.deposit) || 0);
  return balance + deposit;
}
function resolveScopeId(sessionOrScope) {
  if (!sessionOrScope)
    return null;
  if (typeof sessionOrScope === "string")
    return sessionOrScope;
  return getScopeKey(sessionOrScope);
}
async function fetchScopeProtection(ctx, scopeId) {
  const now = Date.now();
  const cached = wealthCache.get(scopeId);
  if (cached && now - cached.timestamp < WEALTH_CACHE_TTL)
    return cached;
  const users = await ctx.database.get("player_market_users", { scopeId });
  const protectedSet = new Set();
  if (users.length) {
    const sorted = users.map((user) => ({
      userId: user.userId,
      wealth: computeWealth(user)
    })).sort((a, b) => a.wealth - b.wealth);
    const count = Math.max(1, Math.ceil(sorted.length / 2));
    for (let i = 0; i < count; i++) {
      protectedSet.add(sorted[i].userId);
    }
  }
  const payload = { protectedSet, timestamp: now };
  wealthCache.set(scopeId, payload);
  return payload;
}
async function isWealthProtected(ctx, session, user) {
  if (!user)
    return false;
  const scopeId = resolveScopeId(session);
  if (!scopeId)
    return false;
  const { protectedSet } = await fetchScopeProtection(ctx, scopeId);
  return protectedSet.has(user.userId);
}
function invalidateWealthCache(sessionOrScope) {
  const scopeId = resolveScopeId(sessionOrScope);
  if (!scopeId)
    return;
  wealthCache.delete(scopeId);
}

module.exports = {
  isWealthProtected,
  invalidateWealthCache
};

