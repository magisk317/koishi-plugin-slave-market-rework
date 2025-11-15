const { normalizeIdentifier } = require("../utils/playerHelpers");

function createMarketModule(deps) {
  const {
    setupMessageRecall,
    checkTaxBeforeCommand,
    registrationGuide,
    isAdmin,
    bodyguardData,
    work,
    getUser2,
    createScopeFilter,
    resolveTargetUser,
  } = deps;

  function formatMarketList(users) {
    const freeUsers = users.filter((user) => !user.employer);
    if (!freeUsers.length) return "市场目前没有可购买的牛马 🐂🐎";
    const list = freeUsers.map((user) => `${user.nickname} - 身价: ${user.price}`);
    return `=== 牛马市场 🐂🐎 ===\n${list.join("\n")}`;
  }

  function formatEmployeeList(employees) {
    if (!employees.length) return "你还没有牛马 🐂🐎";
    const list = employees.map((emp) => `${emp.nickname} - 身价: ${emp.price}`).join("\n");
    return `=== 你的牛马列表 🐂🐎 ===\n${list}`;
  }

  function resolveRobStrategy(config, name) {
    const strategies =
      Array.isArray(config?.抢劫策略) && config.抢劫策略.length
        ? config.抢劫策略
        : [
            {
              名称: "标准",
              描述: "默认策略",
              成功率: config.抢劫成功率 ?? 0.3,
              抢夺比例: 0.3,
              惩罚比例: 0.2,
            },
          ];
    if (name) {
      const found = strategies.find((item) => item.名称 === name);
      if (found) return found;
    }
    return strategies[0];
  }

  async function robUser(ctx, config, session, targetId, strategyName) {
    const robber = await getUser2(ctx, session.userId, session);
    if (!robber) return registrationGuide();
    const victimUsers = await ctx.database.get("player_market_users", { userId: targetId });
    if (!victimUsers.length) return `❌ 目标玩家未注册！`;
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
        balance: victim.balance - amount,
      });
      await ctx.database.set("player_market_users", { userId: robber.userId }, {
        balance: robber.balance + amount,
        lastRobTime: now,
      });
      const stats = await ctx.database.get("game_statistics", {});
      if (stats.length) {
        await ctx.database.set("game_statistics", {}, {
          totalRobAmount: stats[0].totalRobAmount + amount,
        });
      }
      return `抢劫成功（${strategy.名称}）！从${victim.nickname}那里抢到了${amount}`;
    } else {
      const penaltyRatio = strategy?.惩罚比例 ?? 0.2;
      const penalty = Math.max(1, Math.floor(robber.balance * penaltyRatio));
      await ctx.database.set("player_market_users", { userId: robber.userId }, {
        balance: Math.max(0, robber.balance - penalty),
        lastRobTime: now,
      });
      return `抢劫失败（${strategy.名称}）！损失了${penalty}`;
    }
  }

  async function redeem(ctx, config, session) {
    const slave = await getUser2(ctx, session.userId, session);
    if (!slave) return null;
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
      employer: "",
    });
    await ctx.database.set("player_market_users", { userId: master.userId }, {
      balance: master.balance + ransomAmount,
      employeeCount: Math.max(0, master.employeeCount - 1),
    });
    return `✅ 赎身成功！\n💰 支付赎金：${ransomAmount}金币\n👑 牛马主：${master.nickname}`;
  }

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
    await ctx.database.set("player_market_users", { userId: slave.userId }, { employer: "" });
    if (privileged && originalOwner && originalOwner !== master.userId) {
      const realMaster = await getUser2(ctx, originalOwner, session, true);
      if (realMaster) {
        await ctx.database.set("player_market_users", { userId: realMaster.userId }, {
          employeeCount: Math.max(0, realMaster.employeeCount - 1),
        });
      }
    } else {
      await ctx.database.set("player_market_users", { userId: master.userId }, {
        employeeCount: Math.max(0, master.employeeCount - 1),
      });
    }
    return `✅ 放生成功！已解除与${slave.nickname}的购买关系`;
  }

  function registerMarketCommands(ctx, config) {
    const slaveCommand = ctx.command("大牛马时代");

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
      const employees = await ctx.database.get("player_market_users", { employer: owner.userId });
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
      if (!owner) return await respond(registrationGuide());
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

    slaveCommand.subcommand("购买玩家 [target:string]", "购买指定玩家").action(async ({ session }, targetInput) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
      if (taxCheck) return await respond(taxCheck);
      try {
        const employer = await getUser2(ctx, session.userId, session);
        if (!employer) return await respond(registrationGuide());
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
            balance: employer.balance - targetUser.price,
          });
        }
        if (privileged && previousOwner && previousOwner !== employer.userId) {
          const prevMaster = await getUser2(ctx, previousOwner, session, true);
          if (prevMaster) {
            await ctx.database.set("player_market_users", { userId: prevMaster.userId }, {
              employeeCount: Math.max(0, prevMaster.employeeCount - 1),
            });
          }
        }
        await ctx.database.set("player_market_users", { userId: targetUser.userId }, {
          employer: employer.userId,
        });
        await ctx.database.set("player_market_users", { userId: employer.userId }, {
          employeeCount: employer.employeeCount + 1,
        });
        return await respond(`✅ 购买成功！
💰 花费：${targetUser.price}金币
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

    slaveCommand.subcommand("放生 [target:string]", "无条件解除与指定牛马的购买关系").action(async ({ session }, target) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
      if (taxCheck) return await respond(taxCheck);
      const targetUser = await resolveTargetUser(ctx, session, target);
      if (!targetUser) {
        return await respond("❌ 找不到该玩家，请@对方或输入昵称");
      }
      return await respond(await release(ctx, config, session, targetUser.userId));
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
      return await respond(await robUser(ctx, config, session, targetUser.userId, strategyName));
    });

    slaveCommand.subcommand("打工", "打工赚钱，牛马主可获得额外收入").action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
      if (taxCheck) return await respond(taxCheck);
      return await respond(await work(ctx, config, session));
    });
  }

  return { registerMarketCommands };
}

module.exports = { createMarketModule };
