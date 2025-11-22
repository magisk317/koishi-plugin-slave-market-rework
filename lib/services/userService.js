const {
  resolveGroupCard,
  resolveNickname,
  registrationGuide,
  registrationShortGuide,
  getSessionScopedUserId,
  getScopeKey,
  buildScopedId,
  ensureScopedId,
  calculateRegistrationBonus
} = require("../utils/playerHelpers");

function createUserService(options) {
  const {
    isAdmin,
    getIsAdmin,
    sendWithRecall,
    ADMIN_VIP_END_TIME,
    getRuntimeConfig,
    getEnsureAdminVipPrivileges
  } = options;

  const getRuntime = typeof getRuntimeConfig === "function" ? getRuntimeConfig : () => null;
  const getVipEnsurer = typeof getEnsureAdminVipPrivileges === "function" ? getEnsureAdminVipPrivileges : () => null;
  const resolveIsAdmin = typeof getIsAdmin === "function"
    ? (...args) => {
      const fn = getIsAdmin();
      return fn ? fn(...args) : false;
    }
    : (typeof isAdmin === "function" ? isAdmin : () => false);

  async function incrementActivePlayers(ctx) {
    const stats = await ctx.database.get("game_statistics", {});
    if (!stats.length) return;
    await ctx.database.set("game_statistics", {}, {
      activePlayers: stats[0].activePlayers + 1
    });
  }

  async function ensurePlayerProfile(ctx, config, session, options = {}) {
    if (!session?.userId) return { created: false, bonus: 0, user: null };
    const scopeId = getScopeKey(session);
    const scopedUserId = buildScopedId(scopeId, session.userId);
    const existing = await ctx.database.get("player_market_users", { userId: scopedUserId });
    const now = Date.now();
    const channelId = session.channelId ?? "";
    const guildId = session.guildId ?? channelId ?? "";
    const cardName = resolveGroupCard(session);
    if (existing.length) {
      const updates = {};
      if (channelId && existing[0].lastChannelId !== channelId) {
        updates.lastChannelId = channelId;
      }
      if (guildId && existing[0].lastGuildId !== guildId) {
        updates.lastGuildId = guildId;
      }
      if (!existing[0].registerChannelId && channelId) {
        updates.registerChannelId = channelId;
      }
      if (!existing[0].registerGuildId && guildId) {
        updates.registerGuildId = guildId;
      }
      if (!existing[0].registerTime) {
        updates.registerTime = now;
      }
      if (existing[0].loanCreditLevel == null) {
        updates.loanCreditLevel = 1;
      }
      if (existing[0].loanBalance == null) {
        updates.loanBalance = 0;
      }
      if (!existing[0].lastLoanInterestTime) {
        updates.lastLoanInterestTime = now;
      }
      if (existing[0].depositPenaltyLevel == null) {
        updates.depositPenaltyLevel = 0;
      }
      if (existing[0].depositOverdraftPenaltyLevel == null) {
        updates.depositOverdraftPenaltyLevel = 0;
      }
      if (existing[0].shopBoostEndTime == null) {
        updates.shopBoostEndTime = 0;
      }
      if (existing[0].shopTaxFreeCharges == null) {
        updates.shopTaxFreeCharges = 0;
      }
      if (!existing[0].inventory) {
        updates.inventory = {};
      }
      if (existing[0].trainingDailyCount == null) {
        updates.trainingDailyCount = 0;
      }
      if (existing[0].trainingDailyDate == null) {
        updates.trainingDailyDate = 0;
      }
      if (existing[0].lastAssetDecayLoss == null) {
        updates.lastAssetDecayLoss = 0;
      }
      if (existing[0].lastAssetDecayDate == null) {
        updates.lastAssetDecayDate = 0;
      }
      if (existing[0].lastAssetDecayNoticeDate == null) {
        updates.lastAssetDecayNoticeDate = 0;
      }
      if (existing[0].depositInvalidStreak == null) {
        updates.depositInvalidStreak = 0;
      }
      if (existing[0].commandBanned == null) {
        updates.commandBanned = false;
      }
      if (existing[0].commandBanReason == null) {
        updates.commandBanReason = "";
      }
      updates.lastActiveTime = now;
      if (cardName && cardName !== existing[0].nickname) {
        updates.nickname = cardName;
        updates.autoRegistered = true;
      }
      if (Object.keys(updates).length) {
        await ctx.database.set("player_market_users", { userId: existing[0].userId }, updates);
        return { created: false, bonus: 0, user: { ...existing[0], ...updates } };
      }
      return { created: false, bonus: 0, user: existing[0] };
    }
    const nickname = cardName || resolveNickname(session);
    const bonus = options.skipBonus ? 0 : calculateRegistrationBonus(now, config);
    const balance = config.初始余额 + bonus;
    const userData = {
      userId: scopedUserId,
      plainUserId: session.userId,
      scopeId,
      nickname,
      balance,
      deposit: 0,
      deposit: 0,
      creditLevel: config.初始信用等级,
      depositLimit: config.初始存款上限,
      depositPenaltyLevel: 0,
      depositOverdraftPenaltyLevel: 0,
      interest: 0,
      lastInterestTime: now,
      price: config.初始身价,
      employer: "",
      lastWorkTime: 0,
      lastRobTime: 0,
      lastHireTime: 0,
      lastTransferTime: 0,
      lastFarmTime: 0,
      currentCrop: null,
      cropStartTime: 0,
      employeeCount: 0,
      inventory: {},
      shopBoostEndTime: 0,
      shopTaxFreeCharges: 0,
      bodyguardEndTime: 0,
      bodyguardLevel: 0,
      equipped: {
        衣服: null,
        配饰: null,
        发型: null,
        妆容: null
      },
      ownedAppearances: [],
      vipEndTime: resolveIsAdmin(ctx, config, scopedUserId, session) ? ADMIN_VIP_END_TIME : 0,
      loanBalance: 0,
      lastLoanInterestTime: now,
      autoTasks: {
        work: false,
        harvest: false,
        deposit: false
      },
      lastAutoDepositTime: 0,
      priceMultiplier: 1,
      priceMultiplierEndTime: 0,
      welfareLevel: 1,
      lastWelfareTime: 0,
      welfareIncome: 0,
      trainingLevel: 1,
      trainingDailyCount: 0,
      trainingDailyDate: 0,
      lastAssetDecayLoss: 0,
      lastAssetDecayDate: 0,
      lastAssetDecayNoticeDate: 0,
      depositInvalidStreak: 0,
      commandBanned: false,
      commandBanReason: "",
      lastTrainingTime: 0,
      trainingCost: 0,
      abuseCount: 0,
      lastAbuseTime: 0,
      isInJail: false,
      jailStartTime: 0,
      jailReason: "",
      jailWorkIncome: 0,
      jailWorkCount: 0,
      lastJailWorkTime: 0,
      lastJailVictimId: "",
      isInPrison: false,
      prisonEndTime: 0,
      lastAppearanceSwitchTime: 0,
      registerTime: now,
      registerChannelId: channelId,
      registerGuildId: guildId,
      lastChannelId: channelId,
      lastGuildId: guildId,
      lastActiveTime: now,
      autoRegistered: !options.manual,
      registrationBonus: bonus,
      forceTradeStreak: 0,
      forceTradeExpiresAt: 0
    };
    await ctx.database.create("player_market_users", userData);
    await incrementActivePlayers(ctx);
    return { created: true, bonus, user: userData };
  }

  async function getUser(ctx, userId, session) {
    const scopedId = ensureScopedId(session, userId);
    let users = await ctx.database.get("player_market_users", { userId: scopedId });
    const runtimeConfig = getRuntime();
    if (!users.length && session && runtimeConfig) {
      const sessionScoped = getSessionScopedUserId(session);
      if (sessionScoped && sessionScoped === scopedId) {
        const result = await ensurePlayerProfile(ctx, runtimeConfig, session, {});
        if (result.user) {
          users = [result.user];
          if (!session.__slaveMarketAutoRegisterSent) {
            session.__slaveMarketAutoRegisterSent = true;
            const bonusTip = result.bonus > 0 ? `\n🎁 限时注册奖励：+${result.bonus}金币` : "";
            const registerMessage = `✅ 自动注册用户成功！
💰 初始身价：${runtimeConfig.初始身价}${bonusTip}
💡 接下来你可以：
• 输入"打工"开始赚钱
• 输入"我的信息"查看个人信息
• 输入"玩家帮助"查看所有指令`;
            try {
              if (session.send) {
                await sendWithRecall(session, ctx, runtimeConfig, "general", registerMessage);
              }
            } catch (error) {
              ctx.logger?.warn?.(`[slave-market] failed to send auto register message: ${error.message}`);
            }
          }
        }
      }
    }
    if (!users.length) {
      return null;
    }

    // Update activity (throttled to 5 minutes)
    const user = users[0];
    const now = Date.now();
    if (now - (user.lastActiveTime || 0) > 5 * 60 * 1e3) {
      try {
        await ctx.database.set("player_market_users", { userId: user.userId }, { lastActiveTime: now });
        user.lastActiveTime = now;
      } catch (error) {
        ctx.logger?.warn?.(`[slave-market] failed to update activity for ${user.userId}: ${error.message}`);
      }
    }

    const ensureVip = getVipEnsurer();
    return ensureVip ? await ensureVip(ctx, session, user) : user;
  }

  async function getUser2(ctx, userId, session, isTarget) {
    return await getUser(ctx, userId, session);
  }

  async function getUser3(ctx, userId, session) {
    const user = await getUser(ctx, userId, session);
    if (!user) {
      return registrationShortGuide();
    }
    return user;
  }

  async function getUser6(ctx, userId, session) {
    const user = await getUser(ctx, userId, session);
    if (!user) return registrationGuide();
    return user;
  }

  return {
    ensurePlayerProfile,
    getUser,
    getUser2,
    getUser3,
    getUser6
  };
}

module.exports = { createUserService };
