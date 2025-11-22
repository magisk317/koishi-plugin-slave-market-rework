const { ensureSufficientBalance } = require("../utils/economy");

const TRAINING_COOLDOWN = 30 * 60 * 1e3;
const TRAINING_DAILY_LIMIT = 3;

function createWelfareModule(deps) {
  const { setupMessageRecall, getUser6, registrationGuide, transactionService, shopEffects, resolveTargetUser } = deps;
  const applyIncomeBoost = shopEffects?.applyIncomeBoost
    ? shopEffects.applyIncomeBoost
    : async (ctx, user, amount) => ({ amount, active: false, multiplier: 1 });

  function resolveArrayValue(values, level) {
    if (!Array.isArray(values) || !values.length) return 0;
    const index = Math.min(Math.max(level - 1, 0), values.length - 1);
    const value = Number(values[index]);
    return Number.isFinite(value) ? value : 0;
  }

  function getWelfareSettings(config) {
    const levelConfig = config?.福利等级 ?? {};
    const welfareConfig = config?.牛马福利 ?? {};
    return {
      baseSalary: levelConfig.基础工资 || [100, 200, 300, 400, 500],
      interval: levelConfig.福利间隔 ?? 24 * 60 * 60 * 1e3,
      baseRatio: welfareConfig.基础福利比例 ?? 0.1,
      levelBonus: welfareConfig.等级加成 ?? 0.2,
    };
  }

  function getTrainingSettings(config) {
    const levelConfig = config?.福利等级 ?? {};
    const welfareConfig = config?.牛马福利 ?? {};
    return {
      costs: levelConfig.培训费用 || [1e3, 2e3, 3e3, 4e3, 5e3],
      boosts: levelConfig.培训提升 || [0.1, 0.2, 0.3, 0.4, 0.5],
      interval: levelConfig.培训间隔 ?? welfareConfig.培训冷却 ?? 12 * 60 * 60 * 1e3,
      ratio: welfareConfig.培训费用比例 ?? 0.2
    };
  }

  function resolveTrainingCost(settings, targetLevel, price) {
    const baseCost = resolveArrayValue(settings.costs, targetLevel);
    const dynamicCost = Math.max(0, Math.floor(price * settings.ratio));
    return {
      baseCost,
      dynamicCost,
      totalCost: Math.max(1, baseCost + dynamicCost)
    };
  }

  function resolveTrainingBoost(settings, level, price) {
    const ratio = resolveArrayValue(settings.boosts, level);
    if (!ratio) return 0;
    return Math.max(1, Math.floor(price * ratio));
  }

  function getTrainingDateKey(timestamp = Date.now()) {
    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }

  function calculateWelfareReward(config, user) {
    const level = Math.max(1, user.welfareLevel || 1);
    const { baseSalary, baseRatio, levelBonus } = getWelfareSettings(config);
    const base = resolveArrayValue(baseSalary, level);
    const dynamicGain = Math.floor(user.price * baseRatio * (1 + (level - 1) * levelBonus));
    return Math.max(1, base + dynamicGain);
  }

  async function claimWelfare(ctx, config, session) {
    const user = await getUser6(ctx, session.userId, session);
    if (typeof user === "string") return registrationGuide();
    const { interval } = getWelfareSettings(config);
    const now = Date.now();
    const last = user.lastWelfareTime || 0;
    if (interval > 0 && now - last < interval) {
      const remaining = Math.ceil((interval - (now - last)) / (60 * 1e3));
      return `⏳ 福报还在酝酿，再等${remaining}分钟吧。`;
    }
    const reward = calculateWelfareReward(config, user);
    const boostInfo = await applyIncomeBoost(ctx, user, reward, { source: "welfare" });
    const finalReward = boostInfo?.amount ?? reward;
    const balanceAfter = user.balance + finalReward;
    await ctx.database.set("player_market_users", { userId: user.userId }, {
      balance: balanceAfter,
      welfareIncome: (user.welfareIncome || 0) + finalReward,
      lastWelfareTime: now,
    });
    await transactionService?.logTransaction(ctx, { ...user, balance: balanceAfter }, {
      direction: "income",
      category: transactionService?.categories.WELFARE,
      amount: finalReward,
      description: "领取福报",
      balanceAfter
    });
    const boostTip = boostInfo?.active ? `\n🔥 收益翻倍卡生效：收益x${boostInfo.multiplier}` : "";
    return `✨ 福报到账！本次收获${finalReward}金币。\n🌟 当前福报等级：${user.welfareLevel || 1}\n📈 累计福报：${(user.welfareIncome || 0) + finalReward}金币${boostTip}`;
  }

  async function getWelfareStatus(ctx, config, session) {
    const user = await getUser6(ctx, session.userId, session);
    if (typeof user === "string") return registrationGuide();
    const { interval } = getWelfareSettings(config);
    const now = Date.now();
    const last = user.lastWelfareTime || 0;
    const ready = interval <= 0 || now - last >= interval;
    const remaining = ready ? 0 : Math.ceil((interval - (now - last)) / (60 * 1e3));
    return `=== 福报状态 ===
🌟 福报等级：${user.welfareLevel || 1}
💰 累计福报：${user.welfareIncome || 0}金币
⏳ 下次可领取：${ready ? "随时可以" : `${remaining}分钟后`}`;
  }

  async function getTrainingStatus(ctx, config, session) {
    const user = await getUser6(ctx, session.userId, session);
    if (typeof user === "string") return registrationGuide();
    const settings = getTrainingSettings(config);
    const now = Date.now();
    const cooldown = Math.max(TRAINING_COOLDOWN, settings.interval || 0);
    const last = user.lastTrainingTime || 0;
    const ready = cooldown <= 0 || now - last >= cooldown;
    const remaining = ready ? 0 : Math.ceil((cooldown - (now - last)) / (60 * 1e3));
    const currentLevel = Math.max(1, user.trainingLevel || 1);
    const { baseCost, dynamicCost, totalCost } = resolveTrainingCost(settings, currentLevel, user.price);
    const boostPreview = resolveTrainingBoost(settings, currentLevel, user.price);
    const dateKey = getTrainingDateKey(now);
    const attemptsToday = user.trainingDailyDate === dateKey ? user.trainingDailyCount || 0 : 0;
    const remainingAttempts = Math.max(0, TRAINING_DAILY_LIMIT - attemptsToday);
    return `=== 培训状态 ===
📚 当前训练等级：${currentLevel}
💸 下一次费用：${totalCost} 金币（基础${baseCost} + 动态${dynamicCost}）
🏋️ 预计收益：身价 +${boostPreview} 金币
⏳ 下次可训练：${ready ? "随时可以" : `${remaining}分钟后`}
🎯 今日剩余尝试次数：${remainingAttempts}/${TRAINING_DAILY_LIMIT}`;
  }

  async function trainUser(ctx, config, session, targetInput) {
    const master = await getUser6(ctx, session.userId, session);
    if (typeof master === "string") return registrationGuide();

    // Resolve target (slave)
    const targetUser = targetInput
      ? await resolveTargetUser(ctx, session, targetInput)
      : null;

    if (!targetUser) {
      return "🔍 请指定要培训的牛马，例如：培训 @某人";
    }

    if (targetUser.employer !== master.userId) {
      return "🚫 这不是你的牛马，无法进行培训。";
    }

    const user = targetUser; // The one being trained is the slave
    const settings = getTrainingSettings(config);
    const now = Date.now();

    // Check cooldown on the SLAVE (or Master? Usually limit per slave makes sense)
    // Let's stick to limit per slave as per original logic structure, but check slave's data
    const cooldown = Math.max(TRAINING_COOLDOWN, settings.interval || 0);
    const last = user.lastTrainingTime || 0;
    if (cooldown > 0 && now - last < cooldown) {
      const remaining = Math.ceil((cooldown - (now - last)) / (60 * 1e3));
      return `⏳ 该牛马正在休息，再等${remaining}分钟吧。`;
    }

    const dateKey = getTrainingDateKey(now);
    let dailyCount = user.trainingDailyDate === dateKey ? user.trainingDailyCount || 0 : 0;
    if (dailyCount >= TRAINING_DAILY_LIMIT) {
      return `📅 该牛马今日训练次数已达上限（${TRAINING_DAILY_LIMIT}次），明天再继续努力吧。`;
    }

    const currentLevel = Math.max(1, user.trainingLevel || 1);
    const { totalCost, baseCost, dynamicCost } = resolveTrainingCost(settings, currentLevel, user.price);

    // Deduct from MASTER
    const cover = await ensureSufficientBalance(ctx, master, totalCost, {});
    const payer = cover.user;
    const notice = cover.notice ? `\n${cover.notice}` : "";

    if (payer.balance < totalCost) {
      return `💰 本次培训需要${totalCost}金币，你的余额不足。${notice}`;
    }

    const priceGain = resolveTrainingBoost(settings, currentLevel, user.price);
    const nextLevel = currentLevel + 1;
    const updatedBalance = payer.balance - totalCost;

    // Update Master Balance
    await ctx.database.set("player_market_users", { userId: payer.userId }, {
      balance: updatedBalance
    });

    await transactionService?.logTransaction(ctx, { ...payer, balance: updatedBalance }, {
      direction: "expense",
      category: transactionService?.categories.TRAINING,
      amount: totalCost,
      description: `培训牛马 ${user.nickname}`,
      balanceAfter: updatedBalance
    });

    const successRate = Math.max(0, 1 - (currentLevel - 1) * 0.1);
    const succeeded = Math.random() < successRate;

    const updates = {
      trainingCost: (user.trainingCost || 0) + totalCost,
      lastTrainingTime: now,
      trainingDailyDate: dateKey,
      trainingDailyCount: dailyCount + 1
    };

    if (succeeded) {
      updates.price = user.price + priceGain;
      updates.trainingLevel = nextLevel;
    }

    // Update Slave Stats
    await ctx.database.set("player_market_users", { userId: user.userId }, updates);

    if (!succeeded) {
      return `❌ 培训失败！本次消耗${totalCost}金币，成功率 ${(successRate * 100).toFixed(0)}%，失败不退款。\n当前训练等级：${currentLevel}${notice}`;
    }

    const gainTip = priceGain > 0 ? `\n🏋️ 身价提升：+${priceGain} 金币` : "";
    return `✅ 培训完成！当前训练等级：${nextLevel}\n💸 费用：${totalCost} 金币${gainTip}${notice}`;
  }

  function registerWelfareCommands(ctx, config) {
    const command = ctx.command("大牛马时代");
    command.subcommand("领取福报", "收取积累的福报收益").action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      return await respond(await claimWelfare(ctx, config, session));
    });
    command.subcommand("福报状态", "查看福报等级与冷却").action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      return await respond(await getWelfareStatus(ctx, config, session));
    });
    command.subcommand("培训 [target:string]", "支付金币提升牛马身价").action(async ({ session }, target) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      return await respond(await trainUser(ctx, config, session, target));
    });
    command.subcommand("培训状态", "查看训练等级、费用与冷却").action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      return await respond(await getTrainingStatus(ctx, config, session));
    });
  }

  return { registerWelfareCommands };
}

module.exports = { createWelfareModule };
