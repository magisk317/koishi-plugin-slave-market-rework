const { Random } = require("koishi");

function createJailModule(deps) {
  const { setupMessageRecall, checkTaxBeforeCommand, getUser6 } = deps;

  async function jailWork(ctx, config, session) {
    const user = await getUser6(ctx, session.userId, session);
    if (typeof user === "string") return user;
    if (!user.isInJail) {
      return "❌ 你不在监狱中，无法使用此命令";
    }
    const cooldown = Math.max(0, config?.监狱系统?.打工冷却 ?? 10 * 60 * 1e3);
    const now = Date.now();
    if (cooldown > 0 && user.lastJailWorkTime && now - user.lastJailWorkTime < cooldown) {
      const remaining = Math.ceil((cooldown - (now - user.lastJailWorkTime)) / (60 * 1e3));
      return `⏳ 监狱打工冷却中，还需等待${remaining}分钟`;
    }
    const baseIncome = Random.int(10, 50);
    const income = Math.floor(baseIncome * config.监狱系统.工作收入倍率);
    await ctx.database.set("player_market_users", { userId: user.userId }, {
      jailWorkIncome: user.jailWorkIncome + income,
      jailWorkCount: user.jailWorkCount + 1,
      lastJailWorkTime: now,
    });
    const updatedUser = await getUser6(ctx, session.userId, session);
    if (typeof updatedUser === "string") return updatedUser;
    if (updatedUser.jailWorkCount >= config.监狱系统.监狱打工次数上限) {
      await ctx.database.set("player_market_users", { userId: user.userId }, {
        isInJail: false,
        jailStartTime: 0,
        jailReason: "",
        jailWorkIncome: 0,
        jailWorkCount: 0,
      });
      return `✅ 恭喜你！
💰 本次工作收入：${income}金币
💡 你已经完成所有工作，可以出狱了！`;
    }
    return `✅ 工作完成！
💰 本次工作收入：${income}金币
💡 剩余工作次数：${config.监狱系统.监狱打工次数上限 - updatedUser.jailWorkCount}次`;
  }

  async function checkJailStatus(ctx, config, session) {
    const user = await getUser6(ctx, session.userId, session);
    if (typeof user === "string") return user;
    if (!user.isInJail) {
      return "✅ 你当前不在监狱中";
    }
    const remainingTime = Math.ceil(
      (user.jailStartTime + config.监狱系统.监狱打工间隔 * config.监狱系统.监狱打工次数上限 - Date.now()) /
        (60 * 1e3),
    );
    return `=== 监狱状态 ===
⏰ 剩余时间：${remainingTime}分钟
💸 监狱打工收入：${user.jailWorkIncome}金币
💡 剩余工作次数：${config.监狱系统.监狱打工次数上限 - user.jailWorkCount}次
💡 使用\"监狱打工\"来赚取收入`;
  }

  async function jailRoster(ctx, config, session) {
    const users = await ctx.database.get("player_market_users", { isInJail: true });
    if (!users.length) {
      return "监狱目前是空的";
    }
    const now = Date.now();
    const lines = users.map((user) => {
      const endTime = user.jailStartTime + config.监狱系统.监狱打工间隔 * config.监狱系统.监狱打工次数上限;
      const remainingTime = Math.ceil((endTime - now) / (60 * 1e3));
      return `${user.nickname} - 剩余${Math.max(0, remainingTime)}分钟`;
    });
    return `=== 监狱名单 ===\n${lines.join("\n")}`;
  }

  function registerJailCommands(ctx, config) {
    const slaveCommand = ctx.command("大牛马时代");
    slaveCommand.subcommand("监狱打工", "在监狱中打工").action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
      if (taxCheck) return await respond(taxCheck);
      return await respond(await jailWork(ctx, config, session));
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
