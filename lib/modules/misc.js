const RESET_COOLDOWN_MS = 24 * 60 * 60 * 1e3;
const RESET_CONFIRM_TIMEOUT = 60 * 1e3;

function createMiscModule(deps) {
  const { setupMessageRecall, withSponsorQr, getUser2, registrationGuide } = deps;
  const pendingResetConfirmations = new Map();

  async function getLastResetTime(ctx, userId) {
    const records = await ctx.database.get("player_market_reset_logs", { userId });
    if (!records.length) return 0;
    return records[0].lastResetTime || 0;
  }

  async function saveResetRecord(ctx, player) {
    const now = Date.now();
    const existing = await ctx.database.get("player_market_reset_logs", { userId: player.userId });
    const payload = {
      scopeId: player.scopeId,
      plainUserId: player.plainUserId || player.userId,
      lastResetTime: now,
    };
    if (existing.length) {
      await ctx.database.set("player_market_reset_logs", { userId: player.userId }, payload);
    } else {
      await ctx.database.create("player_market_reset_logs", {
        userId: player.userId,
        ...payload,
      });
    }
    return now;
  }

  async function resetProfile(ctx, session, existingPlayer) {
    const player = existingPlayer ?? await getUser2(ctx, session.userId, session);
    if (!player) return registrationGuide();
    const employees = await ctx.database.get("player_market_users", { employer: player.userId });
    for (const emp of employees) {
      await ctx.database.set("player_market_users", { userId: emp.userId }, { employer: "" });
    }
    if (player.employer) {
      const masters = await ctx.database.get("player_market_users", { userId: player.employer });
      if (masters.length) {
        const master = masters[0];
        await ctx.database.set("player_market_users", { userId: master.userId }, {
          employeeCount: Math.max(0, master.employeeCount - 1),
        });
      }
    }
    await ctx.database.remove("player_market_users", { userId: player.userId });
    await saveResetRecord(ctx, player);
    const released = employees.length;
    return `🔁 重开成功！
🧹 已清除历史资产、贷款、牛马关系
🐂 已自动放生 ${released} 名牛马
可以随时重新打工/注册，重新开始。`;
  }

  function registerMiscCommands(ctx, config) {
    const slaveCommand = ctx.command("大牛马时代");

    const restartCommand = slaveCommand.subcommand("重开", "清空当前角色数据重新开始").alias("重生").alias("一键重开").alias("一键重生").alias("重新开始");
    restartCommand.action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const player = await getUser2(ctx, session.userId, session);
      if (!player) return await respond(registrationGuide());
      const now = Date.now();
      const lastResetTime = await getLastResetTime(ctx, player.userId);
      if (lastResetTime && now - lastResetTime < RESET_COOLDOWN_MS) {
        const remaining = RESET_COOLDOWN_MS - (now - lastResetTime);
        const hours = Math.floor(remaining / (60 * 60 * 1e3));
        const minutes = Math.ceil((remaining % (60 * 60 * 1e3)) / (60 * 1e3));
        return await respond(`⏳ 重开冷却中，请等待${hours ? `${hours}小时` : ""}${minutes}分钟后再试`);
      }
      const pendingAt = pendingResetConfirmations.get(player.userId);
      if (!pendingAt || now - pendingAt > RESET_CONFIRM_TIMEOUT) {
        pendingResetConfirmations.set(player.userId, now);
        return await respond("⚠️ 重开将清除所有资产与进度，请再次发送“重开”确认。");
      }
      pendingResetConfirmations.delete(player.userId);
      const result = await resetProfile(ctx, session, player);
      return await respond(result);
    });

    slaveCommand.subcommand("天气", "查看当前天气状态").action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const status = ctx.weatherService?.getWeatherStatus?.();
      if (!status) {
        return await respond("⚠️ 天气系统未启用");
      }
      return await respond(`当前天气状态：
天气：${status.weatherEffect.name} - ${status.weatherEffect.description}
季节：${status.seasonEffect.name} - ${status.seasonEffect.description}
温度：${status.temperature}°C
作物生长速度：${(status.weatherEffect.cropGrowthRate * status.seasonEffect.cropGrowthRate * 100).toFixed(0)}%
打工收入修正：${(status.weatherEffect.workIncomeRate * 100).toFixed(0)}%`);
    });

    slaveCommand.subcommand("赞助", "查看赞助信息").action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const tip = `💝 感谢您对游戏的支持！

🎁 赞助后您将获得：
- 专属VIP特权
- 自动打工功能
- 自动收获功能
- 自动存款功能
- 专属装扮
- 更多特权持续更新中...

💡 赞助步骤：
1. 扫描赞赏码选择支持方案
2. 完成支付后，将收到VIP卡密
3. 使用"vip兑换 [卡密]"命令激活VIP特权

您的支持将帮助我们持续改进游戏，添加更多有趣的功能！`;
      return await respond(await withSponsorQr(tip));
    });

    slaveCommand.subcommand("赞助权益", "查看赞助后获得的权益").action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const tip = `🎁 VIP特权内容：

1️⃣ 自动功能：
- 自动打工：自动赚取金币
- 自动收获：自动收获作物
- 自动存款：自动存入银行

2️⃣ 专属特权：
- 专属装扮：独特外观
- 优先体验：新功能抢先体验
- 专属客服：一对一服务

3️⃣ 其他福报：
- 每日额外奖励
- 专属称号
- 更多特权持续更新中...

📷 立即扫码即可赞助，获取更多特权`;
      return await respond(await withSponsorQr(tip));
    });
  }

  return { registerMiscCommands };
}

module.exports = { createMiscModule };
