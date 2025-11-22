const { normalizeIdentifier } = require("../utils/playerHelpers");
const { ensureSufficientBalance } = require("../utils/economy");
const { isWealthProtected, invalidateWealthCache } = require("../utils/wealthProtection");

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
    transactionService
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

  function clampRatio(value, fallback = 0.3) {
    const number = Number.isFinite(value) ? Number(value) : fallback;
    return Math.min(1, Math.max(0, number));
  }

  function resolveRobStrategy(config) {
    const base = {
      成功率: config.抢劫成功率 ?? 0.3,
      抢夺比例: 0.3,
      惩罚比例: 0.2,
    };
    const strategies =
      Array.isArray(config?.抢劫策略) && config.抢劫策略.length ? config.抢劫策略.filter(Boolean) : [];
    const picked = strategies[0] ?? {};
    return {
      成功率: clampRatio(picked.成功率, base.成功率),
      抢夺比例: clampRatio(picked.抢夺比例, base.抢夺比例),
      惩罚比例: clampRatio(picked.惩罚比例, base.惩罚比例),
    };
  }

  function resolveRobJailProbability(config) {
    const jailConfig = config?.监狱系统 ?? {};
    const value = jailConfig.抢劫入狱概率;
    if (value == null) return 0.5;
    return Math.min(1, Math.max(0, Number(value)));
  }

  async function trySendRobberToJail(ctx, config, robber, options = {}) {
    if (!robber || robber.isInJail) return "";
    const probability = resolveRobJailProbability(config);
    if (probability <= 0) return "";
    if (Math.random() >= probability) return "";
    await ctx.database.set("player_market_users", { userId: robber.userId }, {
      isInJail: true,
      jailStartTime: Date.now(),
      jailReason: "抢劫失败被捕",
      jailWorkIncome: 0,
      jailWorkCount: 0,
      lastJailWorkTime: 0,
      lastJailVictimId: options?.victimId || "",
    });
    robber.isInJail = true;
    return "🚓 抢劫失败被逮捕，你被关进监狱了！输入“监狱状态”查看情况。";
  }

  async function robUser(ctx, config, session, targetId) {
    const robber = await getUser2(ctx, session.userId, session);
    if (!robber) return registrationGuide();
    const victimUsers = await ctx.database.get("player_market_users", { userId: targetId });
    if (!victimUsers.length) return `🔍 这位玩家还没入册，别撬不存在的钱包！`;
    const victim = victimUsers[0];
    const now = Date.now();
    const privileged = isAdmin(ctx, config, robber.userId, session);
    const victimProtected = await isWealthProtected(ctx, session, victim);
    if (!privileged && victimProtected) {
      return `⚠️ ${victim.nickname} 属于系统保护对象（资产排名后 50%），换个更有钱的人再试吧！`;
    }
    const isVip = robber.vipEndTime > Date.now();
    if (!privileged && !isVip && now - robber.lastRobTime < config.抢劫冷却) {
      const remainingTime = Math.ceil((config.抢劫冷却 - (now - robber.lastRobTime)) / 1e3 / 60);
      return `抢劫CD中，还需要等待${remainingTime}分钟`;
    }
    const strategy = resolveRobStrategy(config);
    const success = privileged || Math.random() < (strategy?.成功率 ?? config.抢劫成功率);
    if (success) {
      let amount = Math.floor(victim.balance * (strategy?.抢夺比例 ?? 0.3));
      if (amount <= 0) {
        amount = Math.min(victim.balance, config.初始余额);
      }
      amount = Math.max(1, amount);
      const victimBalance = Math.max(0, victim.balance - amount);
      await ctx.database.set("player_market_users", { userId: victim.userId }, {
        balance: victimBalance,
      });
      victim.balance = victimBalance;
      await transactionService?.logTransaction(ctx, { ...victim }, {
        direction: "expense",
        category: transactionService?.categories.ROB_LOSS,
        amount,
        description: `被${robber.nickname}抢劫`,
        balanceAfter: victimBalance,
        relatedUserId: robber.userId
      });
      const robberBalance = robber.balance + amount;
      await ctx.database.set("player_market_users", { userId: robber.userId }, {
        balance: robberBalance,
        lastRobTime: now,
      });
      robber.balance = robberBalance;
      robber.lastRobTime = now;
      await transactionService?.logTransaction(ctx, { ...robber }, {
        direction: "income",
        category: transactionService?.categories.ROB_GAIN,
        amount,
        description: `从${victim.nickname}抢得`,
        balanceAfter: robberBalance,
        relatedUserId: victim.userId
      });
      const stats = await ctx.database.get("game_statistics", {});
      if (stats.length) {
        await ctx.database.set("game_statistics", {}, {
          totalRobAmount: stats[0].totalRobAmount + amount,
        });
      }
      invalidateWealthCache(session);
      return `抢劫成功！从${victim.nickname}那里抢到了${amount}`;
    } else {
      const penaltyRatio = strategy?.惩罚比例 ?? 0.2;
      const penaltyBase = Math.max(robber.balance, config?.初始余额 ?? robber.balance);
      const penalty = Math.max(1, Math.floor(penaltyBase * penaltyRatio));
      const actualPenalty = penalty;
      const robberBalance = robber.balance - actualPenalty; // 允许透支，后续收入补回
      await ctx.database.set("player_market_users", { userId: robber.userId }, {
        balance: robberBalance,
        lastRobTime: now,
      });
      robber.balance = robberBalance;
      robber.lastRobTime = now;
      await transactionService?.logTransaction(ctx, { ...robber }, {
        direction: "expense",
        category: transactionService?.categories.ROB_PENALTY,
        amount: actualPenalty,
        description: "抢劫失败",
        balanceAfter: robberBalance,
        relatedUserId: victim.userId
      });
      const jailTip = await trySendRobberToJail(ctx, config, robber, { victimId: victim.userId });
      const penaltyTip = robberBalance < 0 ? `（余额不足，已扣至${robberBalance}，未来收入将优先抵扣）` : "";
      invalidateWealthCache(session);
      return `抢劫失败！损失了${actualPenalty}${penaltyTip}${jailTip ? `\n${jailTip}` : ""}`;
    }
  }

  async function redeem(ctx, config, session) {
    const forceConfig = getForceTradeConfig(config);
    let slave = await getUser2(ctx, session.userId, session);
    if (!slave) return null;
    if (!slave.employer) {
      return "🙅 你根本不是牛马，赎什么身？先去找个主人吧";
    }
    slave = await normalizeForceTradeState(ctx, slave, forceConfig);
    const master = await getUser2(ctx, slave.employer, session, true);
    if (!master) return null;
    const multiplier =
      forceConfig.启用 && forceConfig.赎身共享倍率
        ? calculateForceTradeMultiplier(slave, forceConfig, { applyNext: true })
        : 1;
    const ransomAmount = Math.max(1, Math.floor(slave.price * multiplier));
    let autoWithdrawNotice = "";
    const cover = await ensureSufficientBalance(ctx, slave, ransomAmount);
    slave = cover.user;
    autoWithdrawNotice = cover.notice;
    if (slave.balance < ransomAmount) {
      const notice = autoWithdrawNotice ? `\n${autoWithdrawNotice}` : "";
      return `🙅 赎身要${ransomAmount}金币，可你只有${slave.balance}，先把钱包填满再说${notice}`;
    }
    const slaveBalance = slave.balance - ransomAmount;
    await ctx.database.set("player_market_users", { userId: slave.userId }, {
      balance: slaveBalance,
      employer: "",
    });
    await transactionService?.logTransaction(ctx, { ...slave, balance: slaveBalance }, {
      direction: "expense",
      category: transactionService?.categories.RANSOM_PAY,
      amount: ransomAmount,
      description: `赎身支付给 ${master.nickname}`,
      balanceAfter: slaveBalance,
      relatedUserId: master.userId
    });
    const masterBalance = master.balance + ransomAmount;
    await ctx.database.set("player_market_users", { userId: master.userId }, {
      balance: masterBalance,
      employeeCount: Math.max(0, master.employeeCount - 1),
    });
    await transactionService?.logTransaction(ctx, { ...master, balance: masterBalance }, {
      direction: "income",
      category: transactionService?.categories.RANSOM_INCOME,
      amount: ransomAmount,
      description: `${slave.nickname} 赎身收入`,
      balanceAfter: masterBalance,
      relatedUserId: slave.userId
    });
    if (forceConfig.启用 && forceConfig.赎身共享倍率) {
      await increaseForceTradeStreak(ctx, slave, forceConfig);
    }
    const multiplierTip = multiplier > 1 ? `（倍率 x${multiplier.toFixed(2)}）` : "";
    const notice = autoWithdrawNotice ? `\n${autoWithdrawNotice}` : "";
    return `✅ 赎身成功！\n💰 支付赎金：${ransomAmount}金币${multiplierTip}\n👑 牛马主：${master.nickname}${notice}`;
  }

  async function release(ctx, config, session, target) {
    const master = await getUser2(ctx, session.userId, session);
    if (!master) return null;
    const slave = await getUser2(ctx, target, session, true);
    if (!slave) return null;
    const privileged = isAdmin(ctx, config, master.userId, session);
    if (!privileged && slave.employer !== master.userId) {
      return "🚫 你没这头牛马的抚养权，别乱放生";
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
        return await respond("🔍 没找到这位牛马，名字再核对下");
      }
      const owner = await getUser2(ctx, session.userId, session);
      if (!owner) return await respond(registrationGuide());
      if (targetUser.employer !== owner.userId) {
        return await respond("🚫 这头牛马又不归你，别乱动");
      }
      return await respond(`=== ${targetUser.nickname}的状态 ===
💰 当前余额：${targetUser.balance}
💵 当前身价：${targetUser.price}
🏦 银行存款：${targetUser.deposit}/${targetUser.depositLimit}
💳 信用等级：${targetUser.creditLevel}
💸 累计福报：${targetUser.welfareIncome}
📚 培训等级：${targetUser.trainingLevel}
💎 福报等级：${targetUser.welfareLevel}`);
    });

    slaveCommand.subcommand("购买玩家 [target:string]", "购买指定玩家").action(async ({ session }, targetInput) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
      if (taxCheck) return await respond(taxCheck);
      try {
        let employer = await getUser2(ctx, session.userId, session);
        if (!employer) return await respond(registrationGuide());
        const privileged = isAdmin(ctx, config, employer.userId, session);
        const forceConfig = getForceTradeConfig(config);
        let targetUser = await resolveTargetUser(ctx, session, targetInput);
        if (!targetUser) {
          return await respond("🔍 没定位到目标，@一下或把昵称写完整");
        }
        if (forceConfig.启用) {
          targetUser = await normalizeForceTradeState(ctx, targetUser, forceConfig);
        }
        if (targetUser.userId === employer.userId) {
          return await respond("🤦 自己买自己？精神分裂式投资就免了");
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
        if (!privileged && targetUser.bodyguardEndTime > Date.now()) {
          const guard = bodyguardData.bodyguards.find((g) => g.level === targetUser.bodyguardLevel);
          if (guard && (guard.protectType === "hire" || guard.protectType === "both")) {
            return await respond("该玩家正在被保镖保护，无法购买");
          }
        }
        let autoWithdrawNotice = "";
        if (!privileged) {
          const cover = await ensureSufficientBalance(ctx, employer, purchasePrice, { privileged });
          employer = cover.user;
          autoWithdrawNotice = cover.notice;
        }
        if (!privileged && employer.balance < purchasePrice) {
          const notice = autoWithdrawNotice ? `\n${autoWithdrawNotice}` : "";
          return await respond(`余额不足，需要${purchasePrice}金币${notice}`);
        }
        const previousOwner = privileged ? targetUser.employer : null;
        if (!privileged) {
          const employerBalance = employer.balance - purchasePrice;
          await ctx.database.set("player_market_users", { userId: employer.userId }, {
            balance: employerBalance,
          });
          employer.balance = employerBalance;
          await transactionService?.logTransaction(ctx, { ...employer }, {
            direction: "expense",
            category: transactionService?.categories.PURCHASE,
            amount: purchasePrice,
            description: `购买 ${targetUser.nickname}`,
            balanceAfter: employerBalance,
            relatedUserId: targetUser.userId
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
        const notice = autoWithdrawNotice ? `\n${autoWithdrawNotice}` : "";
        return await respond(`✅ 购买成功！
💰 花费：${purchasePrice}金币${multiplierTip}
👥 新牛马：${targetUser.nickname}${notice}`);
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
      let employer = await getUser2(ctx, session.userId, session);
      if (!employer) return await respond(registrationGuide());
      const privileged = isAdmin(ctx, config, employer.userId, session);
      let targetUser = await resolveTargetUser(ctx, session, targetInput);
      if (!targetUser) {
        return await respond("🔍 没定位到目标，@一下或把昵称写完整");
      }
      if (targetUser.userId === employer.userId) {
        return await respond("🤦 抢自己也想出风头？省省吧");
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
      let autoWithdrawNotice = "";
      if (!privileged) {
        const cover = await ensureSufficientBalance(ctx, employer, forcedPrice, { privileged });
        employer = cover.user;
        autoWithdrawNotice = cover.notice;
      }
      if (!privileged && employer.balance < forcedPrice) {
        const notice = autoWithdrawNotice ? `\n${autoWithdrawNotice}` : "";
        return await respond(`😅 想花${forcedPrice}金币抢人，可余额不够，先去赚钱吧${notice}`);
      }
      const previousOwner = targetUser.employer ? await getUser2(ctx, targetUser.employer, session, true) : null;
      if (!privileged) {
        const employerBalance = employer.balance - forcedPrice;
        await ctx.database.set("player_market_users", { userId: employer.userId }, {
          balance: employerBalance,
        });
        employer.balance = employerBalance;
        await transactionService?.logTransaction(ctx, { ...employer }, {
          direction: "expense",
          category: transactionService?.categories.FORCE_PURCHASE,
          amount: forcedPrice,
          description: `强制抢走 ${targetUser.nickname}`,
          balanceAfter: employerBalance,
          relatedUserId: previousOwner?.userId || ""
        });
      }
      if (previousOwner && previousOwner.userId !== employer.userId) {
        const ownerUpdates = {
          employeeCount: Math.max(0, previousOwner.employeeCount - 1),
        };
        // 移除给原主人的补偿逻辑，系统回收金币
        // previousBalance = previousOwner.balance + forcedPrice;
        // ownerUpdates.balance = previousBalance;
        // previousOwner.balance = previousBalance;

        await ctx.database.set("player_market_users", { userId: previousOwner.userId }, ownerUpdates);
        if (!privileged) {
          /* 
          await transactionService?.logTransaction(ctx, { ...previousOwner }, {
            direction: "income",
            category: transactionService?.categories.FORCE_COMPENSATION,
            amount: forcedPrice,
            description: `${targetUser.nickname} 被强制买走补偿`,
            balanceAfter: previousOwner.balance,
            relatedUserId: employer.userId
          });
          */
        }
      }

      await ctx.database.set("player_market_users", { userId: targetUser.userId }, {
        employer: employer.userId,
      });
      await ctx.database.set("player_market_users", { userId: employer.userId }, {
        employeeCount: employer.employeeCount + 1,
      });
      await increaseForceTradeStreak(ctx, targetUser, forceConfig);
      const ownerLabel = previousOwner ? previousOwner.nickname : "系统";
      const notice = autoWithdrawNotice ? `\n${autoWithdrawNotice}` : "";
      return await respond(`✅ 抢牛马成功！\n💰 花费：${forcedPrice}金币（倍率 x${multiplier.toFixed(2)}）\n👑 新牛马主：${employer.nickname}\n📤 原牛马主：${ownerLabel}${notice}`);
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
        return await respond("🔍 没定位到目标，@一下或把昵称写完整");
      }
      return await respond(await release(ctx, config, session, targetUser.userId));
    });

    slaveCommand
      .subcommand("抢劫 [target:string]", "抢劫指定用户的余额（有失败风险）")
      .alias("打劫")
      .alias("抢钱")
      .action(async ({ session }, target) => {
        const respond = setupMessageRecall(session, ctx, config, "general");
        const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
        if (taxCheck) return await respond(taxCheck);
        const normalizedTarget = normalizeIdentifier(target);
        const targetUser = await resolveTargetUser(ctx, session, normalizedTarget);
        if (!targetUser) {
          return await respond("🔍 没定位到目标，@一下或把昵称写完整");
        }
        if (targetUser.userId === session.userId) {
          return await respond("🤦 抢劫自己？这戏太尬了");
        }
        return await respond(await robUser(ctx, config, session, targetUser.userId));
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
