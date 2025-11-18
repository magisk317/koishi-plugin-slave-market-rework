function pickString(...values) {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

function resolveGroupCard(session) {
  return pickString(
    session?.member?.card,
    session?.event?.member?.card,
    session?.author?.card,
    session?.onebot?.sender?.card,
    session?.onebot?.info?.card,
    session?.member?.user?.card,
  );
}

function resolveNickname(session) {
  const card = resolveGroupCard(session);
  if (card) return card;
  const id = session?.userId ? String(session.userId) : Math.floor(Math.random() * 1e4).toString();
  return `玩家${id.slice(-4) || id}`;
}

function registrationGuide() {
  return "❌ 数据尚未创建，系统正在自动登记，请稍后重试。";
}

function registrationShortGuide() {
  return "系统正在为你建立档案，请稍后再试一次。";
}

function normalizeScopeKey(value) {
  if (!value) return "global";
  return String(value).replace(/#/g, ":");
}

function getScopeKey(session) {
  if (!session) return "global";
  const base = session.guildId || session.channelId || (session.platform ? `${session.platform}:global` : "global");
  return normalizeScopeKey(base);
}

function buildScopedId(scopeKey, rawUserId) {
  return `${scopeKey}#${rawUserId ?? ""}`;
}

function getSessionScopedUserId(session) {
  if (!session?.userId) return null;
  return buildScopedId(getScopeKey(session), session.userId);
}

function getScopedUserId(session, rawUserId) {
  const scopeKey = getScopeKey(session);
  const actual = rawUserId ?? session?.userId ?? "";
  return buildScopedId(scopeKey, actual);
}

function ensureScopedId(session, rawUserId) {
  if (rawUserId?.includes?.("#")) return rawUserId;
  if (!session) return rawUserId;
  return getScopedUserId(session, rawUserId);
}

function createScopeFilter(session, extra = {}) {
  return {
    scopeId: getScopeKey(session),
    ...extra,
  };
}

function parseTimeToMinutes(value) {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{1,2})(?::(\d{1,2}))?$/);
  if (!match) return null;
  const hours = Math.min(23, Math.max(0, Number(match[1])));
  const minutes = Math.min(59, Math.max(0, Number(match[2] ?? 0)));
  return hours * 60 + minutes;
}

function isWithinBonusPeriod(now, bonusConfig) {
  if (!bonusConfig?.启用) return false;
  const start = parseTimeToMinutes(bonusConfig.开始时间);
  const end = parseTimeToMinutes(bonusConfig.结束时间);
  if (start == null || end == null) return false;
  const date = new Date(now);
  const minutes = date.getHours() * 60 + date.getMinutes();
  if (start <= end) return minutes >= start && minutes <= end;
  return minutes >= start || minutes <= end;
}

function calculateRegistrationBonus(now, config) {
  if (!config?.注册激励) return 0;
  return isWithinBonusPeriod(now, config.注册激励) ? config.注册激励.奖励金额 : 0;
}

function extractMentionedUserId(session) {
  const elements = [];
  if (Array.isArray(session?.elements)) elements.push(...session.elements);
  if (Array.isArray(session?.event?.elements)) elements.push(...session.event.elements);
  for (const element of elements) {
    if (!element || element.type !== "at") continue;
    const attrs = element.attrs ?? element;
    const mentionId = attrs?.id ?? attrs?.qq ?? attrs?.userId ?? attrs?.target ?? attrs?.name;
    if (mentionId) return String(mentionId);
  }
  if (session?.quote?.userId) return String(session.quote.userId);
  if (session?.quote?.sender?.userId) return String(session.quote.sender.userId);
  return null;
}

function normalizeIdentifier(value) {
  if (typeof value !== "string") return "";
  return value.replace(/^[\s@＠]+/, "").trim();
}

async function resolveTargetUser(ctx, session, identifier) {
  const scopeId = getScopeKey(session);
  const mentionId = extractMentionedUserId(session);
  if (mentionId) {
    const scopedMention = buildScopedId(scopeId, mentionId);
    const targetByMention = await ctx.database.get("player_market_users", { userId: scopedMention });
    if (targetByMention.length) return targetByMention[0];
  }
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) return null;
  if (normalized.includes("#")) {
    const direct = await ctx.database.get("player_market_users", { userId: normalized });
    if (direct.length) return direct[0];
  }
  let users = await ctx.database.get("player_market_users", { scopeId, plainUserId: normalized });
  if (users.length) return users[0];
  users = await ctx.database.get("player_market_users", { scopeId, nickname: normalized });
  if (users.length) return users[0];
  return null;
}

function resolveScopeInput(session, scopeInput) {
  const fallback = getScopeKey(session);
  const raw = typeof scopeInput === "string" ? scopeInput.trim() : "";
  if (!raw) return fallback;
  const colonIndex = raw.indexOf(":");
  if (colonIndex > 0) {
    const prefix = raw.slice(0, colonIndex).toLowerCase();
    const rest = raw.slice(colonIndex + 1).trim();
    if ((prefix === "qq" || prefix === "onebot") && rest) {
      return rest;
    }
  }
  return raw;
}

module.exports = {
  pickString,
  resolveGroupCard,
  resolveNickname,
  registrationGuide,
  registrationShortGuide,
  getSessionScopedUserId,
  normalizeScopeKey,
  getScopeKey,
  buildScopedId,
  getScopedUserId,
  ensureScopedId,
  createScopeFilter,
  parseTimeToMinutes,
  isWithinBonusPeriod,
  calculateRegistrationBonus,
  extractMentionedUserId,
  normalizeIdentifier,
  resolveTargetUser,
  resolveScopeInput,
};
