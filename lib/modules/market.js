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

  const FORCE_TRADE_DEFAULTS = {
    启用: true,
    初始倍率: 1,
    翻倍倍率: 2,
    重置策略: "time",
    重置时间: 6 * 60 * 60 * 1e3,
    重置次数: 10,
    最大翻倍次数: 10,
    忽略保镖: false,
    赎身共享倍率: true,
    提示命令: "抢牛马",
  };

  function getForceTradeConfig(config) {
    return { ...FORCE_TRADE_DEFAULTS, ...(config?.强制买卖 ?? {}) };
  }

  async function normalizeForceTradeState(ctx, user, forceConfig) {
    if (!forceConfig.启用 || !user) return user;
    const now = Date.now();
    let streak = user.forceTradeStreak ?? 0;
    let expiresAt = user.forceTradeExpiresAt ?? 0;
    let changed = false;
    if (forceConfig.重置策略 === "time") {
      if (streak > 0 && expiresAt && now > expiresAt) {
        streak = 0;
        expiresAt = 0;
        changed = true;
      }
    } else if (forceConfig.重置策略 === "count") {
      const limit = Math.max(0, forceConfig.重置次数 ?? 0);
      if (limit > 0 && streak >= limit) {
        streak = 0;
        expiresAt = 0;
        changed = true;
      }
    }
    if (changed) {
      await ctx.database.set("player_market_users", { userId: user.userId }, {
        forceTradeStreak: streak,
        forceTradeExpiresAt: expiresAt,
      });
      user.forceTradeStreak = streak;
      user.forceTradeExpiresAt = expiresAt;
    }
    return user;
  }

  function calculateForceTradeMultiplier(user, forceConfig, options = {}) {
    if (!forceConfig.启用 || !user) return 1;
    const streak = Math.max(0, user.forceTradeStreak ?? 0);
    const factor = forceConfig.翻倍倍率 ?? 2;
    const base = Math.max(1, forceConfig.初始倍率 ?? 1);
    const limit = Math.max(0, forceConfig.最大翻倍次数 ?? 0);
    const cappedStreak = limit > 0 ? Math.min(streak, limit) : streak;
    const exponentBase = options.applyNext ? cappedStreak + 1 : cappedStreak;
    const exponent = limit > 0 ? Math.min(exponentBase, limit) : exponentBase;
    if (exponent <= 0) return base;
    return Math.max(base, Math.pow(factor, exponent));
  }

  async function increaseForceTradeStreak(ctx, user, forceConfig) {
    if (!forceConfig.启用 || !user) return;
    const now = Date.now();
    const nextStreak = (user.forceTradeStreak ?? 0) + 1;
    const updates = {
      forceTradeStreak: nextStreak,
      forceTradeExpiresAt: 0,
    };
    if (forceConfig.重置策略 === "time") {
      const duration = Math.max(0, forceConfig.重置时间 ?? 0);
      updates.forceTradeExpiresAt = duration > 0 ? now + duration : 0;
    }
    await ctx.database.set("player_market_users", { userId: user.userId }, updates);
    user.forceTradeStreak = nextStreak;
    user.forceTradeExpiresAt = updates.forceTradeExpiresAt;
  }

  function resolveForceTradePrice(user, forceConfig, options = {}) {
    if (!forceConfig.启用) return user.price;
    const multiplier = calculateForceTradeMultiplier(user, forceConfig, options);
    return Math.max(1, Math.floor(user.price * multiplier));
  }

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
    const forceConfig = getForceTradeConfig(config);
    let slave = await getUser2(ctx, session.userId, session);
    if (!slave) return null;
    if (!slave.employer) {
      return "❌ 你不是牛马，无法赎身";
    }
    slave = await normalizeForceTradeState(ctx, slave, forceConfig);
    const master = await getUser2(ctx, slave.employer, session, true);
    if (!master) return null;
    const multiplier =
      forceConfig.启用 && forceConfig.赎身共享倍率
        ? calculateForceTradeMultiplier(slave, forceConfig, { applyNext: true })
        : 1;
    const ransomAmount = Math.max(1, Math.floor(slave.price * multiplier));
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
    if (forceConfig.启用 && forceConfig.赎身共享倍率) {
      await increaseForceTradeStreak(ctx, slave, forceConfig);
    }
    const multiplierTip = multiplier > 1 ? `（倍率 x${multiplier.toFixed(2)}）` : "";
    return `✅ 赎身成功！\n💰 支付赎金：${ransomAmount}金币${multiplierTip}\n👑 牛马主：${master.nickname}`;
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
        const forceConfig = getForceTradeConfig(config);
        let targetUser = await resolveTargetUser(ctx, session, targetInput);
        if (!targetUser) {
          return await respond("❌ 找不到该玩家，请@对方或输入昵称");
        }
        if (forceConfig.启用) {
          targetUser = await normalizeForceTradeState(ctx, targetUser, forceConfig);
        }
        if (targetUser.userId === employer.userId) {
          return await respond("❌ 你不能购买自己");
        }
        if (targetUser.employer && !privileged) {
          if (forceConfig.启用) {
            const multiplier = calculateForceTradeMultiplier(targetUser, forceConfig, { applyNext: true });
            const forcedPrice = Math.max(1, Math.floor(targetUser.price * Math.max(1, multiplier)));
            const forceCommandName = forceConfig.提示命令 || "抢牛马";
            let ownerTip = "该玩家已经是别人的牛马了";
            if (targetUser.employer) {
              const owner = await getUser2(ctx, targetUser.employer, session, true);
              if (owner) ownerTip = `当前牛马主：${owner.nickname}`;
            }
            return await respond(`⚠️ ${ownerTip}\n💡 你可以输入「${forceCommandName} ${targetUser.nickname}」支付 ${forcedPrice} 金币（倍率 x${multiplier.toFixed(2)}）强制抢走。`);
          }
          return await respond("该玩家已经是别人的牛马了");
        }
        let purchasePrice = targetUser.price;
        let multiplierTip = "";
        if (!targetUser.employer && forceConfig.启用 && (targetUser.forceTradeStreak ?? 0) > 0) {
          purchasePrice = resolveForceTradePrice(targetUser, forceConfig);
          const multiplier = purchasePrice / Math.max(1, targetUser.price);
          multiplierTip = multiplier > 1 ? `（倍率 x${multiplier.toFixed(2)}）` : "";
        }
        purchasePrice = Math.max(1, Math.floor(purchasePrice));
        if (!privileged && employer.balance < purchasePrice) {
          return await respond(`余额不足，需要${purchasePrice}金币`);
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
            balance: employer.balance - purchasePrice,
          });
          employer.balance -= purchasePrice;
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
💰 花费：${purchasePrice}金币${multiplierTip}
👥 新牛马：${targetUser.nickname}`);
      } catch (error) {
        return await respond("购买失败，请稍后重试");
      }
    });

    slaveCommand.subcommand("抢牛马 <target:string>", "支付翻倍价格强制抢走别人的牛马").action(async ({ session }, targetInput) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
      if (taxCheck) return await respond(taxCheck);
      const forceConfig = getForceTradeConfig(config);
      if (!forceConfig.启用) {
        return await respond("⚠️ 当前未开启强制买卖功能");
      }
      const employer = await getUser2(ctx, session.userId, session);
      if (!employer) return await respond(registrationGuide());
      const privileged = isAdmin(ctx, config, employer.userId, session);
      let targetUser = await resolveTargetUser(ctx, session, targetInput);
      if (!targetUser) {
        return await respond("❌ 找不到该玩家，请@对方或输入昵称");
      }
      if (targetUser.userId === employer.userId) {
        return await respond("❌ 不能抢自己");
      }
      targetUser = await normalizeForceTradeState(ctx, targetUser, forceConfig);
      if (!targetUser.employer && !privileged) {
        return await respond("该玩家目前是自由身，直接使用「购买玩家」即可");
      }
      if (!privileged && !forceConfig.忽略保镖 && targetUser.bodyguardEndTime > Date.now()) {
        const guard = bodyguardData.bodyguards.find((g) => g.level === targetUser.bodyguardLevel);
        if (guard && (guard.protectType === "hire" || guard.protectType === "both")) {
          return await respond("该玩家正在被保镖保护，暂无法强抢");
        }
      }
      const multiplier = calculateForceTradeMultiplier(targetUser, forceConfig, { applyNext: true });
      const forcedPrice = Math.max(1, Math.floor(targetUser.price * Math.max(1, multiplier)));
      if (!privileged && employer.balance < forcedPrice) {
        return await respond(`❌ 余额不足，需要${forcedPrice}金币`);
      }
      const previousOwner = targetUser.employer ? await getUser2(ctx, targetUser.employer, session, true) : null;
      if (!privileged) {
        await ctx.database.set("player_market_users", { userId: employer.userId }, {
          balance: employer.balance - forcedPrice,
        });
        employer.balance -= forcedPrice;
      }
      if (previousOwner && previousOwner.userId !== employer.userId) {
        const ownerUpdates = {
          employeeCount: Math.max(0, previousOwner.employeeCount - 1),
        };
        if (!privileged) {
          ownerUpdates.balance = previousOwner.balance + forcedPrice;
          previousOwner.balance += forcedPrice;
        }
        await ctx.database.set("player_market_users", { userId: previousOwner.userId }, ownerUpdates);
      }
      await ctx.database.set("player_market_users", { userId: targetUser.userId }, {
        employer: employer.userId,
      });
      await ctx.database.set("player_market_users", { userId: employer.userId }, {
        employeeCount: employer.employeeCount + 1,
      });
      await increaseForceTradeStreak(ctx, targetUser, forceConfig);
      const ownerLabel = previousOwner ? previousOwner.nickname : "系统";
      return await respond(`✅ 抢牛马成功！\n💰 花费：${forcedPrice}金币（倍率 x${multiplier.toFixed(2)}）\n👑 新牛马主：${employer.nickname}\n📤 原牛马主：${ownerLabel}`);
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
