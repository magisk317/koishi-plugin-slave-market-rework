var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Config: () => Config2,
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(src_exports);
var import_koishi4 = require("koishi");

// src/config/player_market.ts
var import_koishi2 = require("koishi");

// src/config/weather.ts
var import_koishi = require("koishi");
var Season = /* @__PURE__ */ ((Season2) => {
  Season2["SPRING"] = "spring";
  Season2["SUMMER"] = "summer";
  Season2["AUTUMN"] = "autumn";
  Season2["WINTER"] = "winter";
  return Season2;
})(Season || {});
var weatherEffects = {
  ["sunny" /* SUNNY */]: {
    name: "晴天",
    description: "阳光明媚，适合农作物生长",
    cropGrowthRate: 1.2,
    workIncomeRate: 1.1
  },
  ["cloudy" /* CLOUDY */]: {
    name: "多云",
    description: "天气阴沉，略微影响心情",
    cropGrowthRate: 1,
    workIncomeRate: 1
  },
  ["rainy" /* RAINY */]: {
    name: "雨天",
    description: "下雨天，农作物生长加快",
    cropGrowthRate: 1.3,
    workIncomeRate: 0.8
  },
  ["stormy" /* STORMY */]: {
    name: "暴风雨",
    description: "狂风暴雨，可能损坏农作物",
    cropGrowthRate: 0.5,
    workIncomeRate: 0.6
  },
  ["snowy" /* SNOWY */]: {
    name: "下雪",
    description: "白雪皑皑，农作物生长缓慢",
    cropGrowthRate: 0.6,
    workIncomeRate: 0.7
  },
  ["windy" /* WINDY */]: {
    name: "大风",
    description: "风力强劲，农作物生长受影响",
    cropGrowthRate: 0.8,
    workIncomeRate: 0.9
  }
};
var seasonEffects = {
  ["spring" /* SPRING */]: {
    name: "春季",
    description: "万物复苏的季节",
    weatherProbability: {
      ["sunny" /* SUNNY */]: 0.4,
      ["cloudy" /* CLOUDY */]: 0.2,
      ["rainy" /* RAINY */]: 0.3,
      ["stormy" /* STORMY */]: 0.05,
      ["snowy" /* SNOWY */]: 0,
      ["windy" /* WINDY */]: 0.05
    },
    cropGrowthRate: 1.2,
    temperatureRange: [10, 25]
  },
  ["summer" /* SUMMER */]: {
    name: "夏季",
    description: "炎热的季节",
    weatherProbability: {
      ["sunny" /* SUNNY */]: 0.5,
      ["cloudy" /* CLOUDY */]: 0.1,
      ["rainy" /* RAINY */]: 0.2,
      ["stormy" /* STORMY */]: 0.15,
      ["snowy" /* SNOWY */]: 0,
      ["windy" /* WINDY */]: 0.05
    },
    cropGrowthRate: 1.5,
    temperatureRange: [20, 35]
  },
  ["autumn" /* AUTUMN */]: {
    name: "秋季",
    description: "收获的季节",
    weatherProbability: {
      ["sunny" /* SUNNY */]: 0.3,
      ["cloudy" /* CLOUDY */]: 0.3,
      ["rainy" /* RAINY */]: 0.2,
      ["stormy" /* STORMY */]: 0.1,
      ["snowy" /* SNOWY */]: 0,
      ["windy" /* WINDY */]: 0.1
    },
    cropGrowthRate: 1,
    temperatureRange: [15, 25]
  },
  ["winter" /* WINTER */]: {
    name: "冬季",
    description: "寒冷的季节",
    weatherProbability: {
      ["sunny" /* SUNNY */]: 0.2,
      ["cloudy" /* CLOUDY */]: 0.3,
      ["rainy" /* RAINY */]: 0.1,
      ["stormy" /* STORMY */]: 0.05,
      ["snowy" /* SNOWY */]: 0.3,
      ["windy" /* WINDY */]: 0.05
    },
    cropGrowthRate: 0.6,
    temperatureRange: [-5, 10]
  }
};
var WeatherConfig = import_koishi.Schema.object({
  季节持续天数: import_koishi.Schema.number().default(7),
  天气更新间隔: import_koishi.Schema.number().default(4 * 60 * 60 * 1e3),
  // 4小时
  开始时间: import_koishi.Schema.number().default(Date.now())
});

// src/config/player_market.ts
var Config = import_koishi2.Schema.object({
  // 基础配置
  初始余额: import_koishi2.Schema.number().default(1e3),
  初始身价: import_koishi2.Schema.number().default(200),
  初始存款上限: import_koishi2.Schema.number().default(1e3),
  初始信用等级: import_koishi2.Schema.number().default(1),
  自动注册: import_koishi2.Schema.boolean().default(true).description("群内发言自动建立玩家档案"),
  // 赎身配置
  赎身倍率: import_koishi2.Schema.number().default(2),
  中介费: import_koishi2.Schema.number().default(0.1),
  赎身提升: import_koishi2.Schema.number().default(1.1),
  // 打工配置
  打工基础收入: import_koishi2.Schema.number().default(0.1),
  牛马主加成: import_koishi2.Schema.number().default(0.1),
  // 冷却时间(毫秒)
  购买冷却: import_koishi2.Schema.number().default(5 * 60 * 1e3),
  打工冷却: import_koishi2.Schema.number().default(2 * 60 * 1e3),
  抢劫冷却: import_koishi2.Schema.number().default(1 * 60 * 1e3),
  转账冷却: import_koishi2.Schema.number().default(2 * 60 * 1e3),
  种地冷却: import_koishi2.Schema.number().default(30 * 60 * 1e3),
  // 概率配置
  抢劫成功率: import_koishi2.Schema.number().default(0.3),
  抢劫策略: import_koishi2.Schema.array(import_koishi2.Schema.object({
    名称: import_koishi2.Schema.string().default("低风险"),
    描述: import_koishi2.Schema.string().default("胜率较高，收益较少"),
    成功率: import_koishi2.Schema.number().default(0.7),
    抢夺比例: import_koishi2.Schema.number().default(0.15),
    惩罚比例: import_koishi2.Schema.number().default(0.05)
  })).default([
    {
      名称: "低风险",
      描述: "胜率高但收益较少",
      成功率: 0.75,
      抢夺比例: 0.15,
      惩罚比例: 0.05
    },
    {
      名称: "高风险",
      描述: "收益爆炸但失败代价大",
      成功率: 0.35,
      抢夺比例: 0.45,
      惩罚比例: 0.25
    }
  ]).description("抢劫等级配置，决定不同难度的胜率与收益"),
  决斗成功率: import_koishi2.Schema.number().default(0.5),
  // 银行配置
  存款利率: import_koishi2.Schema.number().default(0.01),
  利息最大时间: import_koishi2.Schema.number().default(24),
  信用升级费用: import_koishi2.Schema.number().default(0.1),
  转账手续费: import_koishi2.Schema.number().default(0.05),
  // 决斗配置
  决斗提升: import_koishi2.Schema.number().default(0.2),
  决斗降低: import_koishi2.Schema.number().default(0.1),
  // 保镖配置
  保镖价格: import_koishi2.Schema.array(import_koishi2.Schema.number()).default([1e3, 2e3, 5e3, 1e4]),
  保镖保护时间: import_koishi2.Schema.number().default(24 * 60 * 60 * 1e3),
  保镖保护概率: import_koishi2.Schema.number().default(0.8),
  // 天气系统配置
  weather: WeatherConfig,
  messageRecall: import_koishi2.Schema.object({
    enabled: import_koishi2.Schema.boolean().default(false).description("是否开启奴隶市场指令的消息撤回"),
    delay: import_koishi2.Schema.number().default(60).description("撤回延迟时间（秒）")
  }).default({}).description("消息撤回设置"),
  // 牛马福利系统配置
  福利等级: import_koishi2.Schema.object({
    基础工资: import_koishi2.Schema.array(import_koishi2.Schema.number()).default([100, 200, 300, 400, 500]),
    培训费用: import_koishi2.Schema.array(import_koishi2.Schema.number()).default([1e3, 2e3, 3e3, 4e3, 5e3]),
    培训提升: import_koishi2.Schema.array(import_koishi2.Schema.number()).default([0.1, 0.2, 0.3, 0.4, 0.5]),
    福利间隔: import_koishi2.Schema.number().default(24 * 60 * 60 * 1e3),
    // 24小时
    培训间隔: import_koishi2.Schema.number().default(12 * 60 * 60 * 1e3),
    // 12小时
    虐待惩罚: import_koishi2.Schema.number().default(1e3),
    虐待间隔: import_koishi2.Schema.number().default(1 * 60 * 60 * 1e3)
    // 1小时
  }).description("牛马福利系统配置"),
  // 监狱系统配置
  监狱系统: import_koishi2.Schema.object({
    监狱打工收入: import_koishi2.Schema.number().default(30),
    // 30金币
    监狱打工间隔: import_koishi2.Schema.number().default(5 * 60 * 1e3),
    // 5分钟
    监狱打工次数上限: import_koishi2.Schema.number().default(3),
    // 3次
    工作收入倍率: import_koishi2.Schema.number().default(1)
    // 监狱工作收入倍率
  }),
  // 管理员列表配置
  管理员列表: import_koishi2.Schema.array(import_koishi2.Schema.string()).default([]).description("管理员用户ID列表"),
  // 牛马福利配置
  牛马福利: import_koishi2.Schema.object({
    基础福利比例: import_koishi2.Schema.number().default(0.1).description("基础福利占身价的比例"),
    等级加成: import_koishi2.Schema.number().default(0.2).description("每级福利的额外加成比例"),
    培训费用比例: import_koishi2.Schema.number().default(0.2).description("培训费用占身价的比例"),
    培训冷却: import_koishi2.Schema.number().default(60 * 60 * 1e3).description("培训冷却时间（毫秒）")
  }).description("牛马福利系统配置"),
  贷款系统: import_koishi2.Schema.object({
    基础额度: import_koishi2.Schema.number().default(1e3).description("基础贷款额度"),
    等级加成: import_koishi2.Schema.number().default(500).description("信用等级每级增加的贷款额度"),
    利率: import_koishi2.Schema.number().default(0.02).description("贷款利率（每小时）")
  }).description("贷款额度与利率设置"),
  调试日志: import_koishi2.Schema.boolean().default(false).description("是否输出额外调试日志，便于问题排查"),
  注册激励: import_koishi2.Schema.object({
    启用: import_koishi2.Schema.boolean().default(true),
    开始时间: import_koishi2.Schema.string().default("18:00"),
    结束时间: import_koishi2.Schema.string().default("22:00"),
    奖励金额: import_koishi2.Schema.number().default(1e3)
  }).default({
    启用: true,
    开始时间: "18:00",
    结束时间: "22:00",
    奖励金额: 1e3
  }).description("在指定时间段注册可额外获得金币奖励")
});
let runtimeConfig = null;
const ADMIN_VIP_END_TIME = new Date("2099-12-31T23:59:59Z").getTime();
const RED_PACKET_FEE_RATE = 0.05;
const RED_PACKET_EXPIRE = 10 * 60 * 1e3;
const RED_PACKET_MAX_SHARES = 50;
const HOUR_IN_MS = 60 * 60 * 1e3;
const { createMessageRecallHelpers } = require("./utils/messageRecall");
const { createBankModule } = require("./modules/bank");

let deposit,
  withdraw,
  claimInterest,
  bankInfo,
  upgradeCredit,
  applyLoan,
  repayLoan,
  transfer;

function getLoanConfig(config) {
  return config.贷款系统 ?? {
    基础额度: 1e3,
    等级加成: 500,
    利率: 0.02
  };
}
__name(getLoanConfig, "getLoanConfig");
function calculateLoanLimit(user, config) {
  const loanConfig = getLoanConfig(config);
  const level = Math.max(1, user.loanCreditLevel ?? 1);
  return Math.floor(loanConfig.基础额度 + (level - 1) * loanConfig.等级加成);
}
__name(calculateLoanLimit, "calculateLoanLimit");
async function accrueLoanInterest(ctx, config, user) {
  if (!user?.loanBalance || user.loanBalance <= 0)
    return user;
  const lastTime = user.lastLoanInterestTime || user.registerTime || Date.now();
  const now = Date.now();
  const elapsedHours = Math.floor((now - lastTime) / HOUR_IN_MS);
  if (elapsedHours <= 0)
    return user;
  const loanConfig = getLoanConfig(config);
  const rate = loanConfig.利率 ?? 0.02;
  const interest = Math.max(1, Math.floor(user.loanBalance * rate * elapsedHours));
  const nextTime = lastTime + elapsedHours * HOUR_IN_MS;
  await ctx.database.set("player_market_users", { userId: user.userId }, {
    loanBalance: user.loanBalance + interest,
    lastLoanInterestTime: nextTime
  });
  logDebug(ctx, "loan interest accrued", {
    userId: user.userId,
    interest,
    elapsedHours
  });
  return { ...user, loanBalance: user.loanBalance + interest, lastLoanInterestTime: nextTime };
}
__name(accrueLoanInterest, "accrueLoanInterest");
function formatCostTip(privileged, amount) {
  return privileged ? "管理员特权：未扣款" : `${amount}金币`;
}
__name(formatCostTip, "formatCostTip");

function logDebug(ctx, message, payload = {}) {
  if (!runtimeConfig?.调试日志)
    return;
  try {
    ctx.logger?.info?.(`[slave-market][debug] ${message}`, payload);
  } catch (error) {
    console.warn("[slave-market][debug] log failed", error);
  }
}
__name(logDebug, "logDebug");
const {
  setupMessageRecall,
  sendWithRecall,
  createRecallSender
} = createMessageRecallHelpers(logDebug);
function pickString(...values) {
  for (const value of values) {
    if (typeof value !== "string")
      continue;
    const trimmed = value.trim();
    if (trimmed)
      return trimmed;
  }
  return "";
}
__name(pickString, "pickString");
function resolveGroupCard(session) {
  return pickString(
    session.member?.card,
    session.event?.member?.card,
    session.author?.card,
    session.onebot?.sender?.card,
    session.onebot?.info?.card,
    session.member?.user?.card
  );
}
__name(resolveGroupCard, "resolveGroupCard");
function resolveNickname(session) {
  const card = resolveGroupCard(session);
  if (card)
    return card;
  const id = session?.userId ? String(session.userId) : Math.floor(Math.random() * 1e4).toString();
  return `玩家${id.slice(-4) || id}`;
}
__name(resolveNickname, "resolveNickname");
function registrationGuide() {
  return "❌ 数据尚未创建，系统正在自动登记，请稍后重试。";
}
__name(registrationGuide, "registrationGuide");
function registrationShortGuide() {
  return "系统正在为你建立档案，请稍后再试一次。";
}
__name(registrationShortGuide, "registrationShortGuide");
function getSessionScopedUserId(session) {
  if (!session?.userId)
    return null;
  return buildScopedId(getScopeKey(session), session.userId);
}
__name(getSessionScopedUserId, "getSessionScopedUserId");
function normalizeScopeKey(value) {
  if (!value)
    return "global";
  return String(value).replace(/#/g, ":");
}
__name(normalizeScopeKey, "normalizeScopeKey");
function getScopeKey(session) {
  if (!session)
    return "global";
  const base = session.guildId || session.channelId || (session.platform ? `${session.platform}:global` : "global");
  return normalizeScopeKey(base);
}
__name(getScopeKey, "getScopeKey");
function buildScopedId(scopeKey, rawUserId) {
  return `${scopeKey}#${rawUserId ?? ""}`;
}
__name(buildScopedId, "buildScopedId");
function getScopedUserId(session, rawUserId) {
  const scopeKey = getScopeKey(session);
  const actual = rawUserId ?? session?.userId ?? "";
  return buildScopedId(scopeKey, actual);
}
__name(getScopedUserId, "getScopedUserId");
function ensureScopedId(session, rawUserId) {
  if (rawUserId?.includes?.("#"))
    return rawUserId;
  if (!session)
    return rawUserId;
  return getScopedUserId(session, rawUserId);
}
__name(ensureScopedId, "ensureScopedId");
function createScopeFilter(session, extra = {}) {
  return {
    scopeId: getScopeKey(session),
    ...extra
  };
}
__name(createScopeFilter, "createScopeFilter");
function parseTimeToMinutes(value) {
  if (typeof value !== "string")
    return null;
  const match = value.trim().match(/^(\d{1,2})(?::(\d{1,2}))?$/);
  if (!match)
    return null;
  const hours = Math.min(23, Math.max(0, Number(match[1])));
  const minutes = Math.min(59, Math.max(0, Number(match[2] ?? 0)));
  return hours * 60 + minutes;
}
__name(parseTimeToMinutes, "parseTimeToMinutes");
function isWithinBonusPeriod(now, bonusConfig) {
  if (!bonusConfig?.启用)
    return false;
  const start = parseTimeToMinutes(bonusConfig.开始时间);
  const end = parseTimeToMinutes(bonusConfig.结束时间);
  if (start == null || end == null)
    return false;
  const date = new Date(now);
  const minutes = date.getHours() * 60 + date.getMinutes();
  if (start <= end)
    return minutes >= start && minutes <= end;
  return minutes >= start || minutes <= end;
}
__name(isWithinBonusPeriod, "isWithinBonusPeriod");
function calculateRegistrationBonus(now, config) {
  if (!config?.注册激励)
    return 0;
  return isWithinBonusPeriod(now, config.注册激励) ? config.注册激励.奖励金额 : 0;
}
__name(calculateRegistrationBonus, "calculateRegistrationBonus");
function extractMentionedUserId(session) {
  const elements = [];
  if (Array.isArray(session?.elements))
    elements.push(...session.elements);
  if (Array.isArray(session?.event?.elements))
    elements.push(...session.event.elements);
  for (const element of elements) {
    if (!element || element.type !== "at")
      continue;
    const attrs = element.attrs ?? element;
    const mentionId = attrs?.id ?? attrs?.qq ?? attrs?.userId ?? attrs?.target ?? attrs?.name;
    if (mentionId)
      return String(mentionId);
  }
  if (session?.quote?.userId)
    return String(session.quote.userId);
  if (session?.quote?.sender?.userId)
    return String(session.quote.sender.userId);
  return null;
}
__name(extractMentionedUserId, "extractMentionedUserId");
function normalizeIdentifier(value) {
  if (typeof value !== "string")
    return "";
  return value.replace(/^[\\s@＠]+/, "").trim();
}
__name(normalizeIdentifier, "normalizeIdentifier");
async function resolveTargetUser(ctx, session, identifier) {
  const scopeId = getScopeKey(session);
  const mentionId = extractMentionedUserId(session);
  if (mentionId) {
    const scopedMention = buildScopedId(scopeId, mentionId);
    const targetByMention = await ctx.database.get("player_market_users", { userId: scopedMention });
    if (targetByMention.length)
      return targetByMention[0];
  }
  const normalized = normalizeIdentifier(identifier);
  if (!normalized)
    return null;
  if (normalized.includes("#")) {
    const direct = await ctx.database.get("player_market_users", { userId: normalized });
    if (direct.length)
      return direct[0];
  }
  let users = await ctx.database.get("player_market_users", { scopeId, plainUserId: normalized });
  if (users.length)
    return users[0];
  users = await ctx.database.get("player_market_users", { scopeId, nickname: normalized });
  if (users.length)
    return users[0];
  return null;
}
__name(resolveTargetUser, "resolveTargetUser");
async function incrementActivePlayers(ctx) {
  const stats = await ctx.database.get("game_statistics", {});
  if (!stats.length)
    return;
  await ctx.database.set("game_statistics", {}, {
    activePlayers: stats[0].activePlayers + 1
  });
}
__name(incrementActivePlayers, "incrementActivePlayers");
async function ensurePlayerProfile(ctx, config, session, options = {}) {
  if (!session?.userId)
    return { created: false, bonus: 0, user: null };
  const scopeId = getScopeKey(session);
  const scopedUserId = buildScopedId(scopeId, session.userId);
  const existing = await ctx.database.get("player_market_users", { userId: scopedUserId });
  const now = Date.now();
  const channelId = session.channelId ?? "";
  const guildId = session.guildId ?? channelId ?? "";
  const cardName = resolveGroupCard(session);
  if (existing.length) {
    const updates = {};
    if (channelId && existing[0].lastChannelId !== channelId) {
      updates.lastChannelId = channelId;
    }
    if (guildId && existing[0].lastGuildId !== guildId) {
      updates.lastGuildId = guildId;
    }
    if (!existing[0].registerChannelId && channelId) {
      updates.registerChannelId = channelId;
    }
    if (!existing[0].registerGuildId && guildId) {
      updates.registerGuildId = guildId;
    }
    if (!existing[0].registerTime) {
      updates.registerTime = now;
    }
    if (existing[0].loanCreditLevel == null) {
      updates.loanCreditLevel = 1;
    }
    if (existing[0].loanBalance == null) {
      updates.loanBalance = 0;
    }
    if (!existing[0].lastLoanInterestTime) {
      updates.lastLoanInterestTime = now;
    }
    updates.lastActiveTime = now;
    if (cardName && cardName !== existing[0].nickname) {
      updates.nickname = cardName;
      updates.autoRegistered = true;
    }
    if (Object.keys(updates).length) {
      await ctx.database.set("player_market_users", { userId: existing[0].userId }, updates);
      return { created: false, bonus: 0, user: { ...existing[0], ...updates } };
    }
    return { created: false, bonus: 0, user: existing[0] };
  }
  const nickname = cardName || resolveNickname(session);
  const bonus = options.skipBonus ? 0 : calculateRegistrationBonus(now, config);
  const balance = config.初始余额 + bonus;
  const userData = {
    userId: scopedUserId,
    plainUserId: session.userId,
    scopeId,
    nickname,
    balance,
    deposit: 0,
    creditLevel: config.初始信用等级,
    depositLimit: config.初始存款上限,
    interest: 0,
    lastInterestTime: now,
    price: config.初始身价,
    employer: "",
    lastWorkTime: 0,
    lastRobTime: 0,
    lastHireTime: 0,
    lastTransferTime: 0,
    lastFarmTime: 0,
    currentCrop: null,
    cropStartTime: 0,
    employeeCount: 0,
    inventory: {},
    bodyguardEndTime: 0,
    bodyguardLevel: 0,
    equipped: {
      衣服: null,
      配饰: null,
      发型: null,
      妆容: null
    },
    ownedAppearances: [],
    vipEndTime: isAdmin(ctx, config, scopedUserId, session) ? ADMIN_VIP_END_TIME : 0,
    loanCreditLevel: 1,
    loanBalance: 0,
    lastLoanInterestTime: now,
    autoTasks: {
      work: false,
      harvest: false,
      deposit: false
    },
    lastAutoDepositTime: 0,
    priceMultiplier: 1,
    priceMultiplierEndTime: 0,
    welfareLevel: 1,
    lastWelfareTime: 0,
    welfareIncome: 0,
    trainingLevel: 1,
    lastTrainingTime: 0,
    trainingCost: 0,
    abuseCount: 0,
    lastAbuseTime: 0,
    isInJail: false,
    jailStartTime: 0,
    jailReason: "",
    jailWorkIncome: 0,
    jailWorkCount: 0,
    isInPrison: false,
    prisonEndTime: 0,
    lastAppearanceSwitchTime: 0,
    registerTime: now,
    registerChannelId: channelId,
    registerGuildId: guildId,
    lastChannelId: channelId,
    lastGuildId: guildId,
    lastActiveTime: now,
    autoRegistered: !options.manual,
    registrationBonus: bonus
  };
  await ctx.database.create("player_market_users", userData);
  await incrementActivePlayers(ctx);
  return { created: true, bonus, user: userData };
}
__name(ensurePlayerProfile, "ensurePlayerProfile");
async function fetchScopedUser(ctx, scopedId) {
  return await ctx.database.get("player_market_users", { userId: scopedId });
}
__name(fetchScopedUser, "fetchScopedUser");
async function ensureAdminVipPrivileges(ctx, session, user) {
  if (!user || !session || !runtimeConfig)
    return user;
  const privileged = isAdmin(ctx, runtimeConfig, user.userId, session);
  logDebug(ctx, "ensureAdminVipPrivileges check", {
    userId: user.userId,
    scopedId: ensureScopedId(session, user.userId),
    privileged,
    currentVipEnd: user.vipEndTime
  });
  if (!privileged)
    return user;
  if (user.vipEndTime && user.vipEndTime >= ADMIN_VIP_END_TIME)
    return user;
  try {
    await ctx.database.set("player_market_users", { userId: user.userId }, {
      vipEndTime: ADMIN_VIP_END_TIME
    });
    user.vipEndTime = ADMIN_VIP_END_TIME;
    logDebug(ctx, "ensureAdminVipPrivileges granted", {
      userId: user.userId,
      vipEndTime: user.vipEndTime
    });
  } catch (error) {
    ctx.logger?.warn?.(`[slave-market] grant admin vip failed: ${error.message}`);
  }
  return user;
}
__name(ensureAdminVipPrivileges, "ensureAdminVipPrivileges");

// src/commands/work.ts
async function work(ctx, config, session) {
  const user = await getUser(ctx, session.userId, session);
  if (!user) {
    return registrationGuide();
  }
  const now = Date.now();
  if (now - user.lastWorkTime < config.打工冷却) {
    const remainingTime = Math.ceil((config.打工冷却 - (now - user.lastWorkTime)) / 1e3 / 60);
    return `打工CD中，还需要等待${remainingTime}分钟`;
  }
  const baseIncome = Math.floor(user.price * config.打工基础收入);
  const weatherRate = ctx.weatherService.getWorkIncomeRate();
  const income = Math.floor(baseIncome * weatherRate);
  const employerShare = user.employer ? Math.floor(income * config.牛马主加成) : 0;
  await ctx.database.set("player_market_users", { userId: user.userId }, {
    balance: user.balance + income,
    lastWorkTime: Date.now()
  });
  if (user.employer) {
    const employer = await getUser(ctx, user.employer, session);
    if (employer) {
      await ctx.database.set("player_market_users", { userId: user.employer }, {
        balance: employer.balance + employerShare
      });
    }
  }
  const weatherStatus = ctx.weatherService.getWeatherStatus();
  return `✅ 打工成功！
💰 基础收入：${baseIncome}金币
🌤️ 天气加成：${weatherStatus.weatherEffect.name}（${(weatherRate * 100).toFixed(0)}%）
💰 最终收入：${income}金币${user.employer ? `
👑 牛马主分成：${employerShare}金币` : ""}`;
}
__name(work, "work");
async function getUser(ctx, userId, session) {
  const scopedId = ensureScopedId(session, userId);
  let users = await ctx.database.get("player_market_users", { userId: scopedId });
  if (!users.length && session && runtimeConfig) {
    const sessionScoped = getSessionScopedUserId(session);
    if (sessionScoped && sessionScoped === scopedId) {
      const result = await ensurePlayerProfile(ctx, runtimeConfig, session, {});
      if (result.user) {
        users = [result.user];
        if (!session.__slaveMarketAutoRegisterSent) {
          session.__slaveMarketAutoRegisterSent = true;
          const bonusTip = result.bonus > 0 ? `\n🎁 限时注册奖励：+${result.bonus}金币` : "";
          const registerMessage = `✅ 自动注册用户成功！
💰 初始身价：${runtimeConfig.初始身价}${bonusTip}
💡 接下来你可以：
• 输入"打工"开始赚钱
• 输入"我的信息"查看个人信息
• 输入"玩家帮助"查看所有指令`;
          try {
            if (session.send) {
              await sendWithRecall(session, ctx, runtimeConfig, "general", registerMessage);
            }
          } catch (error) {
            ctx.logger?.warn(`[slave-market] failed to send auto register message: ${error.message}`);
          }
        }
      }
    }
  }
  if (!users.length) {
    return null;
  }
  return await ensureAdminVipPrivileges(ctx, session, users[0]);
}
__name(getUser, "getUser");

// src/commands/rob.ts
function resolveRobStrategy(config, name) {
  const strategies = Array.isArray(config?.抢劫策略) && config.抢劫策略.length ? config.抢劫策略 : [
    {
      名称: "标准",
      描述: "默认策略",
      成功率: config.抢劫成功率 ?? 0.3,
      抢夺比例: 0.3,
      惩罚比例: 0.2
    }
  ];
  if (name) {
    const found = strategies.find((item) => item.名称 === name);
    if (found)
      return found;
  }
  return strategies[0];
}
__name(resolveRobStrategy, "resolveRobStrategy");
async function rob(ctx, config, session, target, strategyName) {
  try {
    const robber = await getUser2(ctx, session.userId, session);
    if (!robber)
      return registrationGuide();
    const victimUsers = await ctx.database.get("player_market_users", { userId: target });
    if (!victimUsers.length) {
      return `❌ 目标玩家未注册！`;
    }
    const victim = victimUsers[0];
    const now = Date.now();
    const privileged = isAdmin(ctx, config, robber.userId, session);
    if (!privileged && now - robber.lastRobTime < config.抢劫冷却) {
      const remainingTime = Math.ceil((config.抢劫冷却 - (now - robber.lastRobTime)) / 1e3 / 60);
      return `抢劫CD中，还需要等待${remainingTime}分钟`;
    }
    const strategy = resolveRobStrategy(config, strategyName);
    const success = privileged || Math.random() < (strategy?.成功率 ?? config.抢劫成功率);
    if (success) {
      let amount = Math.floor(victim.balance * (strategy?.抢夺比例 ?? 0.3));
      if (amount <= 0) {
        amount = Math.min(victim.balance, config.初始余额);
      }
      amount = Math.max(1, amount);
      await ctx.database.set("player_market_users", { userId: victim.userId }, {
        balance: victim.balance - amount
      });
      await ctx.database.set("player_market_users", { userId: robber.userId }, {
        balance: robber.balance + amount,
        lastRobTime: now
      });
      const stats = await ctx.database.get("game_statistics", {});
      if (stats.length) {
        await ctx.database.set("game_statistics", {}, {
          totalRobAmount: stats[0].totalRobAmount + amount
        });
      }
      return `抢劫成功（${privileged ? "管理员特权" : strategy.名称}）！从${victim.nickname}那里抢到了${amount}`;
    } else {
      const penaltyRatio = strategy?.惩罚比例 ?? 0.2;
      const penalty = Math.max(1, Math.floor(robber.balance * penaltyRatio));
      await ctx.database.set("player_market_users", { userId: robber.userId }, {
        balance: robber.balance - penalty,
        lastRobTime: now
      });
      return `抢劫失败（${strategy.名称}）！损失了${penalty}`;
    }
  } catch (error) {
    return `❌ 抢劫失败：${error.message}`;
  }
}
__name(rob, "rob");

// src/commands/redeem.ts
async function redeem(ctx, config, session) {
  const slave = await getUser2(ctx, session.userId, session);
  if (!slave) return null;
  const now = Date.now();
  if (!slave.employer) {
    return "❌ 你不是牛马，无法赎身";
  }
  const master = await getUser2(ctx, slave.employer, session, true);
  if (!master) return null;
  const ransomAmount = slave.price;
  if (slave.balance < ransomAmount) {
    return `❌ 赎身失败：需要${ransomAmount}金币，但余额只有${slave.balance}金币`;
  }
  await ctx.database.set("player_market_users", { userId: slave.userId }, {
    balance: slave.balance - ransomAmount,
    employer: ""
  });
  await ctx.database.set("player_market_users", { userId: master.userId }, {
    balance: master.balance + ransomAmount,
    employeeCount: master.employeeCount - 1
  });
  return `✅ 赎身成功！
💰 支付赎金：${ransomAmount}金币
👑 牛马主：${master.nickname}`;
}
__name(redeem, "redeem");
async function release(ctx, config, session, target) {
  const master = await getUser2(ctx, session.userId, session);
  if (!master) return null;
  const slave = await getUser2(ctx, target, session, true);
  if (!slave) return null;
  const privileged = isAdmin(ctx, config, master.userId, session);
  if (!privileged && slave.employer !== master.userId) {
    return "❌ 你不是该牛马的牛马主，无法放生";
  }
  const originalOwner = slave.employer;
  await ctx.database.set("player_market_users", { userId: slave.userId }, {
    employer: ""
  });
  if (privileged && originalOwner && originalOwner !== master.userId) {
    const realMaster = await getUser2(ctx, originalOwner, session, true);
    if (realMaster) {
      await ctx.database.set("player_market_users", { userId: realMaster.userId }, {
        employeeCount: Math.max(0, realMaster.employeeCount - 1)
      });
    }
  } else {
    await ctx.database.set("player_market_users", { userId: master.userId }, {
      employeeCount: Math.max(0, master.employeeCount - 1)
    });
  }
  return `✅ 放生成功！已解除与${slave.nickname}的购买关系`;
}
__name(release, "release");
async function getUser2(ctx, userId, session, isTarget) {
  return await getUser(ctx, userId, session);
}
__name(getUser2, "getUser");

async function getUser3(ctx, userId, session) {
  const user = await getUser(ctx, userId, session);
  if (!user) {
    return registrationShortGuide();
  }
  return user;
}
__name(getUser3, "getUser");

// src/commands/bodyguard.ts
var bodyguardData = {
  bodyguards: [
    {
      id: "guard_1",
      name: "初级保镖",
      level: 1,
      price: 2e3,
      duration: 2 * 60 * 60 * 1e3,
      // 2小时
      description: "提供2小时基础保护，防止被抢劫",
      protectType: "rob"
    },
    {
      id: "guard_2",
      name: "中级保镖",
      level: 2,
      price: 5e3,
      duration: 4 * 60 * 60 * 1e3,
      // 4小时
      description: "提供4小时加强保护，防止被购买",
      protectType: "hire"
    },
    {
      id: "guard_3",
      name: "高级保镖",
      level: 3,
      price: 1e4,
      duration: 8 * 60 * 60 * 1e3,
      // 8小时
      description: "提供8小时高级保护，防止被抢劫和购买",
      protectType: "both"
    }
  ]
};
async function bodyguardMarket(ctx, config, session) {
  const user = await getUser4(ctx, session.userId, session);
  if (typeof user === "string") {
    return user;
  }
  let message = "🛡️ === 保镖市场 === 🛡️\n\n";
  bodyguardData.bodyguards.forEach((guard) => {
    const status = user.bodyguardLevel >= guard.level ? "✅ 已雇佣" : "🆕 可雇佣";
    message += `${guard.name} (${guard.price}金币)
`;
    message += `📝 ${guard.description}
`;
    message += `🔖 状态：${status}

`;
  });
  if (user.bodyguardEndTime > Date.now()) {
    const remainingTime = Math.ceil((user.bodyguardEndTime - Date.now()) / (60 * 60 * 1e3));
    message += `
💡 当前保镖保护剩余时间：${remainingTime}小时`;
  }
  message += '\n💡 使用"雇佣保镖 [保镖名称]"来雇佣保镖';
  return message;
}
__name(bodyguardMarket, "bodyguardMarket");
async function hireBodyguard(ctx, config, session, guardName) {
  const user = await getUser4(ctx, session.userId, session);
  if (typeof user === "string") {
    return user;
  }
  const guard = bodyguardData.bodyguards.find((g) => g.name === guardName);
  if (!guard) {
    return "❌ 找不到该保镖";
  }
  if (user.bodyguardLevel >= guard.level) {
    return "❌ 你已经雇佣了更高级的保镖";
  }
  const privileged = isAdmin(ctx, config, user.userId, session);
  if (!privileged && user.balance < guard.price) {
    return `❌ 余额不足，需要${guard.price}金币`;
  }
  await ctx.database.set("player_market_users", { userId: user.userId }, {
    balance: privileged ? user.balance : user.balance - guard.price,
    bodyguardLevel: guard.level,
    bodyguardEndTime: Date.now() + guard.duration
  });
  return `✅ 雇佣成功！获得${guard.name}保护${guard.duration / (60 * 60 * 1e3)}小时
💰 花费：${formatCostTip(privileged, guard.price)}`;
}
__name(hireBodyguard, "hireBodyguard");
async function bodyguardStatus(ctx, config, session) {
  const user = await getUser4(ctx, session.userId, session);
  if (typeof user === "string") {
    return user;
  }
  if (user.bodyguardEndTime <= Date.now()) {
    return "❌ 当前没有保镖保护";
  }
  const remainingTime = Math.ceil((user.bodyguardEndTime - Date.now()) / (60 * 60 * 1e3));
  const guard = bodyguardData.bodyguards.find((g) => g.level === user.bodyguardLevel);
  return `🛡️ === 保镖状态 === 🛡️
📝 保镖等级：${guard.name}
⏰ 剩余时间：${remainingTime}小时
🛡️ 保护类型：${guard.protectType === "rob" ? "防抢劫" : guard.protectType === "hire" ? "防购买" : "防抢劫和购买"}`;
}
__name(bodyguardStatus, "bodyguardStatus");
async function getUser4(ctx, userId, session) {
  return await getUser(ctx, userId, session);
}
__name(getUser4, "getUser");

// src/commands/farm.ts
var crops = [
  {
    emoji: "🌾",
    name: "小麦",
    price: 120,
    growthTime: 1,
    harvestPrice: 180,
    description: "基础作物,生长快,收益稳定"
  },
  {
    emoji: "🥕",
    name: "胡萝卜",
    price: 260,
    growthTime: 1.5,
    harvestPrice: 420,
    description: "营养丰富,收益不错"
  },
  {
    emoji: "🍠",
    name: "红薯",
    price: 320,
    growthTime: 2,
    harvestPrice: 520,
    description: "产量稳定,适合挂机"
  },
  {
    emoji: "🌽",
    name: "玉米",
    price: 380,
    growthTime: 2.5,
    harvestPrice: 650,
    description: "中等作物,生长较快,收益不错"
  },
  {
    emoji: "🍓",
    name: "草莓",
    price: 450,
    growthTime: 2.8,
    harvestPrice: 820,
    description: "颜值与收益兼备"
  },
  {
    emoji: "🍇",
    name: "葡萄",
    price: 520,
    growthTime: 3.2,
    harvestPrice: 950,
    description: "产量稳定,收益不错"
  },
  {
    emoji: "🍚",
    name: "水稻",
    price: 600,
    growthTime: 3.8,
    harvestPrice: 1100,
    description: "高级作物,生长较慢,收益高"
  },
  {
    emoji: "🍉",
    name: "西瓜",
    price: 900,
    growthTime: 4.5,
    harvestPrice: 1700,
    description: "夏季限定,一次性收益高"
  },
  {
    emoji: "🍄",
    name: "黑松露",
    price: 1500,
    growthTime: 6,
    harvestPrice: 2800,
    description: "稀有作物,生长极慢但收益极高"
  }
];
function formatCropLabel(crop) {
  return `${crop.emoji ?? "🌱"} ${crop.name}`.trim();
}
__name(formatCropLabel, "formatCropLabel");
async function farm(ctx, config, session, cropName) {
  const user = await getUser5(ctx, session.userId, session);
  if (typeof user === "string") {
    return user;
  }
  const weatherStatus = ctx.weatherService.getWeatherStatus();
  if (weatherStatus.weather === "stormy" /* STORMY */) {
    return "暴风雨天气不适合种植，请等待天气好转";
  }
  const now = Date.now();
  if (now - user.lastFarmTime < config.种地冷却) {
    const remainingTime = Math.ceil((config.种地冷却 - (now - user.lastFarmTime)) / 1e3 / 60);
    return `种地CD中,还需要等待${remainingTime}分钟`;
  }
  const crop = crops.find((c) => c.name === cropName);
  if (!crop) {
    return `找不到作物"${cropName}"
可用作物:
${crops.map((c) => `${formatCropLabel(c)} - ${c.price}金币 (${c.description})`).join("\n")}`;
  }
  const privileged = isAdmin(ctx, config, user.userId, session);
  if (!privileged && user.balance < crop.price) {
    return `余额不足,需要${crop.price}金币`;
  }
  await ctx.database.set("player_market_users", { userId: user.userId }, {
    balance: privileged ? user.balance : user.balance - crop.price,
    lastFarmTime: now,
    currentCrop: crop.name,
    cropStartTime: now
  });
  return `种植成功！
作物: ${formatCropLabel(crop)}
💰 花费：${formatCostTip(privileged, crop.price)}
当前天气: ${weatherStatus.weatherEffect.name}
当前季节: ${weatherStatus.seasonEffect.name}
温度: ${weatherStatus.temperature}°C
生长速度: ${(ctx.weatherService.getCropGrowthRate() * 100).toFixed(0)}%
生长时间: ${Math.ceil(crop.growthTime / ctx.weatherService.getCropGrowthRate())}小时
预计收获: ${crop.harvestPrice}金币
请等待作物生长完成后使用"收获"指令`;
}
__name(farm, "farm");
async function harvest(ctx, config, session) {
  const respond = async (message) => {
    if (session?.send) {
      await sendWithRecall(session, ctx, config, "harvest", message);
      return;
    }
    return message;
  };
  const user = await getUser5(ctx, session.userId, session);
  if (typeof user === "string") {
    return await respond(user);
  }
  if (!user.currentCrop) {
    return await respond("你还没有种植任何作物");
  }
  const crop = crops.find((c) => c.name === user.currentCrop);
  if (!crop)
    return await respond("作物数据错误");
  const now = Date.now();
  const growthTime = (now - user.cropStartTime) / (1e3 * 60 * 60);
  if (growthTime < crop.growthTime) {
    const remainingTime = Math.ceil((crop.growthTime - growthTime) * 60);
    return await respond(`作物还未成熟,还需要等待${remainingTime}分钟`);
  }
  const weatherStatus = ctx.weatherService.getWeatherStatus();
  const weatherRate = ctx.weatherService.getCropGrowthRate();
  const actualHarvestPrice = Math.floor(crop.harvestPrice * weatherRate);
  await ctx.database.set("player_market_users", { userId: user.userId }, {
    balance: user.balance + actualHarvestPrice,
    currentCrop: null,
    cropStartTime: 0
  });
  return await respond(`收获成功！
作物: ${formatCropLabel(crop)}
当前天气: ${weatherStatus.weatherEffect.name}
当前季节: ${weatherStatus.seasonEffect.name}
温度: ${weatherStatus.temperature}°C
生长速度: ${(weatherRate * 100).toFixed(0)}%
基础收获: ${crop.harvestPrice}金币
实际收获: ${actualHarvestPrice}金币
当前余额: ${user.balance + actualHarvestPrice}`);
}
__name(harvest, "harvest");
async function cropStatus(ctx, config, session) {
  const user = await getUser5(ctx, session.userId, session);
  if (typeof user === "string") {
    return user;
  }
  if (!user.currentCrop) {
    return "你还没有种植任何作物";
  }
  const crop = crops.find((c) => c.name === user.currentCrop);
  if (!crop)
    return "作物数据错误";
  const now = Date.now();
  const growthTime = (now - user.cropStartTime) / (1e3 * 60 * 60);
  const remainingTime = Math.ceil((crop.growthTime - growthTime) * 60);
  const weatherStatus = ctx.weatherService.getWeatherStatus();
  const weatherRate = ctx.weatherService.getCropGrowthRate();
  return `=== 作物状态 ===
作物: ${formatCropLabel(crop)}
当前天气: ${weatherStatus.weatherEffect.name}
当前季节: ${weatherStatus.seasonEffect.name}
温度: ${weatherStatus.temperature}°C
生长速度: ${(weatherRate * 100).toFixed(0)}%
基础生长时间: ${crop.growthTime}小时
实际生长时间: ${(crop.growthTime / weatherRate).toFixed(1)}小时
预计收获: ${crop.harvestPrice}金币
实际收获: ${Math.floor(crop.harvestPrice * weatherRate)}金币
剩余时间: ${remainingTime}分钟`;
}
__name(cropStatus, "cropStatus");
async function getUser5(ctx, userId, session) {
  return await getUser(ctx, userId, session);
}
__name(getUser5, "getUser");

// src/config/appearance.ts
var AppearanceType = /* @__PURE__ */ ((AppearanceType2) => {
  AppearanceType2["衣服"] = "clothes";
  AppearanceType2["配饰"] = "accessories";
  AppearanceType2["发型"] = "hairstyle";
  AppearanceType2["妆容"] = "makeup";
  return AppearanceType2;
})(AppearanceType || {});
var appearances = [
  // 衣服
  {
    id: "simple_dress",
    name: "简约连衣裙",
    type: "clothes" /* 衣服 */,
    quality: "normal" /* 普通 */,
    price: 500,
    priceBonus: 10,
    // 降低到10身价
    description: "简单大方的连衣裙，略微提升魅力"
  },
  {
    id: "luxury_suit",
    name: "奢华西装",
    type: "clothes" /* 衣服 */,
    quality: "epic" /* 史诗 */,
    price: 2e3,
    priceBonus: 40,
    // 降低到40身价
    description: "定制奢华西装，显著提升气质"
  },
  {
    id: "royal_gown",
    name: "皇家礼服",
    type: "clothes" /* 衣服 */,
    quality: "legendary" /* 传说 */,
    price: 4e3,
    priceBonus: 80,
    // 降低到80身价
    description: "华丽的皇家礼服，彰显尊贵身份"
  },
  {
    id: "casual_outfit",
    name: "休闲套装",
    type: "clothes" /* 衣服 */,
    quality: "normal" /* 普通 */,
    price: 400,
    priceBonus: 8,
    // 降低到8身价
    description: "舒适的休闲套装，适合日常穿着"
  },
  // 配饰
  {
    id: "pearl_necklace",
    name: "珍珠项链",
    type: "accessories" /* 配饰 */,
    quality: "rare" /* 稀有 */,
    price: 800,
    priceBonus: 15,
    // 降低到15身价
    description: "优雅的珍珠项链，提升高贵气质"
  },
  {
    id: "diamond_ring",
    name: "钻石戒指",
    type: "accessories" /* 配饰 */,
    quality: "epic" /* 史诗 */,
    price: 1600,
    priceBonus: 30,
    // 降低到30身价
    description: "闪耀的钻石戒指，彰显奢华"
  },
  {
    id: "golden_watch",
    name: "金表",
    type: "accessories" /* 配饰 */,
    quality: "rare" /* 稀有 */,
    price: 1200,
    priceBonus: 20,
    // 降低到20身价
    description: "精致的金表，展现品味"
  },
  {
    id: "crystal_earrings",
    name: "水晶耳环",
    type: "accessories" /* 配饰 */,
    quality: "normal" /* 普通 */,
    price: 600,
    priceBonus: 12,
    // 降低到12身价
    description: "晶莹剔透的水晶耳环，增添优雅"
  },
  // 发型
  {
    id: "fashion_hair",
    name: "时尚发型",
    type: "hairstyle" /* 发型 */,
    quality: "rare" /* 稀有 */,
    price: 700,
    priceBonus: 14,
    // 降低到14身价
    description: "潮流时尚的发型设计"
  },
  {
    id: "royal_hairstyle",
    name: "皇家发型",
    type: "hairstyle" /* 发型 */,
    quality: "legendary" /* 传说 */,
    price: 3e3,
    priceBonus: 60,
    // 降低到60身价
    description: "华丽的皇家发型，尽显高贵"
  },
  {
    id: "elegant_bun",
    name: "优雅盘发",
    type: "hairstyle" /* 发型 */,
    quality: "epic" /* 史诗 */,
    price: 1600,
    priceBonus: 30,
    // 降低到30身价
    description: "精致的盘发造型，展现优雅"
  },
  {
    id: "casual_hairstyle",
    name: "休闲发型",
    type: "hairstyle" /* 发型 */,
    quality: "normal" /* 普通 */,
    price: 500,
    priceBonus: 10,
    // 降低到10身价
    description: "清爽的休闲发型，自然大方"
  },
  // 妆容
  {
    id: "natural_makeup",
    name: "自然妆容",
    type: "makeup" /* 妆容 */,
    quality: "normal" /* 普通 */,
    price: 400,
    priceBonus: 8,
    // 降低到8身价
    description: "清新自然的妆容"
  },
  {
    id: "glamorous_makeup",
    name: "华丽妆容",
    type: "makeup" /* 妆容 */,
    quality: "epic" /* 史诗 */,
    price: 1400,
    priceBonus: 30,
    // 降低到30身价
    description: "精致的华丽妆容，光彩照人"
  },
  {
    id: "royal_makeup",
    name: "皇家妆容",
    type: "makeup" /* 妆容 */,
    quality: "legendary" /* 传说 */,
    price: 2800,
    priceBonus: 60,
    // 降低到60身价
    description: "高贵的皇家妆容，尽显尊贵"
  },
  {
    id: "party_makeup",
    name: "派对妆容",
    type: "makeup" /* 妆容 */,
    quality: "rare" /* 稀有 */,
    price: 800,
    priceBonus: 15,
    // 降低到15身价
    description: "闪耀的派对妆容，活力四射"
  }
];

// src/utils/user.ts
async function getUser6(ctx, userId, session) {
  const user = await getUser(ctx, userId, session);
  if (!user)
    return registrationGuide();
  return user;
}
__name(getUser6, "getUser");

// src/commands/appearance.ts
var APPEARANCE_SWITCH_COOLDOWN = 60 * 60 * 1e3;
async function appearanceShop(ctx, config, session) {
  const user = await getUser6(ctx, session.userId, session);
  if (typeof user === "string") return user;
  let message = "🎭 === 装扮商店 === 🎭\n\n";
  for (const type of Object.values(AppearanceType)) {
    const items = appearances.filter((item) => item.type === type);
    if (items.length) {
      message += `【${type}】
`;
      items.forEach((item) => {
        const owned = user.ownedAppearances.includes(item.id);
        message += `${item.name} (${item.price}金币)
`;
        message += `📝 ${item.description}
`;
        message += `✨ 品质：${getQualityName(item.quality)}
`;
        message += `💰 身价提升：${item.priceBonus}点
`;
        message += `🔖 状态：${owned ? "已拥有" : "可购买"}

`;
      });
    }
  }
  message += '💡 使用"购买装扮 [装扮名称]"来购买装扮\n';
  message += '💡 使用"装扮背包"查看已购买的装扮\n';
  message += '💡 使用"装备装扮 [装扮名称]"来装备装扮\n';
  message += '💡 使用"脱下装扮 [装扮名称]"来脱下装扮';
  return message;
}
__name(appearanceShop, "appearanceShop");
function getQualityName(quality) {
  const qualityMap = {
    ["normal" /* 普通 */]: "普通",
    ["rare" /* 稀有 */]: "稀有",
    ["epic" /* 史诗 */]: "史诗",
    ["legendary" /* 传说 */]: "传说"
  };
  return qualityMap[quality];
}
__name(getQualityName, "getQualityName");
async function buyAppearance(ctx, config, session, itemName) {
  const user = await getUser6(ctx, session.userId, session);
  if (typeof user === "string") return user;
  const item = appearances.find((i) => i.name === itemName);
  if (!item) return "❌ 找不到该装扮";
  if (user.ownedAppearances.includes(item.id)) {
    return "❌ 你已经拥有该装扮了";
  }
  const privileged = isAdmin(ctx, config, user.userId, session);
  if (!privileged && user.balance < item.price) {
    return `❌ 余额不足，需要${item.price}金币`;
  }
  await ctx.database.set("player_market_users", { userId: user.userId }, {
    balance: privileged ? user.balance : user.balance - item.price,
    ownedAppearances: [...user.ownedAppearances, item.id]
  });
  return `✅ 购买成功！
获得【${item.name}】
💰 花费：${formatCostTip(privileged, item.price)}`;
}
__name(buyAppearance, "buyAppearance");
async function equipAppearance(ctx, config, session, itemName) {
  const userData = await getUser6(ctx, session.userId, session);
  if (!userData || typeof userData === "string") return null;
  const user = userData;
  const now = Date.now();
  if (user.lastAppearanceSwitchTime && now - user.lastAppearanceSwitchTime < APPEARANCE_SWITCH_COOLDOWN) {
    const remainingTime = Math.ceil((APPEARANCE_SWITCH_COOLDOWN - (now - user.lastAppearanceSwitchTime)) / (60 * 1e3));
    return `❌ 装扮切换冷却中，还需等待${remainingTime}分钟`;
  }
  const item = appearances.find((i) => i.name === itemName);
  if (!item) {
    return "❌ 找不到该装扮";
  }
  if (!user.ownedAppearances.includes(item.id)) {
    return "❌ 你还没有购买该装扮";
  }
  const equipped = { ...user.equipped };
  equipped[item.type] = item.id;
  const priceBonus = calculatePriceBonus(equipped);
  const currentBonus = calculatePriceBonus(user.equipped);
  const basePrice = user.price - currentBonus;
  const newPrice = basePrice + priceBonus;
  await ctx.database.set("player_market_users", { userId: user.userId }, {
    equipped,
    price: newPrice,
    lastAppearanceSwitchTime: now
  });
  return `✅ 成功装备【${itemName}】
当前身价加成：${priceBonus}点
当前身价：${newPrice}`;
}
__name(equipAppearance, "equipAppearance");
async function checkAppearance(ctx, config, session) {
  const user = await getUser6(ctx, session.userId, session);
  if (typeof user === "string")
    return user;
  const equipped = user.equipped || {
    衣服: null,
    配饰: null,
    发型: null,
    妆容: null
  };
  const totalBonus = calculatePriceBonus(equipped);
  const getEquippedName = /* @__PURE__ */ __name((type) => {
    const itemId = equipped[type];
    if (!itemId) return "未装备";
    const item = appearances.find((i) => i.id === itemId);
    return item ? item.name : "未装备";
  }, "getEquippedName");
  return `=== ${user.nickname}的装扮状态 ===
衣服：${getEquippedName("衣服")}
配饰：${getEquippedName("配饰")}
发型：${getEquippedName("发型")}
妆容：${getEquippedName("妆容")}
当前身价加成：${totalBonus}点
当前身价：${user.price}`;
}
__name(checkAppearance, "checkAppearance");
function calculatePriceBonus(equipped) {
  let totalBonus = 0;
  for (const itemId of Object.values(equipped)) {
    if (itemId) {
      const item = appearances.find((i) => i.id === itemId);
      if (item) {
        totalBonus += item.priceBonus;
      }
    }
  }
  return totalBonus;
}
__name(calculatePriceBonus, "calculatePriceBonus");
async function checkAppearanceInventory(ctx, config, session) {
  const user = await getUser6(ctx, session.userId, session);
  if (typeof user === "string") return user;
  const equipped = user.equipped || {
    衣服: null,
    配饰: null,
    发型: null,
    妆容: null
  };
  let message = "🎒 === 装扮背包 === 🎒\n\n";
  for (const type of Object.values(AppearanceType)) {
    const items = appearances.filter(
      (item) => item.type === type && user.ownedAppearances.includes(item.id)
    );
    if (items.length) {
      message += `【${type}】
`;
      items.forEach((item) => {
        const isEquipped = equipped[item.type] === item.id;
        message += `${item.name}
`;
        message += `📝 ${item.description}
`;
        message += `✨ 品质：${getQualityName(item.quality)}
`;
        message += `💰 身价提升：${item.priceBonus}点
`;
        message += `🔖 状态：${isEquipped ? "已装备" : "未装备"}

`;
      });
    }
  }
  if (!user.ownedAppearances.length) {
    message = '🎒 装扮背包是空的\n💡 使用"装扮商店"查看可购买的装扮';
  }
  return message;
}
__name(checkAppearanceInventory, "checkAppearanceInventory");
async function unequipAppearance(ctx, config, session, itemName) {
  const userData = await getUser6(ctx, session.userId, session);
  if (!userData || typeof userData === "string") return null;
  const user = userData;
  const now = Date.now();
  if (user.lastAppearanceSwitchTime && now - user.lastAppearanceSwitchTime < APPEARANCE_SWITCH_COOLDOWN) {
    const remainingTime = Math.ceil((APPEARANCE_SWITCH_COOLDOWN - (now - user.lastAppearanceSwitchTime)) / (60 * 1e3));
    return `❌ 装扮切换冷却中，还需等待${remainingTime}分钟`;
  }
  const item = appearances.find((i) => i.name === itemName);
  if (!item) {
    return "❌ 找不到该装扮";
  }
  if (!user.ownedAppearances.includes(item.id)) {
    return "❌ 你还没有购买该装扮";
  }
  const equipped = { ...user.equipped };
  equipped[item.type] = null;
  const priceBonus = calculatePriceBonus(equipped);
  const currentBonus = calculatePriceBonus(user.equipped);
  const basePrice = user.price - currentBonus;
  const newPrice = basePrice + priceBonus;
  await ctx.database.set("player_market_users", { userId: user.userId }, {
    equipped,
    price: newPrice,
    lastAppearanceSwitchTime: now
  });
  return `✅ 成功脱下【${itemName}】
当前身价加成：${priceBonus}点
当前身价：${newPrice}`;
}
__name(unequipAppearance, "unequipAppearance");

// src/commands/vip.ts
var VIP_CARD_TYPE_MAP = {
  day: { key: "day", label: "日卡", hours: 24, tokens: ["day", "days", "日", "日卡", "daily"] },
  week: { key: "week", label: "周卡", hours: 24 * 7, tokens: ["week", "weeks", "周", "周卡", "weekly"] },
  month: { key: "month", label: "月卡", hours: 24 * 30, tokens: ["month", "months", "月", "月卡", "monthly"] },
  hour: { key: "hour", label: "小时卡", tokens: ["hour", "hours", "hourly", "h", "小时", "小时卡"] }
};
function normalizeVipCardType(input) {
  if (!input)
    return null;
  const normalized = String(input).trim().toLowerCase();
  if (!normalized)
    return null;
  for (const type of Object.values(VIP_CARD_TYPE_MAP)) {
    if (type.tokens.some((token) => token.toLowerCase() === normalized))
      return type;
  }
  return null;
}
__name(normalizeVipCardType, "normalizeVipCardType");
function formatVipDurationLabel(typeKey, hours) {
  if (typeKey === "hour")
    return `${hours}小时`;
  if (typeKey === "week")
    return `周卡（${hours}小时）`;
  if (typeKey === "month")
    return `月卡（${hours}小时）`;
  return `日卡（${hours}小时）`;
}
__name(formatVipDurationLabel, "formatVipDurationLabel");
function parseHourDurationSpec(value) {
  const text = String(value ?? "").replace(/小时|h/gi, "").trim();
  if (!text)
    return null;
  const parts = text.split(/[-~]/).map((part) => part.trim()).filter(Boolean);
  if (!parts.length)
    return null;
  const clamp = (val) => Math.min(23, Math.max(1, Math.floor(val)));
  const first = Number(parts[0]);
  if (!Number.isFinite(first))
    return null;
  if (parts.length === 1) {
    const normalized = clamp(first);
    return { min: normalized, max: normalized, isRange: false };
  }
  const second = Number(parts[1]);
  if (!Number.isFinite(second))
    return null;
  const minValue = clamp(Math.min(first, second));
  const maxValue = clamp(Math.max(first, second));
  return { min: minValue, max: maxValue, isRange: true };
}
__name(parseHourDurationSpec, "parseHourDurationSpec");
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
__name(randomInt, "randomInt");
function buildVipCardCode(typeKey) {
  const prefix = (typeKey?.[0] ?? "V").toUpperCase();
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `VIP${prefix}${Date.now().toString(36).toUpperCase()}${randomPart}`;
}
__name(buildVipCardCode, "buildVipCardCode");
function createVipDurationGenerator(typeInfo, durationArg) {
  if (!typeInfo)
    return null;
  if (typeInfo.key !== "hour") {
    const hours = typeInfo.hours;
    const label = formatVipDurationLabel(typeInfo.key, hours);
    return () => ({
      durationHours: hours,
      durationMs: hours * HOUR_IN_MS,
      durationLabel: label
    });
  }
  const spec = parseHourDurationSpec(durationArg);
  if (!spec)
    return null;
  return () => {
    const hours = spec.isRange ? randomInt(spec.min, spec.max) : spec.min;
    return {
      durationHours: hours,
      durationMs: hours * HOUR_IN_MS,
      durationLabel: `${hours}小时`
    };
  };
}
__name(createVipDurationGenerator, "createVipDurationGenerator");
function resolveCardDurationMs(card) {
  if (!card)
    return 0;
  if (card.durationHours)
    return card.durationHours * HOUR_IN_MS;
  const type = VIP_CARD_TYPE_MAP[card.type || ""];
  if (type?.hours)
    return type.hours * HOUR_IN_MS;
  return 30 * 24 * 60 * 60 * 1e3;
}
__name(resolveCardDurationMs, "resolveCardDurationMs");
function resolveCardLabel(card, durationHours) {
  if (card?.durationLabel)
    return card.durationLabel;
  if (card?.type && VIP_CARD_TYPE_MAP[card.type])
    return formatVipDurationLabel(card.type, durationHours || VIP_CARD_TYPE_MAP[card.type].hours);
  if (durationHours >= 24 && durationHours % 24 === 0) {
    const days = durationHours / 24;
    if (days >= 30)
      return `月卡（${durationHours}小时）`;
    if (days >= 7)
      return `周卡（${durationHours}小时）`;
    return `日卡（${durationHours}小时）`;
  }
  return `${durationHours}小时`;
}
__name(resolveCardLabel, "resolveCardLabel");
function inferVipTypeByHours(durationHours) {
  if (!durationHours)
    return "hour";
  if (durationHours % (24 * 30) === 0)
    return "month";
  if (durationHours % (24 * 7) === 0)
    return "week";
  if (durationHours % 24 === 0)
    return "day";
  return "hour";
}
__name(inferVipTypeByHours, "inferVipTypeByHours");
function generateRedPacketId() {
  return `HB${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
}
__name(generateRedPacketId, "generateRedPacketId");
function allocateRedPacketAmount(packet) {
  if (packet.remainingShares <= 1)
    return packet.remainingAmount;
  const average = packet.remainingAmount / packet.remainingShares;
  const minAvg = Math.max(1, Math.floor(average * 0.8));
  const maxAvg = Math.max(minAvg, Math.floor(average * 1.2));
  const maxRemain = packet.remainingAmount - (packet.remainingShares - 1);
  const picked = randomInt(minAvg, maxAvg);
  return Math.max(1, Math.min(maxRemain, picked));
}
__name(allocateRedPacketAmount, "allocateRedPacketAmount");
async function sendRedPacket(ctx, config, session, totalAmount, shareCount) {
  const sender = await getUser3(ctx, session.userId, session);
  if (typeof sender === "string") return sender;
  const amount = Math.floor(totalAmount);
  const shares = Math.floor(shareCount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return "❌ 红包金额必须为正整数";
  }
  if (!Number.isFinite(shares) || shares <= 0) {
    return "❌ 红包份数必须为正整数";
  }
  if (shares > RED_PACKET_MAX_SHARES) {
    return `❌ 单次最多可分${RED_PACKET_MAX_SHARES}份`;
  }
  if (amount < shares) {
    return "❌ 红包金额必须不小于份数";
  }
  const privileged = isAdmin(ctx, config, sender.userId, session);
  const fee = privileged ? 0 : Math.ceil(amount * RED_PACKET_FEE_RATE);
  const totalCost = amount + fee;
  if (!privileged && sender.balance < totalCost) {
    return `❌ 红包发送失败：需要${totalCost}金币（含手续费${fee}），当前余额${sender.balance}`;
  }
  if (!privileged) {
    await ctx.database.set("player_market_users", { userId: sender.userId }, {
      balance: sender.balance - totalCost
    });
    if (fee > 0) {
      const [system] = await ctx.database.get("slave_market_system", {});
      if (system) {
        await ctx.database.set("slave_market_system", {}, { balance: system.balance + fee });
      }
    }
  }
  const now = Date.now();
  const packet = {
    id: generateRedPacketId(),
    scopeId: getScopeKey(session),
    channelId: session.channelId ?? "",
    guildId: session.guildId ?? "",
    senderId: sender.userId,
    senderNickname: sender.nickname,
    totalAmount: amount,
    remainingAmount: amount,
    totalShares: shares,
    remainingShares: shares,
    fee,
    createdAt: now,
    expiresAt: now + RED_PACKET_EXPIRE,
    claims: [],
    isAdminPacket: privileged
  };
  await ctx.database.create("player_market_red_packets", packet);
  return `✅ 红包已发出！
🎁 红包ID：${packet.id}
💰 总金额：${amount}金币（${shares}份）
${privileged ? "👑 管理员特权：未扣除余额" : `💸 扣除手续费：${fee}金币`}
📣 大家发送"抢红包 ${packet.id}"即可领取`;
}
__name(sendRedPacket, "sendRedPacket");
async function grabRedPacket(ctx, config, session, packetId) {
  const user = await getUser3(ctx, session.userId, session);
  if (typeof user === "string") return user;
  if (!packetId) {
    return "❌ 请输入红包ID";
  }
  const packets = await ctx.database.get("player_market_red_packets", { id: packetId.trim() });
  if (!packets.length) {
    return "❌ 红包不存在或已被领取完";
  }
  const packet = packets[0];
  const scopeId = getScopeKey(session);
  if (packet.scopeId !== scopeId) {
    return "❌ 该红包不属于当前群聊";
  }
  const now = Date.now();
  if (packet.expiresAt && now > packet.expiresAt) {
    await ctx.database.set("player_market_red_packets", { id: packet.id }, {
      remainingAmount: 0,
      remainingShares: 0
    });
    return "❌ 红包已过期";
  }
  if (packet.remainingShares <= 0 || packet.remainingAmount <= 0) {
    return "❌ 红包已经被抢完啦";
  }
  const claims = Array.isArray(packet.claims) ? packet.claims : [];
  if (claims.some((claim) => claim.userId === user.userId)) {
    return "❌ 你已经抢过该红包";
  }
  const amount = allocateRedPacketAmount(packet);
  const updatedClaims = [...claims, {
    userId: user.userId,
    nickname: user.nickname,
    amount,
    time: now
  }];
  await ctx.database.set("player_market_users", { userId: user.userId }, {
    balance: user.balance + amount
  });
  await ctx.database.set("player_market_red_packets", { id: packet.id }, {
    remainingAmount: Math.max(0, packet.remainingAmount - amount),
    remainingShares: Math.max(0, packet.remainingShares - 1),
    claims: updatedClaims
  });
  return `🎉 抢到${amount}金币！
📦 红包剩余：${Math.max(0, packet.remainingShares - 1)}份，${Math.max(0, packet.remainingAmount - amount)}金币`;
}
__name(grabRedPacket, "grabRedPacket");
async function redeemVipCard(ctx, config, session, cardId) {
  const user = await getUser7(ctx, session.userId, session);
  if (typeof user === "string") return user;
  const [card] = await ctx.database.get("vip_cards", { id: cardId });
  if (!card) {
    return "❌ 无效的卡密";
  }
  if (card.isUsed) {
    return "❌ 该卡密已被使用";
  }
  const now = Date.now();
  const durationMs = resolveCardDurationMs(card);
  const durationHours = Math.max(1, Math.round(durationMs / HOUR_IN_MS));
  const durationLabel = resolveCardLabel(card, durationHours);
  const expireTime = now + durationMs;
  await ctx.database.set("player_market_users", { userId: user.userId }, {
    vipEndTime: Math.max(user.vipEndTime || 0, now) + durationMs,
    autoTasks: {
      work: true,
      harvest: true,
      deposit: true
    }
  });
  await ctx.database.set("vip_cards", { id: cardId }, {
    isUsed: true,
    usedBy: user.userId,
    usedTime: now,
    expireTime,
    type: card.type || inferVipTypeByHours(durationHours),
    durationHours: card.durationHours || durationHours,
    durationLabel
  });
  return `✅ ${durationLabel}兑换成功！
⏰ 到期时间：${new Date(expireTime).toLocaleString()}`;
}
__name(redeemVipCard, "redeemVipCard");
async function checkVipStatus(ctx, config, session) {
  const user = await getUser7(ctx, session.userId, session);
  if (typeof user === "string") return user;
  const now = Date.now();
  const adminVip = isAdmin(ctx, config, user.userId, session);
  const isVip = adminVip || user.vipEndTime > now;
  const remainingDays = isVip ? adminVip ? Infinity : Math.ceil((user.vipEndTime - now) / (24 * 60 * 60 * 1e3)) : 0;
  let message = `=== VIP状态 ===
`;
  message += isVip ? `✅ VIP状态：已激活
` : `❌ VIP状态：未激活
`;
  if (isVip) {
    if (adminVip) {
      message += `⏰ 到期时间：管理员永久特权
`;
      message += `📅 剩余天数：∞（无需续费）

`;
    } else {
      message += `⏰ 到期时间：${new Date(user.vipEndTime).toLocaleString()}
`;
      message += `📅 剩余天数：${remainingDays}天

`;
    }
    message += `=== 自动任务状态 ===
`;
    message += `💼 自动打工：${user.autoTasks.work ? "开启" : "关闭"}
`;
    message += `🌾 自动收菜：${user.autoTasks.harvest ? "开启" : "关闭"}
`;
    message += `💰 自动存款：${user.autoTasks.deposit ? "开启" : "关闭"}
`;
    message += `
💡 使用"自动任务 开启/关闭 [任务名称]"来控制自动任务`;
  }
  return message;
}
__name(checkVipStatus, "checkVipStatus");
async function toggleAutoTask(ctx, config, session, action, taskName) {
  const user = await getUser7(ctx, session.userId, session);
  if (typeof user === "string") return user;
  if (user.vipEndTime <= Date.now()) {
    return "❌ 你不是VIP用户，无法使用自动任务";
  }
  if (!["开启", "关闭"].includes(action)) {
    return "❌ 无效的操作，可用：开启、关闭";
  }
  const newStatus = action === "开启";
  if (!taskName || taskName === "all") {
    await ctx.database.set("player_market_users", { userId: user.userId }, {
      autoTasks: {
        work: newStatus,
        harvest: newStatus,
        deposit: newStatus
      }
    });
    if (newStatus) {
      await executeAutoTasks(ctx, config);
    }
    return `✅ ${action}所有自动任务成功！`;
  }
  if (!["work", "harvest", "deposit"].includes(taskName)) {
    return "❌ 无效的任务名称，可用：work(打工)、harvest(收菜)、deposit(存款)";
  }
  await ctx.database.set("player_market_users", { userId: user.userId }, {
    [`autoTasks.${taskName}`]: newStatus
  });
  if (newStatus) {
    await executeAutoTasks(ctx, config);
  }
  return `✅ ${action}${taskName === "work" ? "自动打工" : taskName === "harvest" ? "自动收菜" : "自动存款"}成功！`;
}
__name(toggleAutoTask, "toggleAutoTask");
async function executeAutoTasks(ctx, config) {
  const now = Date.now();
  const vipUsers = await ctx.database.get("player_market_users", {
    vipEndTime: { $gt: now }
  });
  for (const user of vipUsers) {
    if (!user.autoTasks.work && !user.autoTasks.harvest && !user.autoTasks.deposit) {
      continue;
    }
    console.log(`【自动任务】VIP ${user.nickname} 开始运行自动任务。`);
    if (user.autoTasks.work && now - user.lastWorkTime >= config.打工冷却) {
      await work(ctx, config, { userId: user.userId });
      console.log(`【自动任务】VIP ${user.nickname} 完成了自动打工。`);
    }
    if (user.autoTasks.deposit && now - (user.lastAutoDepositTime || 0) >= 5 * 60 * 1e3) {
      if (user.balance > 0) {
        await deposit(ctx, config, { userId: user.userId }, user.balance);
        await ctx.database.set("player_market_users", { userId: user.userId }, {
          lastAutoDepositTime: now
        });
        console.log(`【自动任务】VIP ${user.nickname} 完成了自动存款 全部金币。`);
      }
    }
    if (user.autoTasks.harvest && user.currentCrop) {
      await harvest(ctx, config, { userId: user.userId });
      console.log(`【自动任务】VIP ${user.nickname} 完成了自动收菜。`);
    }
  }
}
__name(executeAutoTasks, "executeAutoTasks");
async function getUser7(ctx, userId, session) {
  const user = await getUser(ctx, userId, session);
  if (!user)
    return registrationGuide();
  return user;
}
__name(getUser7, "getUser");

// src/services/weather_service.ts
var WeatherService = class {
  constructor(ctx, config) {
    this.ctx = ctx;
    this.config = config;
    this.currentWeather = "sunny" /* SUNNY */;
    this.currentSeason = "spring" /* SPRING */;
    this.lastUpdateTime = config.开始时间;
    this.temperature = 20;
    this.initWeatherSystem();
  }
  static {
    __name(this, "WeatherService");
  }
  currentWeather;
  currentSeason;
  lastUpdateTime;
  temperature;
  initWeatherSystem() {
    setInterval(() => {
      this.updateWeather();
    }, this.config.天气更新间隔);
    this.updateWeather();
  }
  updateWeather() {
    const now = Date.now();
    const daysSinceStart = Math.floor((now - this.config.开始时间) / (24 * 60 * 60 * 1e3));
    const seasonIndex = Math.floor(daysSinceStart / this.config.季节持续天数) % 4;
    this.currentSeason = Object.values(Season)[seasonIndex];
    const seasonEffect = seasonEffects[this.currentSeason];
    const weatherProb = seasonEffect.weatherProbability;
    const rand = Math.random();
    let accumProb = 0;
    for (const [weather, prob] of Object.entries(weatherProb)) {
      accumProb += prob;
      if (rand <= accumProb) {
        this.currentWeather = weather;
        break;
      }
    }
    const [minTemp, maxTemp] = seasonEffect.temperatureRange;
    this.temperature = minTemp + Math.random() * (maxTemp - minTemp);
    this.lastUpdateTime = now;
  }
  // 获取当前天气状态
  getWeatherStatus() {
    return {
      weather: this.currentWeather,
      season: this.currentSeason,
      temperature: Math.round(this.temperature),
      weatherEffect: weatherEffects[this.currentWeather],
      seasonEffect: seasonEffects[this.currentSeason]
    };
  }
  // 获取当前作物生长速度修正
  getCropGrowthRate() {
    const weatherRate = weatherEffects[this.currentWeather].cropGrowthRate;
    const seasonRate = seasonEffects[this.currentSeason].cropGrowthRate;
    return weatherRate * seasonRate;
  }
  // 获取当前打工收入修正
  getWorkIncomeRate() {
    return weatherEffects[this.currentWeather].workIncomeRate;
  }
};

// src/commands/jail.ts
var import_koishi3 = require("koishi");
async function jailWork(ctx, config, session) {
  const user = await getUser6(ctx, session.userId, session);
  if (typeof user === "string") return user;
  if (!user.isInJail) {
    return "❌ 你不在监狱中，无法使用此命令";
  }
  const baseIncome = import_koishi3.Random.int(10, 50);
  const income = Math.floor(baseIncome * config.监狱系统.工作收入倍率);
  await ctx.database.set("player_market_users", { userId: user.userId }, {
    jailWorkIncome: user.jailWorkIncome + income,
    jailWorkCount: user.jailWorkCount + 1
  });
  const updatedUser = await getUser6(ctx, session.userId, session);
  if (typeof updatedUser === "string") return updatedUser;
  if (updatedUser.jailWorkCount >= config.监狱系统.监狱打工次数上限) {
    await ctx.database.set("player_market_users", { userId: user.userId }, {
      isInJail: false,
      jailStartTime: 0,
      jailReason: "",
      jailWorkIncome: 0,
      jailWorkCount: 0
    });
    return `✅ 恭喜你！
💰 本次工作收入：${income}金币
💡 你已经完成所有工作，可以出狱了！`;
  }
  return `✅ 工作完成！
💰 本次工作收入：${income}金币
💡 剩余工作次数：${config.监狱系统.监狱打工次数上限 - updatedUser.jailWorkCount}次`;
}
__name(jailWork, "jailWork");
async function checkJailStatus(ctx, config, session) {
  const userData = await getUser6(ctx, session.userId, session);
  if (!userData || typeof userData === "string") return null;
  const user = userData;
  if (!user.isInJail) {
    return "✅ 你当前不在监狱中";
  }
  const jailTime = Math.floor((Date.now() - user.jailStartTime) / (1e3 * 60));
  return `=== 监狱状态 ===
⏰ 入狱时间：${new Date(user.jailStartTime).toLocaleString()}
⏳ 已服刑：${jailTime}分钟
💸 监狱打工收入：${user.jailWorkIncome}金币
💡 剩余工作次数：${config.监狱系统.监狱打工次数上限 - user.jailWorkCount}次
�� 使用"监狱打工"来赚取收入`;
}
__name(checkJailStatus, "checkJailStatus");

// src/services/backup_service.ts
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var BackupService = class {
  static {
    __name(this, "BackupService");
  }
  ctx;
  config;
  backupDir;
  backupInterval = 30 * 60 * 1e3;
  // 30分钟
  constructor(ctx, config) {
    this.ctx = ctx;
    this.config = config;
    this.backupDir = path.join(process.cwd(), "backups");
    this.ensureBackupDir();
  }
  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }
  async createBackup() {
    try {
      const users = await this.ctx.database.get("player_market_users", {});
      const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
      const backupFile = path.join(this.backupDir, `backup_${timestamp}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(users, null, 2));
      this.cleanOldBackups();
      this.ctx.logger.info(`[Backup] 成功创建备份: ${backupFile}`);
    } catch (error) {
      this.ctx.logger.error(`[Backup] 创建备份失败: ${error.message}`);
    }
  }
  cleanOldBackups() {
    try {
      const files = fs.readdirSync(this.backupDir).filter((file) => file.startsWith("backup_") && file.endsWith(".json")).map((file) => ({
        name: file,
        time: fs.statSync(path.join(this.backupDir, file)).mtime.getTime()
      })).sort((a, b) => b.time - a.time);
      if (files.length > 10) {
        files.slice(10).forEach((file) => {
          fs.unlinkSync(path.join(this.backupDir, file.name));
          this.ctx.logger.info(`[Backup] 删除旧备份: ${file.name}`);
        });
      }
    } catch (error) {
      this.ctx.logger.error(`[Backup] 清理旧备份失败: ${error.message}`);
    }
  }
  start() {
    this.createBackup();
    setInterval(() => {
      this.createBackup();
    }, this.backupInterval);
    this.ctx.logger.info("[Backup] 备份服务已启动");
  }
  async restoreFromBackup(backupFile) {
    try {
      const backupPath = path.join(this.backupDir, backupFile);
      if (!fs.existsSync(backupPath)) {
        this.ctx.logger.error(`[Backup] 备份文件不存在: ${backupFile}`);
        return false;
      }
      const backupData = JSON.parse(fs.readFileSync(backupPath, "utf8"));
      await this.ctx.database.remove("player_market_users", {});
      for (const user of backupData) {
        await this.ctx.database.create("player_market_users", user);
      }
      this.ctx.logger.info(`[Backup] 成功从备份恢复: ${backupFile}`);
      return true;
    } catch (error) {
      this.ctx.logger.error(`[Backup] 恢复备份失败: ${error.message}`);
      return false;
    }
  }
};

// src/index.ts
var import_path = __toESM(require("path"));
var fs2 = require("fs").promises;
var sponsorQrPath = import_path.default.join(__dirname, "..", "ai.png");
var sponsorQrCache = null;
var sponsorQrError = "";
var name = "player-market";
var Config2 = Config;
var inject = {
  required: ["database", "puppeteer"],
  optional: ["recall"],
  weather: WeatherService
};
async function apply(ctx, config) {
  runtimeConfig = config;
  ctx.backupService = new BackupService(ctx, config);
  ctx.backupService.start();
  ctx.model.extend("player_market_users", {
    userId: "string",
    plainUserId: "string",
    scopeId: "string",
    nickname: "string",
    balance: "unsigned",
    deposit: "unsigned",
    creditLevel: "unsigned",
    loanCreditLevel: "unsigned",
    depositLimit: "unsigned",
    interest: "unsigned",
    lastInterestTime: "unsigned",
    price: "unsigned",
    loanBalance: "integer",
    lastLoanInterestTime: "unsigned",
    employer: "string",
    lastWorkTime: "unsigned",
    lastRobTime: "unsigned",
    lastHireTime: "unsigned",
    lastTransferTime: "unsigned",
    lastFarmTime: "unsigned",
    currentCrop: "string",
    cropStartTime: "unsigned",
    employeeCount: "unsigned",
    inventory: { type: "json", initial: {} },
    bodyguardEndTime: "unsigned",
    bodyguardLevel: "unsigned",
    equipped: { type: "json", initial: { 衣服: null, 配饰: null, 发型: null, 妆容: null } },
    ownedAppearances: { type: "json", initial: [] },
    vipEndTime: "unsigned",
    autoTasks: { type: "json", initial: { work: false, harvest: false, deposit: false } },
    lastAutoDepositTime: "unsigned",
    priceMultiplier: "float",
    priceMultiplierEndTime: "unsigned",
    welfareLevel: "unsigned",
    lastWelfareTime: "unsigned",
    welfareIncome: "unsigned",
    trainingLevel: "unsigned",
    lastTrainingTime: "unsigned",
    trainingCost: "unsigned",
    abuseCount: "unsigned",
    lastAbuseTime: "unsigned",
    isInJail: "boolean",
    jailStartTime: "unsigned",
    jailReason: "string",
    jailWorkIncome: "unsigned",
    jailWorkCount: "unsigned",
    isInPrison: "boolean",
    prisonEndTime: "unsigned",
    lastAppearanceSwitchTime: "unsigned",
    registerTime: "unsigned",
    registerChannelId: "string",
    registerGuildId: "string",
    lastChannelId: "string",
    lastGuildId: "string",
    lastActiveTime: "unsigned",
    autoRegistered: "boolean",
    registrationBonus: "unsigned"
  }, {
    primary: "userId"
  });
  ctx.model.extend("game_statistics", {
    id: "unsigned",
    totalTransactions: "unsigned",
    totalWorkIncome: "unsigned",
    totalRobAmount: "unsigned",
    activePlayers: "unsigned",
    gameStartTime: "unsigned",
    gameStatus: "string",
    winner: "string",
    endTime: "unsigned"
  }, {
    autoInc: true
  });
  ctx.model.extend("slave_market_system", {
    id: "unsigned",
    balance: "unsigned",
    isFinancialCrisis: "boolean"
  }, {
    autoInc: true
  });
  ctx.model.extend("vip_cards", {
    id: "string",
    type: "string",
    durationHours: "unsigned",
    durationLabel: "string",
    isUsed: "boolean",
    usedBy: "string",
    usedTime: "unsigned",
    expireTime: "unsigned",
    createdBy: "string",
    createdAt: "unsigned"
  }, {
    primary: "id"
  });
  ctx.model.extend("player_market_red_packets", {
    id: "string",
    scopeId: "string",
    channelId: "string",
    guildId: "string",
    senderId: "string",
    senderNickname: "string",
    totalAmount: "unsigned",
    remainingAmount: "unsigned",
    totalShares: "unsigned",
    remainingShares: "unsigned",
    fee: "unsigned",
    createdAt: "unsigned",
    expiresAt: "unsigned",
    claims: { type: "json", initial: [] },
    isAdminPacket: "boolean"
  }, {
    primary: "id"
  });
  ctx.on("ready", async () => {
    const stats = await ctx.database.get("game_statistics", {});
    if (!stats.length) {
      await ctx.database.create("game_statistics", {
        totalTransactions: 0,
        totalWorkIncome: 0,
        totalRobAmount: 0,
        activePlayers: 0,
        gameStartTime: Date.now(),
        gameStatus: "running"
      });
    }
    const system = await ctx.database.get("slave_market_system", {});
    if (!system.length) {
      await ctx.database.create("slave_market_system", {
        balance: config.初始余额,
        isFinancialCrisis: false
      });
    }
  });
  ctx.weatherService = new WeatherService(ctx, config.weather);
  ctx.setInterval(async () => {
    await executeAutoTasks(ctx, config);
  }, config.打工冷却);
  ctx.on("ready", async () => {
    await executeAutoTasks(ctx, config);
  });
  async function html_help(ctx2) {
    try {
      const data = await fs2.readFile(import_path.default.join(__dirname, "help_page.html"), "utf-8");
      const page = await ctx2.puppeteer.page();
      await page.setContent(data, { waitUntil: "networkidle0" });
      await page.waitForSelector(".help-container", { visible: true });
      const container = await page.$(".help-container");
      if (!container) {
        console.log("未找到目标 <div>");
        return "未找到目标 <div>";
      }
      const screenshot = await container.screenshot();
      await page.close();
      return import_koishi4.h.image(screenshot, "image/png");
    } catch (error) {
      console.error("Puppeteer error:", error);
      return "Puppeteer error: " + error.message;
    }
  }
  __name(html_help, "html_help");
  const slaveCommand = ctx.command("大牛马时代", "大牛马时代游戏 🐂🐎");
  slaveCommand.subcommand("玩家帮助", "查看所有可用命令").action(async ({ session }) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    return await respond(await html_help(ctx));
  });
  slaveCommand.subcommand("我的信息", "查看个人信息").alias("个人信息").alias("玩家信息").action(async ({ session }) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    let user = await getUser6(ctx, session.userId, session);
    if (typeof user === "string") {
      return await respond(registrationGuide());
    }
    user = await accrueLoanInterest(ctx, config, user);
    let masterInfo = "自由人";
    if (user.employer) {
      const master = await getUser2(ctx, user.employer, session, true);
      if (master)
        masterInfo = master.nickname;
    }
    const slaves = await ctx.database.get("player_market_users", { employer: user.userId });
    const slaveList = slaves.map((s) => s.nickname).join("、") || "无";
    let bodyguardInfo = "无";
    if (user.bodyguardEndTime > Date.now()) {
      const guard = bodyguardData.bodyguards.find((g) => g.level === user.bodyguardLevel);
      if (guard) {
        const remainingTime = Math.ceil((user.bodyguardEndTime - Date.now()) / (60 * 1e3));
        bodyguardInfo = `${guard.name}（剩余${remainingTime}分钟）`;
      }
    }
    let prisonInfo = "";
    if (user.isInJail) {
      const remainingTime = Math.ceil((user.jailStartTime + config.监狱系统.监狱打工间隔 * config.监狱系统.监狱打工次数上限 - Date.now()) / (60 * 1e3));
      prisonInfo = `
🏛️ 监狱状态：服刑中（剩余${remainingTime}分钟）
📝 入狱原因：${user.jailReason}`;
    }
    const now = Date.now();
    const workCooldown = Math.ceil((config.打工冷却 - (now - user.lastWorkTime)) / (60 * 1e3));
    const robCooldown = Math.ceil((config.抢劫冷却 - (now - user.lastRobTime)) / (60 * 1e3));
    const hireCooldown = Math.ceil((config.购买冷却 - (now - user.lastHireTime)) / (60 * 1e3));
    const transferCooldown = Math.ceil((config.转账冷却 - (now - user.lastTransferTime)) / (60 * 1e3));
    let cropInfo = "未种植";
    if (user.currentCrop) {
      const crop = crops.find((c) => c.name === user.currentCrop);
      if (crop) {
        const growthHours = (now - user.cropStartTime) / (60 * 60 * 1e3);
        const isMature = growthHours >= crop.growthTime;
        const remainingMinutes = Math.max(0, Math.ceil((crop.growthTime - growthHours) * 60));
        cropInfo = `${formatCropLabel(crop)}（${isMature ? "已成熟" : `还需${remainingMinutes}分钟`}）`;
      }
    }
    const loanLimit = calculateLoanLimit(user, config);
    const availableLoan = Math.max(0, loanLimit - (user.loanBalance ?? 0));
    return await respond(`=== ${user.nickname} 的信息 ===
💰 当前余额：${user.balance}
💵 当前身价：${user.price}
🏦 银行存款：${user.deposit}/${user.depositLimit}
🏅 财富等级：${user.creditLevel}
💳 信用等级：${user.loanCreditLevel ?? 1}
💳 当前贷款：${user.loanBalance ?? 0}
💶 可贷款额度：${loanLimit}（剩余${availableLoan}）
👑 牛马主：${masterInfo} 🐂🐎
👥 牛马数量：${user.employeeCount} 🐂🐎
👥 牛马列表：${slaveList}
🔒 保镖状态：${bodyguardInfo}
💸 累计福利：${user.welfareIncome}
📚 培训等级：${user.trainingLevel}
💎 福利等级：${user.welfareLevel}

⏰ 冷却状态：
• 打工：${workCooldown > 0 ? `${workCooldown}分钟` : "可用"}
• 抢劫：${robCooldown > 0 ? `${robCooldown}分钟` : "可用"}
• 购买：${hireCooldown > 0 ? `${hireCooldown}分钟` : "可用"}
• 转账：${transferCooldown > 0 ? `${transferCooldown}分钟` : "可用"}

🌾 作物状态：${cropInfo}${prisonInfo}

💡 身价提升提示：
• 多打工、训练和完成任务
• 购买装扮或种植高级作物提升加成
• 提升财富等级可扩大存款收益`);
  });
  slaveCommand.subcommand("重置游戏", "重置整个游戏（仅管理员可用）").action(async ({ session }) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    if (!isAdmin(ctx, config, session.userId, session)) {
      return await respond("只有管理员可以重置游戏");
    }
    await resetGame(ctx, config);
    return await respond("游戏已重置");
  });
  slaveCommand.subcommand("vip兑换 <cardId:string>", "兑换VIP卡密").action(async ({ session }, cardId) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    return await respond(await redeemVipCard(ctx, config, session, cardId));
  });
  slaveCommand.subcommand("vip状态", "查看VIP状态").action(async ({ session }) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const user = await getUser8(ctx, session.userId, session);
    if (!user) return await respond("❌ 请先注册成为玩家");
    const isVip = user.vipEndTime > Date.now();
    if (!isVip) {
      const sponsorTip = `❌ 您还不是VIP用户
💝 成为VIP用户可享受以下特权：
- 自动打工
- 自动收获
- 自动存款
- 更多特权...

🎁 赞助后您将获得：
- 专属VIP特权
- 更多游戏功能
- 优先体验新内容
- 专属客服支持

📷 请扫描下方赞赏码完成赞助`;
      return await respond(await withSponsorQr(sponsorTip));
    }
    return await respond(await checkVipStatus(ctx, config, session));
  });
  slaveCommand.subcommand("自动任务 [action:string] [taskName:string]", "控制自动任务").action(async ({ session }, action, taskName) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const user = await getUser8(ctx, session.userId, session);
    if (!user) return await respond("❌ 请先注册成为玩家");
    const isVip = user.vipEndTime > Date.now();
    if (!isVip) {
      const sponsorTip = `❌ 您还不是VIP用户
💝 成为VIP用户可享受自动任务特权：
- 自动打工
- 自动收获
- 自动存款

📷 请扫描下方赞赏码完成赞助`;
      return await respond(await withSponsorQr(sponsorTip));
    }
    if (!action) {
      return await respond(await toggleAutoTask(ctx, config, session, "开启", "all"));
    }
    if (!taskName) {
      return await respond(await toggleAutoTask(ctx, config, session, action, "all"));
    }
    return await respond(await toggleAutoTask(ctx, config, session, action, taskName));
  });
  slaveCommand.subcommand("生成vip卡 <cardType:string> <count:number> [duration:string]", "生成指定类型的VIP卡密").action(async ({ session }, cardType, count, duration) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    if (!isAdmin(ctx, config, session.userId, session)) {
      return await respond("只有管理员可以生成VIP卡密");
    }
    const typeInfo = normalizeVipCardType(cardType);
    if (!typeInfo) {
      return await respond("❌ 无效的VIP卡类型，可用：日卡、周卡、月卡、小时卡");
    }
    const total = Number(count);
    if (!Number.isFinite(total) || total <= 0) {
      return await respond("❌ 请输入有效的数量");
    }
    if (total > 100) {
      return await respond("❌ 单次最多生成100张卡密");
    }
    if (typeInfo.key === "hour" && !duration) {
      return await respond("❌ 小时卡需要提供有效时长，例如\"2\"或\"1-3\"" );
    }
    const generator = createVipDurationGenerator(typeInfo, duration);
    if (!generator) {
      return await respond("❌ 无效的小时卡时长，支持1-23小时并可使用起止范围");
    }
    const createdBy = ensureScopedId(session, session.userId);
    const now = Date.now();
    const list = [];
    for (let i = 0; i < total; i++) {
      const payload = generator();
      const cardCode = buildVipCardCode(typeInfo.key);
      await ctx.database.create("vip_cards", {
        id: cardCode,
        type: typeInfo.key,
        durationHours: payload.durationHours,
        durationLabel: payload.durationLabel,
        isUsed: false,
        usedBy: "",
        usedTime: 0,
        expireTime: 0,
        createdBy,
        createdAt: now
      });
      list.push(`${i + 1}. ${cardCode}（${payload.durationLabel}）`);
    }
    return await respond(`✅ 已生成${list.length}张${typeInfo.label}
${list.join("\n")}`);
  });
  slaveCommand.subcommand("牛马市场", "查看所有可购买的玩家列表").action(async ({ session }) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const users = await ctx.database.get("player_market_users", createScopeFilter(session));
    return await respond(formatMarketList(users));
  });
  slaveCommand.subcommand("我的牛马", "查看自己拥有的所有牛马信息").action(async ({ session }) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const owner = await getUser2(ctx, session.userId, session);
    if (!owner) {
      return await respond(registrationGuide());
    }
    const employees = await ctx.database.get("player_market_users", {
      employer: owner.userId
    });
    return await respond(formatEmployeeList(employees));
  });
  slaveCommand.subcommand("购买玩家 [target:string]", "购买指定玩家").action(async ({ session }, targetInput) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
    if (taxCheck) return await respond(taxCheck);
    try {
      const employer = await getUser2(ctx, session.userId, session);
      if (!employer) {
        return await respond(registrationGuide());
      }
      const privileged = isAdmin(ctx, config, employer.userId, session);
      const targetUser = await resolveTargetUser(ctx, session, targetInput);
      if (!targetUser) {
        return await respond("❌ 找不到该玩家，请@对方或输入昵称");
      }
      if (targetUser.userId === employer.userId) {
        return await respond("❌ 你不能购买自己");
      }
      if (targetUser.employer && !privileged) {
        return await respond("该玩家已经是别人的牛马了");
      }
      if (!privileged && employer.balance < targetUser.price) {
        return await respond(`余额不足，需要${targetUser.price}金币`);
      }
      if (!privileged && targetUser.bodyguardEndTime > Date.now()) {
        const guard = bodyguardData.bodyguards.find((g) => g.level === targetUser.bodyguardLevel);
        if (guard && (guard.protectType === "hire" || guard.protectType === "both")) {
          return await respond("该玩家正在被保镖保护，无法购买");
        }
      }
      const previousOwner = privileged ? targetUser.employer : null;
      if (!privileged) {
        await ctx.database.set("player_market_users", { userId: employer.userId }, {
          balance: employer.balance - targetUser.price
        });
      }
      if (privileged && previousOwner && previousOwner !== employer.userId) {
        const prevMaster = await getUser2(ctx, previousOwner, session, true);
        if (prevMaster) {
          await ctx.database.set("player_market_users", { userId: prevMaster.userId }, {
            employeeCount: Math.max(0, prevMaster.employeeCount - 1)
          });
        }
      }
      await ctx.database.set("player_market_users", { userId: targetUser.userId }, {
        employer: employer.userId
      });
      await ctx.database.set("player_market_users", { userId: employer.userId }, {
        employeeCount: employer.employeeCount + 1
      });
      return await respond(`✅ 购买成功！
💰 花费：${privileged ? "管理员特权（未扣款）" : `${targetUser.price}金币`}
👥 新牛马：${targetUser.nickname}`);
    } catch (error) {
      return await respond("购买失败，请稍后重试");
    }
  });
  slaveCommand.subcommand("赎身", "赎回自由身").action(async ({ session }) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
    if (taxCheck) return await respond(taxCheck);
    return await respond(await redeem(ctx, config, session));
  });
  slaveCommand.subcommand("打工", "打工赚钱，牛马主可获得额外收入").action(async ({ session }) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
    if (taxCheck) return await respond(taxCheck);
    return await respond(await work(ctx, config, session));
  });
  slaveCommand.subcommand("抢劫 [target:string] [strategy:string]", "抢劫指定用户的余额（有失败风险）").action(async ({ session }, target, strategyArg) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
    if (taxCheck) return await respond(taxCheck);
    const strategies = Array.isArray(config.抢劫策略) ? config.抢劫策略 : [];
    const normalizedTarget = normalizeIdentifier(target);
    const normalizedStrategy = normalizeIdentifier(strategyArg);
    const isStrategyName = (value) => Boolean(value) && strategies.some((item) => item.名称 === value);
    let strategyName = "";
    let targetIdentifier = normalizedTarget;
    if (isStrategyName(normalizedTarget)) {
      strategyName = normalizedTarget;
      targetIdentifier = "";
    }
    if (isStrategyName(normalizedStrategy)) {
      strategyName = normalizedStrategy;
    } else if (!targetIdentifier && normalizedStrategy) {
      targetIdentifier = normalizedStrategy;
    }
    const targetUser = await resolveTargetUser(ctx, session, targetIdentifier);
    if (!targetUser) {
      return await respond("❌ 找不到该玩家，请@对方或输入昵称");
    }
    if (targetUser.userId === session.userId) {
      return await respond("❌ 不能抢劫自己");
    }
    const targetId = targetUser.userId;
    return await respond(await rob(ctx, config, session, targetId, strategyName));
  });
  slaveCommand.subcommand("放生 [target:string]", "无条件解除与指定牛马的购买关系").action(async ({ session }, target) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
    if (taxCheck) return await respond(taxCheck);
    const targetUser = await resolveTargetUser(ctx, session, target);
    if (!targetUser) {
      return await respond("❌ 找不到该玩家，请@对方或输入昵称");
    }
    const targetId = targetUser.userId;
    return await respond(await release(ctx, config, session, targetId));
  });
  slaveCommand.subcommand("存款 <amount:number>", "将余额存入银行获取利息").action(async ({ session }, amount) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
    if (taxCheck) return await respond(taxCheck);
    if (!amount || amount <= 0) {
      return await respond("❌ 请输入正确的存款金额");
    }
    return await respond(await deposit(ctx, config, session, amount));
  });
  slaveCommand.subcommand("取款 <amount:number>", "从银行取出存款").action(async ({ session }, amount) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
    if (taxCheck) return await respond(taxCheck);
    if (!amount || amount <= 0) {
      return await respond("❌ 请输入正确的取款金额");
    }
    return await respond(await withdraw(ctx, config, session, amount));
  });
  slaveCommand.subcommand("领取利息", "领取银行存款产生的利息").action(async ({ session }) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
    if (taxCheck) return await respond(taxCheck);
    return await respond(await claimInterest(ctx, config, session));
  });
  slaveCommand.subcommand("银行信息", "查看银行账户详细信息").action(async ({ session }) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
    if (taxCheck) return await respond(taxCheck);
    return await respond(await bankInfo(ctx, config, session));
  });
  slaveCommand.subcommand("提升财富等级", "提升财富等级以增加存款上限").action(async ({ session }) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
    if (taxCheck) return await respond(taxCheck);
    return await respond(await upgradeCredit(ctx, config, session));
  });
  slaveCommand.subcommand("贷款 <amount:number>", "申请贷款，额度与信用等级挂钩").action(async ({ session }, amount) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
    if (taxCheck) return await respond(taxCheck);
    return await respond(await applyLoan(ctx, config, session, amount));
  });
  slaveCommand.subcommand("还款 <amount:number>", "偿还贷款并降低负债").action(async ({ session }, amount) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
    if (taxCheck) return await respond(taxCheck);
    return await respond(await repayLoan(ctx, config, session, amount));
  });
  slaveCommand.subcommand("转账 <target:string> <amount:number>", "向指定用户转账").action(async ({ session }, target, amount) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
    if (taxCheck) return await respond(taxCheck);
    if (!amount || amount <= 0) {
      return await respond("❌ 请输入正确的转账金额");
    }
    const targetUser = await resolveTargetUser(ctx, session, target);
    if (!targetUser) {
      return await respond("❌ 找不到该玩家，请@对方或输入昵称");
    }
    if (targetUser.userId === session.userId) {
      return await respond("❌ 不能给自己转账");
    }
    const targetId = targetUser.userId;
    return await respond(await transfer(ctx, config, session, targetId, amount));
  });
  slaveCommand.subcommand("发红包 <amount:number> <count:number>", "发放群红包，5%手续费").action(async ({ session }, amount, count) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
    if (taxCheck) return await respond(taxCheck);
    return await respond(await sendRedPacket(ctx, config, session, amount, count));
  });
  slaveCommand.subcommand("抢红包 <packetId:string>", "抢指定红包").action(async ({ session }, packetId) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
    if (taxCheck) return await respond(taxCheck);
    return await respond(await grabRedPacket(ctx, config, session, packetId));
  });
  slaveCommand.subcommand("保镖市场", "查看可雇佣的保镖列表").action(async ({ session }) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
    if (taxCheck) return await respond(taxCheck);
    return await respond(await bodyguardMarket(ctx, config, session));
  });
  slaveCommand.subcommand("雇佣保镖 <guardName:string>", "雇佣指定保镖保护自己").action(async ({ session }, guardName) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
    if (taxCheck) return await respond(taxCheck);
    return await respond(await hireBodyguard(ctx, config, session, guardName));
  });
  slaveCommand.subcommand("保镖状态", "查看当前保镖保护状态").action(async ({ session }) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
    if (taxCheck) return await respond(taxCheck);
    return await respond(await bodyguardStatus(ctx, config, session));
  });
  slaveCommand.subcommand("种地 <cropName:string>", "种植指定作物").alias("种植").action(async ({ session }, cropName) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
    if (taxCheck) return await respond(taxCheck);
    return await respond(await farm(ctx, config, session, cropName));
  });
  slaveCommand.subcommand("收获", "收获已成熟的作物").action(async ({ session }) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
    if (taxCheck) return await respond(taxCheck);
    return await respond(await harvest(ctx, config, session));
  });
  slaveCommand.subcommand("作物状态", "查看当前种植的作物状态").action(async ({ session }) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
    if (taxCheck) return await respond(taxCheck);
    return await respond(await cropStatus(ctx, config, session));
  });
  slaveCommand.subcommand("装扮商店", "查看可购买的装扮列表").action(async ({ session }) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
    if (taxCheck) return await respond(taxCheck);
    return await respond(await appearanceShop(ctx, config, session));
  });
  slaveCommand.subcommand("装扮背包", "查看已购买的装扮").action(async ({ session }) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
    if (taxCheck) return await respond(taxCheck);
    return await respond(await checkAppearanceInventory(ctx, config, session));
  });
  slaveCommand.subcommand("购买装扮 <itemName:string>", "购买指定装扮").action(async ({ session }, itemName) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
    if (taxCheck) return await respond(taxCheck);
    return await respond(await buyAppearance(ctx, config, session, itemName));
  });
  slaveCommand.subcommand("装备装扮 <itemName:string>", "装备指定装扮").action(async ({ session }, itemName) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
    if (taxCheck) return await respond(taxCheck);
    return await respond(await equipAppearance(ctx, config, session, itemName));
  });
  slaveCommand.subcommand("脱下装扮 <itemName:string>", "脱下指定装扮").action(async ({ session }, itemName) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
    if (taxCheck) return await respond(taxCheck);
    return await respond(await unequipAppearance(ctx, config, session, itemName));
  });
  slaveCommand.subcommand("我的装扮", "查看当前装扮状态").action(async ({ session }) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
    if (taxCheck) return await respond(taxCheck);
    return await respond(await checkAppearance(ctx, config, session));
  });
  slaveCommand.subcommand("牛马排行", "查看拥有牛马数量最多的玩家排行").action(async ({ session }) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
    if (taxCheck) return await respond(taxCheck);
    const users = await ctx.database.get("player_market_users", createScopeFilter(session));
    const sorted = users.sort((a, b) => b.employeeCount - a.employeeCount).slice(0, 20);
    if (!sorted.length) return await respond("暂无排行数据");
    const list = sorted.map(
      (user, index) => `${index + 1}. ${user.nickname} - 拥有牛马: ${user.employeeCount}个`
    ).join("\n");
    return await respond(`=== 牛马拥有量排行榜(前20名) ===
${list}`);
  });
  slaveCommand.subcommand("身价排行", "查看身价最高的玩家排行").action(async ({ session }) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
    if (taxCheck) return await respond(taxCheck);
    const users = await ctx.database.get("player_market_users", createScopeFilter(session));
    const sorted = users.sort((a, b) => b.price - a.price).slice(0, 20);
    if (!sorted.length) return await respond("暂无排行数据");
    const list = sorted.map(
      (user, index) => `${index + 1}. ${user.nickname} - 身价: ${user.price}`
    ).join("\n");
    return await respond(`=== 牛马身价排行榜(前20名) ===
${list}`);
  });
  slaveCommand.subcommand("资金排行", "查看总资产最多的玩家排行").action(async ({ session }) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
    if (taxCheck) return await respond(taxCheck);
    const users = await ctx.database.get("player_market_users", createScopeFilter(session));
    const sorted = users.sort((a, b) => b.balance + b.deposit - (a.balance + a.deposit)).slice(0, 20);
    if (!sorted.length) return await respond("暂无排行数据");
    const list = sorted.map(
      (user, index) => `${index + 1}. ${user.nickname} - 总资产: ${user.balance + user.deposit}(余额:${user.balance} + 存款:${user.deposit})`
    ).join("\n");
    return await respond(`=== 资金排行榜(前20名) ===
${list}`);
  });
  slaveCommand.subcommand("天气", "查看当前天气状态").action(async ({ session }) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const status = ctx.weatherService.getWeatherStatus();
    return await respond(`当前天气状态：
天气：${status.weatherEffect.name} - ${status.weatherEffect.description}
季节：${status.seasonEffect.name} - ${status.seasonEffect.description}
温度：${status.temperature}°C
作物生长速度：${(status.weatherEffect.cropGrowthRate * status.seasonEffect.cropGrowthRate * 100).toFixed(0)}%
打工收入修正：${(status.weatherEffect.workIncomeRate * 100).toFixed(0)}%`);
  });
  slaveCommand.subcommand("监狱打工", "在监狱中打工").action(async ({ session }) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    return await respond(await jailWork(ctx, config, session));
  });
  slaveCommand.subcommand("监狱状态", "查看监狱状态").action(async ({ session }) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    return await respond(await checkJailStatus(ctx, config, session));
  });
  slaveCommand.subcommand("监狱名单", "查看当前在监狱中的玩家列表").action(async ({ session }) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const users = await ctx.database.get("player_market_users", { isInJail: true });
    if (!users.length) {
      return await respond("监狱目前是空的");
    }
    const now = Date.now();
    const list = users.filter((user) => {
      const endTime = user.jailStartTime + config.监狱系统.监狱打工间隔 * config.监狱系统.监狱打工次数上限;
      return endTime > now;
    }).map((user) => {
      const remainingTime = Math.ceil((user.jailStartTime + config.监狱系统.监狱打工间隔 * config.监狱系统.监狱打工次数上限 - now) / (60 * 1e3));
      return `${user.nickname} - 剩余时间：${remainingTime}分钟
📝 入狱原因：${user.jailReason}`;
    }).join("\n\n");
    if (!list) {
      return await respond("监狱目前是空的");
    }
    return await respond(`=== 监狱名单 ===
${list}`);
  });
  slaveCommand.subcommand("备份列表", "查看可用的备份文件").action(async ({ session }) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    if (!isAdmin(ctx, config, session.userId, session)) {
      return await respond("只有管理员可以查看备份列表");
    }
    const backupDir = import_path.default.join(process.cwd(), "backups");
    const files = fs2.readdirSync(backupDir).filter((file) => file.startsWith("backup_") && file.endsWith(".json")).map((file) => ({
      name: file,
      time: fs2.statSync(import_path.default.join(backupDir, file)).mtime.toLocaleString()
    })).sort((a, b) => b.time.localeCompare(a.time));
    if (!files.length) {
      return await respond("暂无备份文件");
    }
    return await respond(`=== 备份列表 ===
${files.map(
      (file) => `${file.name}
创建时间：${file.time}`
    ).join("\n\n")}`);
  });
  slaveCommand.subcommand("恢复备份 <backupFile:string>", "从指定备份文件恢复数据").action(async ({ session }, backupFile) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    if (!isAdmin(ctx, config, session.userId, session)) {
      return await respond("只有管理员可以恢复备份");
    }
    const success = await ctx.backupService.restoreFromBackup(backupFile);
    return await respond(success ? "✅ 备份恢复成功" : "❌ 备份恢复失败");
  });
  slaveCommand.subcommand("立即备份", "立即创建一次备份").action(async ({ session }) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    if (!isAdmin(ctx, config, session.userId, session)) {
      return await respond("只有管理员可以创建备份");
    }
    await ctx.backupService.createBackup();
    return await respond("✅ 备份创建成功");
  });
  slaveCommand.subcommand("添加管理员 <nickname:string>", "添加管理员（仅管理员可用）").action(async ({ session }, nickname) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    if (!isAdmin(ctx, config, session.userId, session)) {
      return await respond("只有管理员可以添加管理员");
    }
    const users = await ctx.database.get("player_market_users", createScopeFilter(session));
    const targetUser = users.find((user) => user.nickname === nickname);
    if (!targetUser) {
      return await respond("❌ 找不到该玩家，请确保昵称正确");
    }
    if (config.管理员列表.includes(targetUser.userId)) {
      return await respond("该用户已经是管理员");
    }
    config.管理员列表.push(targetUser.userId);
    return await respond(`✅ 已添加管理员：${targetUser.nickname}(${targetUser.userId})`);
  });
  slaveCommand.subcommand("移除管理员 <nickname:string>", "移除管理员（仅管理员可用）").action(async ({ session }, nickname) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    if (!isAdmin(ctx, config, session.userId, session)) {
      return await respond("只有管理员可以移除管理员");
    }
    const users = await ctx.database.get("player_market_users", createScopeFilter(session));
    const targetUser = users.find((user) => user.nickname === nickname);
    if (!targetUser) {
      return await respond("❌ 找不到该玩家，请确保昵称正确");
    }
    const index = config.管理员列表.indexOf(targetUser.userId);
    if (index === -1) {
      return await respond("该用户不是管理员");
    }
    config.管理员列表.splice(index, 1);
    return await respond(`✅ 已移除管理员：${targetUser.nickname}(${targetUser.userId})`);
  });
  slaveCommand.subcommand("管理员列表", "查看所有管理员（仅管理员可用）").action(async ({ session }) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    if (!isAdmin(ctx, config, session.userId, session)) {
      return await respond("只有管理员可以查看管理员列表");
    }
    const adminUsers = await ctx.database.get("player_market_users", createScopeFilter(session, {
      userId: { $in: config.管理员列表 }
    }));
    const adminList = adminUsers.map(
      (user) => `${user.nickname}(${user.userId})`
    ).join("\n");
    return await respond(`=== 管理员列表 ===
${adminList}`);
  });
  slaveCommand.subcommand("牛马列表", "查看自己的牛马").action(async ({ session }) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
    if (taxCheck) return await respond(taxCheck);
    const owner = await getUser2(ctx, session.userId, session);
    if (!owner)
      return await respond(registrationGuide());
    const employees = await ctx.database.get("player_market_users", {
      employer: owner.userId
    });
    return await respond(formatEmployeeList(employees));
  });
  slaveCommand.subcommand("牛马状态 <target:string>", "查看牛马状态").action(async ({ session }, target) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
    if (taxCheck) return await respond(taxCheck);
    const targetUser = await resolveTargetUser(ctx, session, target);
    if (!targetUser) {
      return await respond("❌ 找不到该玩家，请确保昵称正确");
    }
    const owner = await getUser2(ctx, session.userId, session);
    if (!owner)
      return await respond(registrationGuide());
    if (targetUser.employer !== owner.userId) {
      return await respond("❌ 该玩家不是你的牛马");
    }
    return await respond(`=== ${targetUser.nickname}的状态 ===
💰 当前余额：${targetUser.balance}
💵 当前身价：${targetUser.price}
🏦 银行存款：${targetUser.deposit}/${targetUser.depositLimit}
💳 信用等级：${targetUser.creditLevel}
💸 累计福利：${targetUser.welfareIncome}
📚 培训等级：${targetUser.trainingLevel}
💎 福利等级：${targetUser.welfareLevel}`);
  });
  slaveCommand.subcommand("赞助", "查看赞助信息").action(async ({ session }) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const tip = `💝 感谢您对游戏的支持！

🎁 赞助后您将获得：
- 专属VIP特权
- 自动打工功能
- 自动收获功能
- 自动存款功能
- 专属装扮
- 更多特权持续更新中...

💡 赞助步骤：
1. 扫描赞赏码选择支持方案
2. 完成支付后，将收到VIP卡密
3. 使用"vip兑换 [卡密]"命令激活VIP特权

您的支持将帮助我们持续改进游戏，添加更多有趣的功能！`;
    return await respond(await withSponsorQr(tip));
  });
  slaveCommand.subcommand("赞助权益", "查看赞助后获得的权益").action(async ({ session }) => {
    const respond = setupMessageRecall(session, ctx, config, "general");
    const tip = `🎁 VIP特权内容：

1️⃣ 自动功能：
- 自动打工：自动赚取金币
- 自动收获：自动收获作物
- 自动存款：自动存入银行

2️⃣ 专属特权：
- 专属装扮：独特外观
- 优先体验：新功能抢先体验
- 专属客服：一对一服务

3️⃣ 其他福利：
- 每日额外奖励
- 专属称号
- 更多特权持续更新中...

📷 立即扫码即可赞助，获取更多特权`;
    return await respond(await withSponsorQr(tip));
  });
}
__name(apply, "apply");
async function withSponsorQr(message) {
  if (!sponsorQrCache && !sponsorQrError) {
    try {
      const buffer = await fs2.readFile(sponsorQrPath);
      sponsorQrCache = import_koishi4.h.image(buffer, "image/png");
    } catch (error) {
      sponsorQrError = "⚠️ 赞赏码暂不可用，请稍后再试";
      console.error("Sponsor QR load failed:", {
        path: sponsorQrPath,
        error
      });
    }
  }
  const qrSegment = sponsorQrCache ? `📷 扫描赞赏码支持作者：\n${sponsorQrCache}` : sponsorQrError || "⚠️ 暂无赞赏码，请联系管理员";
  return `${message}

${qrSegment}`;
}
__name(withSponsorQr, "withSponsorQr");
function formatMarketList(users) {
  const freeUsers = users.filter((user) => !user.employer);
  if (!freeUsers.length) return "市场目前没有可购买的牛马 🐂🐎";
  const list = freeUsers.map((user) => {
    return `${user.nickname} - 身价: ${user.price}`;
  });
  return `=== 牛马市场 🐂🐎 ===
${list.join("\n")}`;
}
__name(formatMarketList, "formatMarketList");
async function getUser8(ctx, userId, session, isTarget = false) {
  return await getUser(ctx, userId, session);
}
__name(getUser8, "getUser");
async function resetGame(ctx, config) {
  await ctx.database.remove("player_market_users", {});
  await ctx.database.remove("game_statistics", {});
  await ctx.database.create("game_statistics", {
    totalTransactions: 0,
    totalWorkIncome: 0,
    totalRobAmount: 0,
    activePlayers: 0,
    gameStartTime: Date.now(),
    gameStatus: "running"
  });
  await ctx.database.remove("slave_market_system", {});
  await ctx.database.create("slave_market_system", {
    balance: config.初始余额,
    isFinancialCrisis: false
  });
}
__name(resetGame, "resetGame");
function formatEmployeeList(employees) {
  if (!employees.length) return "你还没有牛马 🐂🐎";
  const list = employees.map(
    (emp) => `${emp.nickname} - 身价: ${emp.price}`
  ).join("\n");
  return `=== 你的牛马列表 🐂🐎 ===
${list}`;
}
__name(formatEmployeeList, "formatEmployeeList");
async function checkTaxBeforeCommand(ctx, config, session) {
  const user = await getUser6(ctx, session.userId, session);
  if (typeof user === "string") return user;
  if (isAdmin(ctx, config, user.userId, session)) {
    return null;
  }
  if (user.isInJail) {
    const command = session.content.trim();
    const allowedCommands = ["监狱状态", "监狱打工"];
    if (!allowedCommands.some((cmd) => command.startsWith(cmd))) {
      return "❌ 你在监狱中，只能使用以下命令：\n• 监狱状态\n• 监狱打工";
    }
    return null;
  }
  return null;
}
__name(checkTaxBeforeCommand, "checkTaxBeforeCommand");
function isAdmin(ctx, config, userId, session) {
  const scopedId = ensureScopedId(session, userId);
  const result = config.管理员列表.includes(scopedId);
  if (config?.调试日志) {
    ctx.logger?.info?.(`[slave-market][debug] isAdmin check`, {
      scopedId,
      result,
      admins: config.管理员列表
    });
  }
  return result;
}
__name(isAdmin, "isAdmin");
({
  deposit,
  withdraw,
  claimInterest,
  bankInfo,
  upgradeCredit,
  applyLoan,
  repayLoan,
  transfer
} = createBankModule({
  getUser3,
  accrueLoanInterest,
  calculateLoanLimit,
  formatCostTip,
  isAdmin
}));
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  inject,
  name
});
