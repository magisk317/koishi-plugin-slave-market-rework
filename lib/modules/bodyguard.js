const bodyguardData = {
  bodyguards: [
    {
      id: "guard_1",
      name: "初级保镖",
      level: 1,
      price: 2e3,
      duration: 2 * 60 * 60 * 1e3,
      description: "提供2小时基础保护，防止被抢劫",
      protectType: "rob"
    },
    {
      id: "guard_2",
      name: "中级保镖",
      level: 2,
      price: 5e3,
      duration: 4 * 60 * 60 * 1e3,
      description: "提供4小时加强保护，防止被购买",
      protectType: "hire"
    },
    {
      id: "guard_3",
      name: "高级保镖",
      level: 3,
      price: 1e4,
      duration: 8 * 60 * 60 * 1e3,
      description: "提供8小时高级保护，防止被抢劫和购买",
      protectType: "both"
    }
  ]
};

function createBodyguardModule(deps) {
  const {
    setupMessageRecall,
    checkTaxBeforeCommand,
    isAdmin,
    formatCostTip,
    getUser,
    registrationGuide
  } = deps;

  async function resolveUser(ctx, session) {
    const user = await getUser(ctx, session.userId, session);
    if (!user) return registrationGuide();
    return user;
  }

  async function bodyguardMarket(ctx, config, session) {
    const user = await resolveUser(ctx, session);
    if (typeof user === "string") return user;
    let message = "🛡️ === 保镖市场 === 🛡️\n\n";
    bodyguardData.bodyguards.forEach((guard) => {
      const status = user.bodyguardLevel >= guard.level ? "✅ 已雇佣" : "🆕 可雇佣";
      message += `${guard.name} (${guard.price}金币)\n`;
      message += `📝 ${guard.description}\n`;
      message += `🔖 状态：${status}\n\n`;
    });
    if (user.bodyguardEndTime > Date.now()) {
      const remainingTime = Math.ceil((user.bodyguardEndTime - Date.now()) / (60 * 60 * 1e3));
      message += `\n💡 当前保镖保护剩余时间：${remainingTime}小时`;
    }
    message += '\n💡 使用"雇佣保镖 [保镖名称]"来雇佣保镖';
    return message;
  }

  async function hireBodyguard(ctx, config, session, guardName) {
    const user = await resolveUser(ctx, session);
    if (typeof user === "string") return user;
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

  async function bodyguardStatus(ctx, config, session) {
    const user = await resolveUser(ctx, session);
    if (typeof user === "string") return user;
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

  function registerBodyguardCommands(ctx, config) {
    const slaveCommand = ctx.command("大牛马时代");
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
  }

  return {
    registerBodyguardCommands,
    bodyguardData
  };
}

module.exports = { createBodyguardModule };
