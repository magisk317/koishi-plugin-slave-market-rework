const { ensureSufficientBalance, calculatePurchaseTax, creditSystemAccount } = require("../utils/economy");
const { isWealthProtected, invalidateWealthCache } = require("../utils/wealthProtection");

const DEFAULT_LOTTERY_OPTIONS = [
  { id: "mini", name: "迷你券", price: 500, reward: 1000, limit: 20, winRate: 0.5 },
  { id: "mega", name: "进阶券", price: 1000, reward: 2500, limit: 10, winRate: 0.2 },
  { id: "ultra", name: "豪华券", price: 2500, reward: 8000, limit: 5, winRate: 0.1 }
];
const DEFAULT_LIMIT = 5;
const DEFAULT_RATE = 0.1;

function clampRate(rate) {
  if (!Number.isFinite(rate)) return DEFAULT_RATE;
  return Math.min(1, Math.max(0, rate));
}

function normalizeOptions(config) {
  const raw = config?.彩票?.选项;
  const list = Array.isArray(raw) && raw.length ? raw : DEFAULT_LOTTERY_OPTIONS;
  const globalWinRate = clampRate(Number(config?.彩票?.中奖率 ?? config?.彩票?.winRate ?? DEFAULT_RATE));
  const globalLimit = Number(config?.彩票?.每日限购 ?? config?.彩票?.dailyLimit);
  return list.map((item, index) => {
    const defaults = DEFAULT_LOTTERY_OPTIONS[index] || {};
    const priceValue = Number(item?.price ?? item?.价格 ?? defaults.price ?? 0);
    const rewardValue = Number(item?.reward ?? item?.奖金 ?? defaults.reward ?? priceValue * 4);
    const id = (item?.id || item?.标识 || item?.name || item?.名称 || `lottery-${index + 1}`).toString().trim();
    const name = item?.name || item?.名称 || `彩票${index + 1}`;
    const limitValue = Number(item?.limit ?? item?.每日限购 ?? globalLimit ?? defaults.limit ?? DEFAULT_LIMIT);
    const winRateValue = clampRate(Number(item?.winRate ?? item?.中奖率 ?? defaults.winRate ?? globalWinRate));
    return {
      id: id || `lottery-${index + 1}`,
      name,
      price: Math.max(1, Math.floor(priceValue) || 1),
      reward: Math.max(0, Math.floor(rewardValue) || 0),
      description: item?.description || item?.描述 || "",
      limit: Number.isFinite(limitValue) && limitValue > 0 ? Math.floor(limitValue) : DEFAULT_LIMIT,
      winRate: winRateValue
    };
  });
}

function getLotterySettings(config) {
  return {
    options: normalizeOptions(config)
  };
}

function getDateKey(timestamp = Date.now()) {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

async function getDailyOptionPurchaseCount(ctx, userId, dateKey, optionId) {
  const rows = await ctx.database.get("player_market_lottery_orders", { userId, dateKey, optionId });
  return rows.length;
}

async function recordLotteryOrder(ctx, order) {
  await ctx.database.create("player_market_lottery_orders", order);
}

function createLotteryModule(deps) {
  const {
    setupMessageRecall,
    checkTaxBeforeCommand,
    getUser6,
    registrationGuide,
    transactionService,
    shopEffects
  } = deps;
  const applyTaxWaiverHelper = shopEffects?.applyTaxWaiver
    ? shopEffects.applyTaxWaiver
    : async (ctx, session, user, fee) => ({ amount: fee, waived: false, tip: "" });

  async function purchaseTicket(ctx, config, session, optionKey) {
    let user = await getUser6(ctx, session.userId, session);
    if (typeof user === "string") return registrationGuide();
    const settings = getLotterySettings(config);
    const option = settings.options.find(
      (entry) => entry.id === optionKey || entry.name === optionKey
    );
    if (!option) {
      const list = settings.options.map((item) => `${item.name}(${item.id}) - ${item.price}金币`).join("、");
      return `❌ 彩票类型错误，可用：${list}`;
    }
    const dateKey = getDateKey();
    const bought = await getDailyOptionPurchaseCount(ctx, user.userId, dateKey, option.id);
    const optionLimit = option.limit ?? DEFAULT_LIMIT;
    if (bought >= optionLimit) {
      return `⛔ ${option.name} 今日限购 ${optionLimit} 张，明天再来试手气吧。`;
    }
    const privileged = false;
    const wealthProtected = await isWealthProtected(ctx, session, user);
    let tax = calculatePurchaseTax(config, option.price, user, { wealthProtected });
    let waiverTip = "";
    if (tax > 0) {
      const waiver = await applyTaxWaiverHelper(ctx, session, user, tax, { label: `${option.name} 税费` });
      tax = waiver.amount;
      waiverTip = waiver.tip;
    }
    const totalCost = option.price + tax;
    const cover = await ensureSufficientBalance(ctx, user, totalCost, { privileged });
    user = cover.user;
    const notice = cover.notice ? `\n${cover.notice}` : "";
    if (user.balance < totalCost) {
      return `💰 购票需 ${totalCost} 金币，当前余额不足。${notice}`;
    }
    const balanceAfterPurchase = user.balance - totalCost;
    await ctx.database.set("player_market_users", { userId: user.userId }, { balance: balanceAfterPurchase });
    const winRate = Number.isFinite(option.winRate) ? option.winRate : DEFAULT_RATE;
    const isWin = Math.random() < winRate;
    const reward = isWin ? option.reward : 0;
    let finalBalance = balanceAfterPurchase;
    if (reward > 0) {
      finalBalance += reward;
      await ctx.database.set("player_market_users", { userId: user.userId }, { balance: finalBalance });
      await transactionService?.logTransaction(ctx, { ...user, balance: finalBalance }, {
        direction: "income",
        category: transactionService?.categories.LOTTERY_PRIZE,
        amount: reward,
        description: `彩票中奖：${option.name}`,
        balanceAfter: finalBalance
      });
    }
    await recordLotteryOrder(ctx, {
      userId: user.userId,
      optionId: option.id,
      optionName: option.name,
      price: option.price,
      tax,
      totalCost,
      reward,
      isWin,
      createdAt: Date.now(),
      dateKey
    });
    await transactionService?.logTransaction(ctx, { ...user, balance: balanceAfterPurchase }, {
      direction: "expense",
      category: transactionService?.categories.LOTTERY_PURCHASE,
      amount: totalCost,
      description: `购买彩票：${option.name}`,
      balanceAfter: balanceAfterPurchase,
      metadata: { tax }
    });
    if (tax > 0) {
      await creditSystemAccount(ctx, tax);
      await ctx.taxService?.recordTax(session, tax);
    }
    invalidateWealthCache(session);
    const taxTip = tax > 0 ? `\n💸 税金：${tax} 金币` : "";
    const winTip = isWin
      ? `🎉 恭喜中奖！奖金 +${reward} 金币`
      : "😔 未中奖，下次好运～";
    return `✅ 成功购买 ${option.name}，花费 ${totalCost} 金币${taxTip}${waiverTip}${notice}\n${winTip}`;
  }

  async function renderLotteryInfo(ctx, config, session) {
    const user = await getUser6(ctx, session.userId, session);
    if (typeof user === "string") return registrationGuide();
    const settings = getLotterySettings(config);
    const dateKey = getDateKey();
    const rateLine = settings.options
      .map((item) => `${item.name} ${(item.winRate * 100).toFixed(0)}%`)
      .join(" ｜ ");
    const limitLine = settings.options
      .map((item) => `${item.name} ${item.limit}张`)
      .join(" ｜ ");
    const infoLines = await Promise.all(settings.options.map(async (item) => {
      const bought = await getDailyOptionPurchaseCount(ctx, user.userId, dateKey, item.id);
      const remaining = Math.max(0, (item.limit ?? DEFAULT_LIMIT) - bought);
      const desc = item.description ? `｜${item.description}` : "";
      return `• ${item.name}（${item.id}）｜售价 ${item.price}｜奖金 ${item.reward}${desc}｜今日剩余 ${remaining}/${item.limit ?? DEFAULT_LIMIT}`;
    }));
    return `=== 幸运彩券 ===
🎯 中奖率：${rateLine}
📅 每种每日限购：${limitLine}

${infoLines.join("\n")}
使用「彩票购买 券名/ID」即可冲一波。`;
  }

  async function renderLotteryHistory(ctx, session) {
    const user = await getUser6(ctx, session.userId, session);
    if (typeof user === "string") return registrationGuide();
    const records = await ctx.database.get("player_market_lottery_orders", { userId: user.userId });
    if (!records.length) return "🎲 还没有任何购票记录。";
    const recent = records
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, 10)
      .map((row) => {
        const time = new Date(row.createdAt || Date.now()).toLocaleString();
        const result = row.isWin ? `中奖 +${row.reward}` : "未中奖";
        return `${time}｜${row.optionName}｜花费 ${row.totalCost}｜${result}`;
      });
    return `=== 彩票记录 ===
${recent.join("\n")}`;
  }

  function registerLotteryCommands(ctx, config) {
    const command = ctx.command("大牛马时代.彩票", "娱乐性彩票玩法").alias("彩票");
    command.action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
      if (taxCheck) return await respond(taxCheck);
      return await respond(await renderLotteryInfo(ctx, config, session));
    });
    command.subcommand("购票 <option:string>", "购买指定的彩票").action(async ({ session }, option) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
      if (taxCheck) return await respond(taxCheck);
      return await respond(await purchaseTicket(ctx, config, session, option));
    });
    command.subcommand("记录", "查看最近的彩票记录").action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
      if (taxCheck) return await respond(taxCheck);
      return await respond(await renderLotteryHistory(ctx, session));
    });
    ctx.command("大牛马时代.彩票购买 <option:string>").alias("彩票购买").action(async ({ session }, option) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
      if (taxCheck) return await respond(taxCheck);
      return await respond(await purchaseTicket(ctx, config, session, option));
    });
  }

  return { registerLotteryCommands };
}

module.exports = { createLotteryModule };
