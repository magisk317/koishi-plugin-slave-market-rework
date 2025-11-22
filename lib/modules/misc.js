const { resolveScopeInput, resolveTargetUser } = require("../utils/playerHelpers");

function createMiscModule(deps) {
  const { setupMessageRecall, getUser2, registrationGuide, isAdmin } = deps;

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
    const released = employees.length;
    return `🔁 重开成功！
🧹 已清除历史资产、贷款、牛马关系
🐂 已自动放生 ${released} 名牛马
可以随时重新打工/注册，重新开始。`;
  }

  function registerMiscCommands(ctx, config) {
    const slaveCommand = ctx.command("大牛马时代");

    const restartCommand = slaveCommand.subcommand("重开 <target:string>", "管理员清空指定角色数据").alias("重生").alias("一键重开").alias("一键重生").alias("重新开始");
    restartCommand.action(async ({ session }, targetInput) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      if (!isAdmin(ctx, config, session.userId, session)) {
        return await respond("只有管理员可以执行重开操作");
      }
      const targetPlayer = await resolveTargetUser(ctx, session, targetInput);
      if (!targetPlayer) {
        return await respond("🔍 找不到要重开的玩家，请 @ 对方或输入正确的昵称/QQ号");
      }
      const result = await resetProfile(ctx, session, targetPlayer);
      return await respond(`✅ 已重开 ${targetPlayer.nickname} 的账号。\n${result}`);
    });

    slaveCommand.subcommand("税收奖池 [scope:string]", "查看当前税收奖池累计税金").action(async ({ session }, scopeInput) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      if (!ctx.taxService?.getPoolStatus) {
        return await respond("⚠️ 税收系统尚未启用");
      }
      const targetScope = resolveScopeInput(session, scopeInput);
      if (!targetScope) {
        return await respond("❌ 无法确认要查询的群，请输入群号，例如“税收奖池 123456”");
      }
      const status = await ctx.taxService.getPoolStatus(targetScope);
      const amount = status?.amount ?? 0;
      const lastUpdated = status?.updatedAt ? new Date(status.updatedAt).toLocaleString() : "暂无记录";
      const nextTime = "每日 10:00";
      return await respond(`=== 税收奖池 ===
范围：${targetScope}
累计税金：${amount} 金币
最后更新：${lastUpdated}
📢 奖池会在${nextTime} 由系统以红包形式自动发放，可在任意时间通过本指令查看最新进度。`);
    });

    slaveCommand.subcommand("系统资金", "查看系统资金状态与用途").action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const [system] = await ctx.database.get("slave_market_system", {});
      if (!system) {
        return await respond("⚠️ 系统资金账本尚未初始化。");
      }
      const balance = system.balance ?? 0;
      return await respond(`=== 系统资金 ===
当前余额：${balance} 金币

主要来源：
• 银行存取款/转账等金融手续费
• 红包、农场、监狱等玩法扣除的税金
• 管理员或系统强制收取的罚金

主要去向：
• 玩家领取银行利息、贷款利息
• 每日税收奖池红包
• 监狱赔偿、随机补贴等系统发放

📌 系统保持收支平衡，一旦余额不足，对应功能会自动提示资金不足。`);
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

    slaveCommand.subcommand("更新日志", "查看插件更新日志").action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      return await respond(changelog);
    });
  }

  return { registerMiscCommands };
}

module.exports = { createMiscModule };
