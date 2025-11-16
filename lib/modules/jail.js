const { Random } = require("koishi");
const { creditSystemAccount } = require("../utils/economy");

function createJailModule(deps) {
  const { setupMessageRecall, checkTaxBeforeCommand, getUser6, getScopeKey } = deps;

  function shuffleStrategies(strategies) {
    const copy = strategies.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
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
        const target = candidates.reduce((lowest, current) => (current.balance < lowest.balance ? current : lowest));
        await ctx.database.set("player_market_users", { userId: target.userId }, {
          balance: target.balance + amount,
        });
        return `💝 已将${amount}金币赠予最缺钱的玩家 ${target.nickname}`;
      },
      async () => {
        const victimId = prisoner.lastJailVictimId;
        if (!victimId) return null;
        const victims = await ctx.database.get("player_market_users", { userId: victimId });
        if (!victims.length) return null;
        const victim = victims[0];
        await ctx.database.set("player_market_users", { userId: victim.userId }, {
          balance: victim.balance + amount,
        });
        return `💗 已将${amount}金币赔偿给当初的受害者 ${victim.nickname}`;
      },
      async () => {
        const candidates = await getScopeCandidates(ctx, session, [prisoner.userId]);
        if (!candidates.length) return null;
        const recipient = candidates[Math.floor(Math.random() * candidates.length)];
        await ctx.database.set("player_market_users", { userId: recipient.userId }, {
          balance: recipient.balance + amount,
        });
        return `🧧 给群友 ${recipient.nickname} 发出一个${amount}金币的红包`;
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
      const totalIncome = updatedUser.jailWorkIncome;
      let payoutMessage = "";
      if (totalIncome > 0) {
        payoutMessage = await distributeJailIncome(ctx, session, updatedUser, totalIncome);
      }
      await ctx.database.set("player_market_users", { userId: user.userId }, {
        isInJail: false,
        jailStartTime: 0,
        jailReason: "",
        jailWorkIncome: 0,
        jailWorkCount: 0,
        lastJailWorkTime: 0,
        lastJailVictimId: "",
      });
      return `✅ 恭喜你！
💰 本次工作收入：${income}金币
💡 你已经完成所有工作，可以出狱了！${payoutMessage ? `\n${payoutMessage}` : ""}`;
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
