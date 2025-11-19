const { ensureSufficientBalance, calculatePurchaseTax, creditSystemAccount } = require("../utils/economy");
const { isWealthProtected, invalidateWealthCache } = require("../utils/wealthProtection");

const BASE_ITEMS = [
  { id: "boost", name: "收益翻倍卡", description: "1小时内打工/农场/福报收益翻倍", price: 2000, effect: "boost" },
  { id: "tax-free", name: "免税券", description: "下一笔税费/手续费豁免一次", price: 1500, effect: "tax-free" }
];
const DEFAULT_DAILY_LIMIT = 2;
const BOOST_DURATION_MS = 60 * 60 * 1e3;
const BOOST_MULTIPLIER = 2;

function resolveDailyLimit(config) {
  const value = Number(config?.商城?.每日限购);
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_DAILY_LIMIT;
  return Math.max(1, Math.floor(value));
}

function normalizeItems(config) {
  const items = Array.isArray(config?.商城?.道具) && config.商城.道具.length ? config.商城.道具 : BASE_ITEMS;
  const globalLimit = resolveDailyLimit(config);
  return items.map((item, index) => {
    const name = item?.name || item?.名称 || `道具${index + 1}`;
    const id = (item?.id || item?.标识 || name || `item-${index + 1}`).toString().trim();
    const priceValue = Number(item?.price ?? item?.价格 ?? BASE_ITEMS[index]?.price ?? 0);
    const price = Number.isFinite(priceValue) && priceValue > 0 ? Math.floor(priceValue) : 1;
    const limitValue = Number(item?.dailyLimit ?? item?.每日限购);
    const dailyLimit = Number.isFinite(limitValue) && limitValue > 0 ? Math.floor(limitValue) : globalLimit;
    return {
      id: id || `item-${index + 1}`,
      name,
      description: item?.description || item?.描述 || "",
      price,
      effect: item?.effect || item?.效果 || "",
      dailyLimit,
      durationMs: Number(item?.durationMs),
      charges: Number(item?.charges)
    };
  });
}

function matchItem(items, keyword) {
  const normalized = (keyword || "").trim().toLowerCase();
  if (!normalized) return null;
  return items.find(
    (item) => item.id.toLowerCase() === normalized || item.name.toLowerCase() === normalized
  );
}

function getDateKey(timestamp = Date.now()) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

async function getDailyPurchaseRecord(ctx, userId, itemId, dateKey) {
  const [record] = await ctx.database.get("player_market_shop_purchases", { userId, itemId, dateKey });
  return record || null;
}

async function increaseDailyPurchase(ctx, userId, itemId, dateKey, existingRecord) {
  const now = Date.now();
  if (existingRecord) {
    await ctx.database.set("player_market_shop_purchases", { id: existingRecord.id }, {
      count: existingRecord.count + 1,
      updatedAt: now
    });
  } else {
    await ctx.database.create("player_market_shop_purchases", {
      userId,
      itemId,
      dateKey,
      count: 1,
      createdAt: now,
      updatedAt: now
    });
  }
}

function getInventorySnapshot(user) {
  if (user?.inventory && typeof user.inventory === "object") {
    return { ...user.inventory };
  }
  return {};
}

async function adjustInventoryCount(ctx, user, itemId, delta) {
  const inventory = getInventorySnapshot(user);
  const current = Math.max(0, Number(inventory[itemId]) || 0);
  const next = Math.max(0, current + delta);
  if (next <= 0) {
    delete inventory[itemId];
  } else {
    inventory[itemId] = next;
  }
  await ctx.database.set("player_market_users", { userId: user.userId }, { inventory });
  user.inventory = inventory;
  return next;
}

function getInventoryCount(user, itemId) {
  if (!user?.inventory) return 0;
  const value = Number(user.inventory[itemId]);
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function formatDuration(ms) {
  if (!ms || ms <= 0) return "0分钟";
  const minutes = Math.ceil(ms / (60 * 1e3));
  if (minutes >= 60) {
    const hours = minutes / 60;
    if (hours >= 24) {
      return `${(hours / 24).toFixed(1)}天`;
    }
    return `${hours.toFixed(1)}小时`;
  }
  return `${minutes}分钟`;
}

function getBoostState(user) {
  const expiresAt = Number(user?.shopBoostEndTime) || 0;
  const now = Date.now();
  const active = expiresAt > now;
  return {
    active,
    expiresAt,
    remainingMs: Math.max(0, expiresAt - now),
    multiplier: active ? BOOST_MULTIPLIER : 1
  };
}

async function extendBoostDuration(ctx, user, durationMs = BOOST_DURATION_MS) {
  const now = Date.now();
  const current = Number(user.shopBoostEndTime) || 0;
  const base = current > now ? current : now;
  const newEnd = base + (Number(durationMs) > 0 ? durationMs : BOOST_DURATION_MS);
  await ctx.database.set("player_market_users", { userId: user.userId }, { shopBoostEndTime: newEnd });
  user.shopBoostEndTime = newEnd;
  return newEnd;
}

async function incrementTaxFreeCharges(ctx, user, delta = 1) {
  const current = Math.max(0, Number(user.shopTaxFreeCharges) || 0);
  const updated = current + Math.max(1, Math.floor(delta));
  await ctx.database.set("player_market_users", { userId: user.userId }, { shopTaxFreeCharges: updated });
  user.shopTaxFreeCharges = updated;
  return updated;
}

async function applyIncomeBoost(ctx, user, baseAmount) {
  const normalized = Math.floor(Number(baseAmount));
  if (!ctx || !user || !Number.isFinite(normalized) || normalized <= 0) {
    return { amount: Math.max(0, normalized || 0), active: false, multiplier: 1, expiresAt: 0 };
  }
  const state = getBoostState(user);
  if (!state.active) {
    if (user.shopBoostEndTime) {
      await ctx.database.set("player_market_users", { userId: user.userId }, { shopBoostEndTime: 0 });
      user.shopBoostEndTime = 0;
    }
    return { amount: normalized, active: false, multiplier: 1, expiresAt: 0 };
  }
  const boosted = Math.max(1, Math.floor(normalized * state.multiplier));
  return { amount: boosted, active: true, multiplier: state.multiplier, expiresAt: state.expiresAt };
}

async function applyTaxWaiver(ctx, session, user, fee, options = {}) {
  const normalizedFee = Math.max(0, Math.floor(Number(fee) || 0));
  if (!ctx || !user || normalizedFee <= 0) {
    return { amount: normalizedFee, waived: false, tip: "" };
  }
  const charges = Math.max(0, Number(user.shopTaxFreeCharges) || 0);
  if (charges <= 0) {
    return { amount: normalizedFee, waived: false, tip: "" };
  }
  const remaining = charges - 1;
  await ctx.database.set("player_market_users", { userId: user.userId }, { shopTaxFreeCharges: remaining });
  user.shopTaxFreeCharges = remaining;
  const label = options.label || "税费";
  const tip = options.silent ? "" : `\n🛡️ 免税券生效，本次${label}已豁免。剩余${remaining}次免税。`;
  return { amount: 0, waived: true, tip };
}

function createShopModule(deps) {
  const { setupMessageRecall, getUser6, registrationGuide, transactionService } = deps;

  async function purchase(ctx, config, session, itemKey) {
    let user = await getUser6(ctx, session.userId, session);
    if (typeof user === "string") return registrationGuide();
    const items = normalizeItems(config);
    if (!items.length) return "🛒 商城暂未上架任何道具。";
    const item = matchItem(items, itemKey);
    if (!item) return `❌ 未找到道具：${itemKey}`;
    const dateKey = getDateKey();
    const record = await getDailyPurchaseRecord(ctx, user.userId, item.id, dateKey);
    const purchasedCount = record?.count ?? 0;
    if (purchasedCount >= item.dailyLimit) {
      return `⛔ ${item.name} 每日限购 ${item.dailyLimit} 张，你今天已经买完啦。`;
    }
    const privileged = false;
    const wealthProtected = await isWealthProtected(ctx, session, user);
    let tax = calculatePurchaseTax(config, item.price, user, { wealthProtected });
    let waiverTip = "";
    if (tax > 0) {
      const waiver = await applyTaxWaiver(ctx, session, user, tax, { label: `${item.name} 税费` });
      tax = waiver.amount;
      waiverTip = waiver.tip;
    }
    const totalCost = item.price + tax;
    const cover = await ensureSufficientBalance(ctx, user, totalCost, { privileged });
    user = cover.user;
    const notice = cover.notice ? `\n${cover.notice}` : "";
    if (user.balance < totalCost) {
      return `💰 购买 ${item.name} 需要 ${totalCost} 金币，你的余额不足。${notice}`;
    }
    const updatedBalance = user.balance - totalCost;
    await ctx.database.set("player_market_users", { userId: user.userId }, { balance: updatedBalance });
    await increaseDailyPurchase(ctx, user.userId, item.id, dateKey, record);
    await adjustInventoryCount(ctx, user, item.id, 1);
    await transactionService?.logTransaction(ctx, { ...user, balance: updatedBalance }, {
      direction: "expense",
      category: transactionService?.categories.SHOP_PURCHASE || transactionService?.categories.PURCHASE,
      amount: totalCost,
      description: `购买道具：${item.name}`,
      balanceAfter: updatedBalance,
      metadata: {
        itemId: item.id,
        itemName: item.name,
        tax
      }
    });
    if (tax > 0) {
      await creditSystemAccount(ctx, tax);
      await ctx.taxService?.recordTax(session, tax);
    }
    invalidateWealthCache(session);
    const taxTip = tax > 0 ? `\n💸 税金：${tax}金币` : "";
    return `✅ 已购买 ${item.name}，道具已放入背包。\n效果：${item.description || "暂无说明"}${taxTip}${waiverTip}${notice}`;
  }

  async function renderBackpack(ctx, config, session) {
    const user = await getUser6(ctx, session.userId, session);
    if (typeof user === "string") return registrationGuide();
    const items = normalizeItems(config);
    const inventory = items
      .map((item) => ({ item, count: getInventoryCount(user, item.id) }))
      .filter((entry) => entry.count > 0);
    const lines = inventory.length
      ? inventory.map((entry) => `• ${entry.item.name} ×${entry.count}｜${entry.item.description || "暂无说明"}`)
      : ["（暂无道具）"];
    const boostState = getBoostState(user);
    const boostLine = boostState.active
      ? `🔥 收益翻倍卡剩余：${formatDuration(boostState.remainingMs)}（x${boostState.multiplier}）`
      : "🔥 收益翻倍卡：未激活";
    const taxLine = `🛡️ 免税券剩余：${Math.max(0, Number(user.shopTaxFreeCharges) || 0)} 次`;
    return `=== 道具背包 ===
${lines.join("\n")}

${boostLine}
${taxLine}
💡 使用「商城 使用 道具名」或「商城使用 道具名」即可生效。`;
  }

  async function useItem(ctx, config, session, itemKey) {
    let user = await getUser6(ctx, session.userId, session);
    if (typeof user === "string") return registrationGuide();
    const items = normalizeItems(config);
    if (!items.length) return "🛒 商城暂未上架任何道具。";
    const item = matchItem(items, itemKey);
    if (!item) return `❌ 未找到道具：${itemKey}`;
    const count = getInventoryCount(user, item.id);
    if (count <= 0) return `🎒 背包里没有 ${item.name}，请先购买。`;
    let message = "";
    if (item.effect === "boost") {
      const expiresAt = await extendBoostDuration(ctx, user, item.durationMs || BOOST_DURATION_MS);
      message = `🔥 收益翻倍卡已激活，接下来所有打工、收获、福报收益翻倍。\n⏳ 持续至：${new Date(expiresAt).toLocaleString()}`;
    } else if (item.effect === "tax-free") {
      const charges = await incrementTaxFreeCharges(ctx, user, item.charges || 1);
      message = `🛡️ 免税券已激活，本次将增加一次税费豁免资格。\n当前剩余免税次数：${charges}`;
    } else {
      message = `🧪 ${item.name} 的效果准备中，敬请期待。`;
    }
    await adjustInventoryCount(ctx, user, item.id, -1);
    return `✅ 已使用 ${item.name}。\n${message}`;
  }

  function registerShopCommands(ctx, config) {
    async function handlePurchase(session, item) {
      const respond = setupMessageRecall(session, ctx, config, "general");
      return await respond(await purchase(ctx, config, session, item));
    }
    const command = ctx.command("大牛马时代.商城", "查看并购买限量道具");
    command.action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const items = normalizeItems(config);
      if (!items.length) return await respond("🛒 商城暂未上架任何道具。");
      const list = items
        .map((item) => `${item.name}｜${item.price} 金币｜${item.description || "暂无说明"}｜每日限购 ${item.dailyLimit}`)
        .join("\n");
      return await respond(`=== 限量商城 ===\n${list}\n使用「商城购买/商城 使用」系列指令即可体验新效果。`);
    });
    command.subcommand("购买 <item:string>", "购买指定道具").action(async ({ session }, item) => {
      return await handlePurchase(session, item);
    });
    command.subcommand("背包", "查看商城道具背包与状态").action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      return await respond(await renderBackpack(ctx, config, session));
    });
    command.subcommand("使用 <item:string>", "使用商城道具").action(async ({ session }, item) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      return await respond(await useItem(ctx, config, session, item));
    });
    ctx.command("大牛马时代.商城购买 <item:string>", "快捷购买商城道具").alias("商城购买").action(async ({ session }, item) => {
      return await handlePurchase(session, item);
    });
    ctx.command("大牛马时代.商城使用 <item:string>", "使用商城道具").alias("商城使用").action(async ({ session }, item) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      return await respond(await useItem(ctx, config, session, item));
    });
  }

  return {
    registerShopCommands,
    shopEffects: {
      applyIncomeBoost,
      applyTaxWaiver,
      getBoostState
    }
  };
}

module.exports = { createShopModule };
