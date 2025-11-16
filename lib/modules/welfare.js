function createWelfareModule(deps) {
  const { setupMessageRecall, getUser6, registrationGuide } = deps;

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
    await ctx.database.set("player_market_users", { userId: user.userId }, {
      balance: user.balance + reward,
      welfareIncome: (user.welfareIncome || 0) + reward,
      lastWelfareTime: now,
    });
    return `✨ 福报到账！本次收获${reward}金币。\n🌟 当前福报等级：${user.welfareLevel || 1}\n📈 累计福报：${(user.welfareIncome || 0) + reward}金币`;
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
  }

  return { registerWelfareCommands };
}

module.exports = { createWelfareModule };
