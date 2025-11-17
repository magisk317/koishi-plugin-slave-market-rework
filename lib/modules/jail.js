const { Random } = require("koishi");
const { creditSystemAccount } = require("../utils/economy");

function createJailModule(deps) {
  const { setupMessageRecall, checkTaxBeforeCommand, getUser6, getScopeKey, transactionService } = deps;

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
        return `💝 【资金最少】把${amount}金币塞给最穷的 ${target.nickname}`;
      },
      async () => {
        const victimId = prisoner.lastJailVictimId;
        if (!victimId) return null;
        const victims = await ctx.database.get("player_market_users", { userId: victimId });
        if (!victims.length) return null;
        const victim = victims[0];
        const balanceAfter = victim.balance + amount;
        await ctx.database.set("player_market_users", { userId: victim.userId }, {
          balance: balanceAfter,
        });
        await transactionService?.logTransaction(ctx, { ...victim, balance: balanceAfter }, {
          direction: "income",
          category: transactionService?.categories.JAIL_DISTRIBUTION,
          amount,
          description: "受害者赔偿",
          balanceAfter,
          relatedUserId: prisoner.userId
        });
        return `💗 【受害者赔偿】赔给 ${victim.nickname} ${amount}金币`;
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
    const cooldown = Math.max(0, config?.监狱系统?.打工冷却 ?? 10 * 60 * 1e3);
    const now = Date.now();
    if (cooldown > 0 && user.lastJailWorkTime && now - user.lastJailWorkTime < cooldown) {
      const remaining = Math.ceil((cooldown - (now - user.lastJailWorkTime)) / (60 * 1e3));
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
    const cooldown = Math.max(0, config?.监狱系统?.打工冷却 ?? 10 * 60 * 1e3);
    const now = Date.now();
    const ready = !cooldown || !user.lastJailWorkTime || now - user.lastJailWorkTime >= cooldown;
    const remaining = ready ? 0 : Math.ceil((cooldown - (now - user.lastJailWorkTime)) / (60 * 1e3));
    return `=== 监狱状态 ===
💸 单次缝纫收益：100 - 150 金币
⏳ 下次可进行：${ready ? "随时" : `${remaining}分钟后`}
💡 使用"踩缝纫机"立即完成任务并离开监狱`;

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
