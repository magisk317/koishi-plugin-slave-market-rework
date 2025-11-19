const { Random } = require("koishi");
const { creditSystemAccount, ensureSufficientBalance, calculatePurchaseTax } = require("../utils/economy");
const { isWealthProtected, invalidateWealthCache } = require("../utils/wealthProtection");

function createJailModule(deps) {
  const {
    setupMessageRecall,
    checkTaxBeforeCommand,
    getUser6,
    getScopeKey,
    transactionService,
    shopEffects
  } = deps;
  const applyTaxWaiverHelper = shopEffects?.applyTaxWaiver
    ? shopEffects.applyTaxWaiver
    : async (ctx, session, user, fee) => ({ amount: fee, waived: false, tip: "" });

  function shuffleStrategies(strategies) {
    const copy = strategies.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function resolveJailCooldown(config) {
    const value = Number(config?.监狱系统?.打工冷却);
    if (!Number.isFinite(value)) {
      return 10 * 60 * 1e3;
    }
    return Math.max(0, value);
  }

  function getJailCooldownReference(user) {
    if (!user) return 0;
    const startTime = Math.max(0, user.jailStartTime || 0);
    const lastWorkTime = Math.max(0, user.lastJailWorkTime || 0);
    return Math.max(startTime, lastWorkTime);
  }

  function calculateBailAmount(user, config) {
    const basePrice = Number.isFinite(user?.price) && user.price > 0
      ? user.price
      : Math.max(1, Number(config?.初始身价) || 1);
    return Math.max(1, Math.floor(basePrice / 2));
  }

  async function getScopeCandidates(ctx, session, excludeIds = []) {
    const scopeId = getScopeKey(session);
    const filter = scopeId ? { scopeId } : {};
    const users = await ctx.database.get("player_market_users", filter);
    return users.filter((user) => !excludeIds.includes(user.userId));
  }

  async function distributeJailIncome(ctx, session, prisoner, amount) {
    if (!amount || amount <= 0) return "";
    const strategies = shuffleStrategies([
      async () => {
        const candidates = await getScopeCandidates(ctx, session, [prisoner.userId]);
        if (!candidates.length) return null;
        const target = candidates.reduce((lowest, current) => {
          const lowestWealth = (lowest.balance || 0) + (lowest.deposit || 0);
          const currentWealth = (current.balance || 0) + (current.deposit || 0);
          return currentWealth < lowestWealth ? current : lowest;
        });
        const balanceAfter = target.balance + amount;
        await ctx.database.set("player_market_users", { userId: target.userId }, {
          balance: balanceAfter,
        });
        await transactionService?.logTransaction(ctx, { ...target, balance: balanceAfter }, {
          direction: "income",
          category: transactionService?.categories.JAIL_DISTRIBUTION,
          amount,
          description: "监狱补贴",
          balanceAfter
        });
        invalidateWealthCache(session);
        return `💝 【资金最少】把${amount}金币塞给最穷的 ${target.nickname}`;
      },
      async () => {
        const candidates = await getScopeCandidates(ctx, session, [prisoner.userId]);
        if (!candidates.length) return null;
        const recipient = candidates[Math.floor(Math.random() * candidates.length)];
        const balanceAfter = recipient.balance + amount;
        await ctx.database.set("player_market_users", { userId: recipient.userId }, {
          balance: balanceAfter,
        });
        await transactionService?.logTransaction(ctx, { ...recipient, balance: balanceAfter }, {
          direction: "income",
          category: transactionService?.categories.JAIL_DISTRIBUTION,
          amount,
          description: "随机红包",
          balanceAfter,
          relatedUserId: prisoner.userId
        });
        invalidateWealthCache(session);
        return `🧧 【群友红包】随机送${amount}金币给 ${recipient.nickname}`;
      },
    ]);
    for (const handler of strategies) {
      const result = await handler();
      if (result) return result;
    }
    await creditSystemAccount(ctx, amount);
    return `⚠️ 没有找到合适的受赠者，${amount}金币已上缴系统`;
  }

  async function jailWork(ctx, config, session) {
    const user = await getUser6(ctx, session.userId, session);
    if (typeof user === "string") return user;
    if (!user.isInJail) {
      return "🚔 你又没被关进来，想踩缝纫机先排队进监狱";
    }
    const cooldown = resolveJailCooldown(config);
    const now = Date.now();
    const referenceTime = getJailCooldownReference(user);
    if (cooldown > 0 && referenceTime > 0 && now - referenceTime < cooldown) {
      const remaining = Math.ceil((cooldown - (now - referenceTime)) / (60 * 1e3));
      return `⏳ 踩缝纫机冷却中，还需等待${remaining}分钟`;
    }
    const baseIncome = Random.int(100, 150);
    const multiplier = Number(config?.监狱系统?.工作收入倍率 ?? 1);
    const income = Math.max(0, Math.floor(baseIncome * multiplier));
    let payoutMessage = "";
    if (income > 0) {
      payoutMessage = await distributeJailIncome(ctx, session, user, income);
    }
    await ctx.database.set("player_market_users", { userId: user.userId }, {
      isInJail: false,
      jailStartTime: 0,
      jailReason: "",
      jailWorkIncome: 0,
      jailWorkCount: 0,
      lastJailWorkTime: now,
      lastJailVictimId: "",
    });
    return `✅ 缝纫任务完成！
💰 本次踩缝纫机收入：${income}金币${payoutMessage ? `\n${payoutMessage}` : ""}
🏁 你已完成劳动任务，离开了监狱`;
  }

  async function checkJailStatus(ctx, config, session) {
    const user = await getUser6(ctx, session.userId, session);
    if (typeof user === "string") return user;
    if (!user.isInJail) {
      return "✅ 你当前不在监狱中";
    }
    const cooldown = resolveJailCooldown(config);
    const now = Date.now();
    const referenceTime = getJailCooldownReference(user);
    const ready = !cooldown || referenceTime <= 0 || now - referenceTime >= cooldown;
    const remaining = ready ? 0 : Math.ceil((cooldown - (now - referenceTime)) / (60 * 1e3));
    const bailAmount = calculateBailAmount(user, config);
    return `=== 监狱状态 ===
💸 单次缝纫收益：100 - 150 金币
⏳ 下次可进行：${ready ? "随时" : `${remaining}分钟后`}
💵 交保费用：${bailAmount} 金币
💡 使用"踩缝纫机"完成劳动或输入"交保出狱"立即离开监狱`;

  }

  async function bailOut(ctx, config, session) {
    let user = await getUser6(ctx, session.userId, session);
    if (typeof user === "string") return user;
    if (!user.isInJail) {
      return "✅ 你不在监狱中，无需交保。";
    }
    const bailAmount = calculateBailAmount(user, config);
    const wealthProtected = await isWealthProtected(ctx, session, user);
    let taxAmount = calculatePurchaseTax(config, bailAmount, user, { wealthProtected });
    let waiverTip = "";
    if (taxAmount > 0) {
      const waiver = await applyTaxWaiverHelper(ctx, session, user, taxAmount, { label: "保释税金" });
      taxAmount = waiver.amount;
      waiverTip = waiver.tip;
    }
    const totalCost = bailAmount + taxAmount;
    let autoWithdrawNotice = "";
    const cover = await ensureSufficientBalance(ctx, user, totalCost);
    user = cover.user;
    autoWithdrawNotice = cover.notice;
    if (user.balance < totalCost) {
      const notice = autoWithdrawNotice ? `\n${autoWithdrawNotice}` : "";
      return `❌ 交保需要${totalCost}金币，但你只有${user.balance}金币${notice}`;
    }
    const now = Date.now();
    const balanceAfter = user.balance - totalCost;
    await ctx.database.set("player_market_users", { userId: user.userId }, {
      balance: balanceAfter,
      isInJail: false,
      jailStartTime: 0,
      jailReason: "",
      jailWorkIncome: 0,
      jailWorkCount: 0,
      lastJailWorkTime: now,
      lastJailVictimId: "",
    });
    invalidateWealthCache(session);
    await creditSystemAccount(ctx, totalCost);
    if (taxAmount > 0) {
      await ctx.taxService?.recordTax(session, taxAmount);
    }
    await transactionService?.logTransaction(ctx, { ...user, balance: balanceAfter }, {
      direction: "expense",
      category: transactionService?.categories.JAIL_BAIL,
      amount: totalCost,
      description: taxAmount > 0 ? "监狱交保出狱（含税）" : "监狱交保出狱",
      balanceAfter,
    });
    const notice = autoWithdrawNotice ? `\n${autoWithdrawNotice}` : "";
    return `✅ 交保成功！
💰 支付保释金：${bailAmount}金币${taxAmount > 0 ? `\n💸 税金：${taxAmount}金币` : ""}
🏁 你已离开监狱${notice}${waiverTip}`;
  }

  async function jailRoster(ctx, config, session) {
    const users = await ctx.database.get("player_market_users", { isInJail: true });
    if (!users.length) {
      return "监狱目前是空的";
    }
    const lines = users.map((user) => `${user.nickname} - 完成劳动后即可释放`);
    return `=== 监狱名单 ===\n${lines.join("\n")}`;
  }

  function registerJailCommands(ctx, config) {
    const slaveCommand = ctx.command("大牛马时代");
    slaveCommand
      .subcommand("踩缝纫机", "在监狱里踩缝纫机赚取收入")
      .alias("监狱打工")
      .action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
      if (taxCheck) return await respond(taxCheck);
      return await respond(await jailWork(ctx, config, session));
    });
    slaveCommand
      .subcommand("交保出狱", "支付保释金立即离开监狱")
      .alias("交保")
      .alias("保释")
      .action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
      if (taxCheck) return await respond(taxCheck);
      return await respond(await bailOut(ctx, config, session));
    });
    slaveCommand.subcommand("监狱状态", "查看监狱状态").action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
      if (taxCheck) return await respond(taxCheck);
      return await respond(await checkJailStatus(ctx, config, session));
    });
    slaveCommand.subcommand("监狱名单", "查看当前在监狱中的玩家列表").action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
      if (taxCheck) return await respond(taxCheck);
      return await respond(await jailRoster(ctx, config, session));
    });
  }

  return { registerJailCommands };
}

module.exports = { createJailModule };
