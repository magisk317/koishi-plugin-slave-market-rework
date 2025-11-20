const { randomInt } = require("../utils/random");

function createVipModule(deps) {
  const {
    setupMessageRecall,
    withSponsorQr,
    isAdmin,
    ensureScopedId,
    getUser,
    registrationGuide,
    work,
    deposit,
    harvest,
    logDebug,
    getRuntimeConfig,
    ADMIN_VIP_END_TIME,
    HOUR_IN_MS
  } = deps;

  const VIP_CARD_TYPE_MAP = {
    day: { key: "day", label: "日卡", hours: 24, tokens: ["day", "days", "日", "日卡", "daily"] },
    week: { key: "week", label: "周卡", hours: 24 * 7, tokens: ["week", "weeks", "周", "周卡", "weekly"] },
    month: { key: "month", label: "月卡", hours: 24 * 30, tokens: ["month", "months", "月", "月卡", "monthly"] },
    hour: { key: "hour", label: "小时卡", tokens: ["hour", "hours", "hourly", "h", "小时", "小时卡"] }
  };

  const sponsorTipGeneral = `❌ 您还不是VIP用户
💝 成为VIP用户可享受以下特权：
- 自动打工
- 自动收获
- 自动存款
- 更多特权...

🎁 赞助后您将获得：
- 专属VIP特权
- 更多游戏功能
- 优先体验新内容
- 专属客服支持

📷 请扫描下方赞赏码完成赞助`;

  const sponsorTipAutoTasks = `❌ 您还不是VIP用户
💝 成为VIP用户可享受自动任务特权：
- 自动打工
- 自动收获
- 自动存款

📷 请扫描下方赞赏码完成赞助`;

  function normalizeVipCardType(input) {
    if (!input) return null;
    const normalized = String(input).trim().toLowerCase();
    if (!normalized) return null;
    for (const type of Object.values(VIP_CARD_TYPE_MAP)) {
      if (type.tokens.some((token) => token.toLowerCase() === normalized)) {
        return type;
      }
    }
    return null;
  }

  function formatVipDurationLabel(typeKey, hours) {
    if (typeKey === "hour") return `${hours}小时`;
    if (typeKey === "week") return `周卡（${hours}小时）`;
    if (typeKey === "month") return `月卡（${hours}小时）`;
    return `日卡（${hours}小时）`;
  }

  function parseHourDurationSpec(value) {
    const text = String(value ?? "").replace(/小时|h/gi, "").trim();
    if (!text) return null;
    const parts = text.split(/[-~]/).map((part) => part.trim()).filter(Boolean);
    if (!parts.length) return null;
    const clamp = (val) => Math.min(23, Math.max(1, Math.floor(val)));
    const first = Number(parts[0]);
    if (!Number.isFinite(first)) return null;
    if (parts.length === 1) {
      const normalized = clamp(first);
      return { min: normalized, max: normalized, isRange: false };
    }
    const second = Number(parts[1]);
    if (!Number.isFinite(second)) return null;
    const minValue = clamp(Math.min(first, second));
    const maxValue = clamp(Math.max(first, second));
    return { min: minValue, max: maxValue, isRange: true };
  }

  function buildVipCardCode(typeKey) {
    const prefix = (typeKey?.[0] ?? "V").toUpperCase();
    const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `VIP${prefix}${Date.now().toString(36).toUpperCase()}${randomPart}`;
  }

  function createVipDurationGenerator(typeInfo, durationArg) {
    if (!typeInfo) return null;
    if (typeInfo.key !== "hour") {
      const hours = typeInfo.hours;
      const label = formatVipDurationLabel(typeInfo.key, hours);
      return () => ({
        durationHours: hours,
        durationMs: hours * HOUR_IN_MS,
        durationLabel: label
      });
    }
    const spec = parseHourDurationSpec(durationArg);
    if (!spec) return null;
    return () => {
      const hours = spec.isRange ? randomInt(spec.min, spec.max) : spec.min;
      return {
        durationHours: hours,
        durationMs: hours * HOUR_IN_MS,
        durationLabel: `${hours}小时`
      };
    };
  }

  function resolveCardDurationMs(card) {
    if (!card) return 0;
    if (card.durationHours) return card.durationHours * HOUR_IN_MS;
    const type = VIP_CARD_TYPE_MAP[card.type || ""];
    if (type?.hours) return type.hours * HOUR_IN_MS;
    return 30 * 24 * 60 * 60 * 1e3;
  }

  function resolveCardLabel(card, durationHours) {
    if (card?.durationLabel) return card.durationLabel;
    if (card?.type && VIP_CARD_TYPE_MAP[card.type]) {
      return formatVipDurationLabel(card.type, durationHours || VIP_CARD_TYPE_MAP[card.type].hours);
    }
    if (durationHours >= 24 && durationHours % 24 === 0) {
      const days = durationHours / 24;
      if (days >= 30) return `月卡（${durationHours}小时）`;
      if (days >= 7) return `周卡（${durationHours}小时）`;
      return `日卡（${durationHours}小时）`;
    }
    return `${durationHours}小时`;
  }

  function inferVipTypeByHours(durationHours) {
    if (!durationHours) return "hour";
    if (durationHours % (24 * 30) === 0) return "month";
    if (durationHours % (24 * 7) === 0) return "week";
    if (durationHours % 24 === 0) return "day";
    return "hour";
  }

  async function resolveRegisteredUser(ctx, session) {
    const user = await getUser(ctx, session.userId, session);
    if (!user) return { error: registrationGuide() };
    return { user };
  }

  async function redeemVipCard(ctx, config, session, cardId) {
    const { user, error } = await resolveRegisteredUser(ctx, session);
    if (error) return error;
    const [card] = await ctx.database.get("vip_cards", { id: cardId });
    if (!card) return "❌ 无效的卡密";
    if (card.isUsed) return "❌ 该卡密已被使用";
    const now = Date.now();
    const durationMs = resolveCardDurationMs(card);
    const durationHours = Math.max(1, Math.round(durationMs / HOUR_IN_MS));
    const durationLabel = resolveCardLabel(card, durationHours);
    const expireTime = now + durationMs;
    await ctx.database.set("player_market_users", { userId: user.userId }, {
      vipEndTime: Math.max(user.vipEndTime || 0, now) + durationMs,
      autoTasks: {
        work: true,
        harvest: true,
        deposit: true
      }
    });
    await ctx.database.set("vip_cards", { id: cardId }, {
      isUsed: true,
      usedBy: user.userId,
      usedTime: now,
      expireTime,
      type: card.type || inferVipTypeByHours(durationHours),
      durationHours: card.durationHours || durationHours,
      durationLabel
    });
    return `✅ ${durationLabel}兑换成功！
⏰ 到期时间：${new Date(expireTime).toLocaleString()}`;
  }

  async function checkVipStatus(ctx, config, session) {
    const { user, error } = await resolveRegisteredUser(ctx, session);
    if (error) return error;
    const now = Date.now();
    const adminVip = isAdmin(ctx, config, user.userId, session);
    const isVip = adminVip || user.vipEndTime > now;
    const remainingDays = isVip
      ? adminVip
        ? Infinity
        : Math.ceil((user.vipEndTime - now) / (24 * 60 * 60 * 1e3))
      : 0;
    let message = `=== VIP状态 ===\n`;
    message += isVip ? `✅ VIP状态：已激活\n` : `❌ VIP状态：未激活\n`;
    if (isVip) {
      if (adminVip) {
        message += `⏰ 到期时间：管理员永久特权\n`;
        message += `📅 剩余天数：∞（无需续费）\n\n`;
      } else {
        message += `⏰ 到期时间：${new Date(user.vipEndTime).toLocaleString()}\n`;
        message += `📅 剩余天数：${remainingDays}天\n\n`;
      }
      message += `=== 自动任务状态 ===\n`;
      message += `💼 自动打工：${user.autoTasks.work ? "开启" : "关闭"}\n`;
      message += `🌾 自动收菜：${user.autoTasks.harvest ? "开启" : "关闭"}\n`;
      message += `💰 自动存款：${user.autoTasks.deposit ? "开启" : "关闭"}\n`;
      message += `\n💡 使用"自动任务 开启/关闭 [任务名称]"来控制自动任务`;
    }
    return message;
  }

  async function toggleAutoTask(ctx, config, session, action, taskName) {
    const { user, error } = await resolveRegisteredUser(ctx, session);
    if (error) return error;
    if (user.vipEndTime <= Date.now()) {
      return "❌ 你不是VIP用户，无法使用自动任务";
    }
    if (!["开启", "关闭"].includes(action)) {
      return "❌ 无效的操作，可用：开启、关闭";
    }
    const newStatus = action === "开启";
    if (!taskName || taskName === "all") {
      await ctx.database.set("player_market_users", { userId: user.userId }, {
        autoTasks: {
          work: newStatus,
          harvest: newStatus,
          deposit: newStatus
        }
      });
      if (newStatus) {
        await executeAutoTasks(ctx, config);
      }
      return `✅ ${action}所有自动任务成功！`;
    }
    if (!["work", "harvest", "deposit"].includes(taskName)) {
      return "❌ 无效的任务名称，可用：work(打工)、harvest(收菜)、deposit(存款)";
    }
    await ctx.database.set("player_market_users", { userId: user.userId }, {
      [`autoTasks.${taskName}`]: newStatus
    });
    if (newStatus) {
      await executeAutoTasks(ctx, config);
    }
    return `✅ ${action}${taskName === "work" ? "自动打工" : taskName === "harvest" ? "自动收菜" : "自动存款"}成功！`;
  }

  async function executeAutoTasks(ctx, config) {
    const now = Date.now();
    const vipUsers = await ctx.database.get("player_market_users", {
      vipEndTime: { $gt: now }
    });
    for (const user of vipUsers) {
      if (!user.autoTasks.work && !user.autoTasks.harvest && !user.autoTasks.deposit) {
        continue;
      }
      console.log(`【自动任务】VIP ${user.nickname} 开始运行自动任务。`);
      if (user.autoTasks.work && now - user.lastWorkTime >= config.打工冷却) {
        await work(ctx, config, { userId: user.userId });
        console.log(`【自动任务】VIP ${user.nickname} 完成了自动打工。`);
      }
      if (user.autoTasks.deposit && now - (user.lastAutoDepositTime || 0) >= 5 * 60 * 1e3) {
        if (user.balance > 0) {
          await deposit(ctx, config, { userId: user.userId }, user.balance);
          await ctx.database.set("player_market_users", { userId: user.userId }, {
            lastAutoDepositTime: now
          });
          console.log(`【自动任务】VIP ${user.nickname} 完成了自动存款 全部金币。`);
        }
      }
      if (user.autoTasks.harvest && user.currentCrop) {
        await harvest(ctx, config, { userId: user.userId });
        console.log(`【自动任务】VIP ${user.nickname} 完成了自动收菜。`);
      }
    }
  }

  async function ensureAdminVipPrivileges(ctx, session, user) {
    const runtimeConfig = getRuntimeConfig?.();
    if (!user || !session || !runtimeConfig) return user;
    const privileged = isAdmin(ctx, runtimeConfig, user.userId, session);
    logDebug?.(ctx, "ensureAdminVipPrivileges check", {
      userId: user.userId,
      scopedId: ensureScopedId(session, user.userId),
      privileged,
      currentVipEnd: user.vipEndTime
    });
    if (!privileged) return user;
    if (user.vipEndTime && user.vipEndTime >= ADMIN_VIP_END_TIME) return user;
    try {
      await ctx.database.set("player_market_users", { userId: user.userId }, {
        vipEndTime: ADMIN_VIP_END_TIME
      });
      user.vipEndTime = ADMIN_VIP_END_TIME;
      logDebug?.(ctx, "ensureAdminVipPrivileges granted", {
        userId: user.userId,
        vipEndTime: user.vipEndTime
      });
    } catch (error) {
      ctx.logger?.warn?.(`[slave-market] grant admin vip failed: ${error.message}`);
    }
    return user;
  }

  function registerVipCommands(ctx, config) {
    const slaveCommand = ctx.command("大牛马时代");
    slaveCommand.subcommand("vip兑换 <cardId:string>", "兑换VIP卡密").action(async ({ session }, cardId) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      return await respond(await redeemVipCard(ctx, config, session, cardId));
    });
    slaveCommand.subcommand("vip状态", "查看VIP状态").action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const user = await getUser(ctx, session.userId, session);
      if (!user) return await respond("❌ 请先注册成为玩家");
      const isVip = user.vipEndTime > Date.now();
      if (!isVip) {
        return await respond(await withSponsorQr(session, sponsorTipGeneral));
      }
      return await respond(await checkVipStatus(ctx, config, session));
    });
    slaveCommand.subcommand("自动任务 [action:string] [taskName:string]", "控制自动任务").action(async ({ session }, action, taskName) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const user = await getUser(ctx, session.userId, session);
      if (!user) return await respond("❌ 请先注册成为玩家");
      const isVip = user.vipEndTime > Date.now();
      if (!isVip) {
        return await respond(await withSponsorQr(session, sponsorTipAutoTasks));
      }
      if (!action) {
        return await respond(await toggleAutoTask(ctx, config, session, "开启", "all"));
      }
      if (!taskName) {
        return await respond(await toggleAutoTask(ctx, config, session, action, "all"));
      }
      return await respond(await toggleAutoTask(ctx, config, session, action, taskName));
    });
    slaveCommand.subcommand("生成vip卡 <cardType:string> <count:number> [duration:string]", "生成指定类型的VIP卡密").action(async ({ session }, cardType, count, duration) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      if (!isAdmin(ctx, config, session.userId, session)) {
        return await respond("只有管理员可以生成VIP卡密");
      }
      const typeInfo = normalizeVipCardType(cardType);
      if (!typeInfo) {
        return await respond("❌ 无效的VIP卡类型，可用：日卡、周卡、月卡、小时卡");
      }
      const total = Number(count);
      if (!Number.isFinite(total) || total <= 0) {
        return await respond("❌ 请输入有效的数量");
      }
      if (total > 100) {
        return await respond("❌ 单次最多生成100张卡密");
      }
      if (typeInfo.key === "hour" && !duration) {
        return await respond('❌ 小时卡需要提供有效时长，例如"2"或"1-3"');
      }
      const generator = createVipDurationGenerator(typeInfo, duration);
      if (!generator) {
        return await respond("❌ 无效的小时卡时长，支持1-23小时并可使用起止范围");
      }
      const createdBy = ensureScopedId(session, session.userId);
      const now = Date.now();
      const list = [];
      for (let i = 0; i < total; i++) {
        const payload = generator();
        const cardCode = buildVipCardCode(typeInfo.key);
        await ctx.database.create("vip_cards", {
          id: cardCode,
          type: typeInfo.key,
          durationHours: payload.durationHours,
          durationLabel: payload.durationLabel,
          isUsed: false,
          usedBy: "",
          usedTime: 0,
          expireTime: 0,
          createdBy,
          createdAt: now
        });
        list.push(`${i + 1}. ${cardCode}（${payload.durationLabel}）`);
      }
      return await respond(`✅ 已生成${list.length}张${typeInfo.label}
${list.join("\n")}`);
    });
  }

  return {
    registerVipCommands,
    executeAutoTasks,
    ensureAdminVipPrivileges
  };
}

module.exports = { createVipModule };
