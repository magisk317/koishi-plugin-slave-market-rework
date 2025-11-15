function createInfoModule(deps) {
  const {
    setupMessageRecall,
    accrueLoanInterest,
    calculateLoanLimit,
    formatCropLabel,
    crops,
    bodyguardData,
    getUser2,
    getUser6,
    html_help,
    registrationGuide,
  } = deps;

  function registerInfoCommands(ctx, config) {
    const slaveCommand = ctx.command("大牛马时代");

    slaveCommand.subcommand("玩家帮助", "查看所有可用命令").action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      return await respond(await html_help(ctx));
    });

    slaveCommand
      .subcommand("我的信息", "查看个人信息")
      .alias("个人信息")
      .alias("玩家信息")
      .action(async ({ session }) => {
        const respond = setupMessageRecall(session, ctx, config, "general");
        let user = await getUser6(ctx, session.userId, session);
        if (typeof user === "string") {
          return await respond(registrationGuide());
        }
        user = await accrueLoanInterest(ctx, config, user);
        let masterInfo = "自由人";
        if (user.employer) {
          const master = await getUser2(ctx, user.employer, session, true);
          if (master) masterInfo = master.nickname;
        }
        const slaves = await ctx.database.get("player_market_users", { employer: user.userId });
        const slaveList = slaves.map((s) => s.nickname).join("、") || "无";
        let bodyguardInfo = "无";
        if (user.bodyguardEndTime > Date.now()) {
          const guard = bodyguardData.bodyguards.find((g) => g.level === user.bodyguardLevel);
          if (guard) {
            const remainingTime = Math.ceil((user.bodyguardEndTime - Date.now()) / (60 * 1e3));
            bodyguardInfo = `${guard.name}（剩余${remainingTime}分钟）`;
          }
        }
        let prisonInfo = "";
        if (user.isInJail) {
          const remainingTime = Math.ceil(
            (user.jailStartTime + config.监狱系统.监狱打工间隔 * config.监狱系统.监狱打工次数上限 - Date.now()) /
              (60 * 1e3),
          );
          prisonInfo = `\n🏛️ 监狱状态：服刑中（剩余${remainingTime}分钟）\n📝 入狱原因：${user.jailReason}`;
        }
        const now = Date.now();
        const workCooldown = Math.ceil((config.打工冷却 - (now - user.lastWorkTime)) / (60 * 1e3));
        const robCooldown = Math.ceil((config.抢劫冷却 - (now - user.lastRobTime)) / (60 * 1e3));
        const hireCooldown = Math.ceil((config.购买冷却 - (now - user.lastHireTime)) / (60 * 1e3));
        const transferCooldown = Math.ceil((config.转账冷却 - (now - user.lastTransferTime)) / (60 * 1e3));
        let cropInfo = "未种植";
        if (user.currentCrop) {
          const crop = crops.find((c) => c.name === user.currentCrop);
          if (crop) {
            const growthHours = (now - user.cropStartTime) / (60 * 60 * 1e3);
            const isMature = growthHours >= crop.growthTime;
            const remainingMinutes = Math.max(0, Math.ceil((crop.growthTime - growthHours) * 60));
            cropInfo = `${formatCropLabel(crop)}（${isMature ? "已成熟" : `还需${remainingMinutes}分钟`}）`;
          }
        }
        const loanLimit = calculateLoanLimit(user, config);
        const availableLoan = Math.max(0, loanLimit - (user.loanBalance ?? 0));
        return await respond(`=== ${user.nickname} 的信息 ===\n💰 当前余额：${user.balance}\n💵 当前身价：${user.price}\n🏦 银行存款：${user.deposit}/${user.depositLimit}\n🏅 财富等级：${user.creditLevel}\n💳 信用等级：${user.loanCreditLevel ?? 1}\n💳 当前贷款：${user.loanBalance ?? 0}\n💶 可贷款额度：${loanLimit}（剩余${availableLoan}）\n👑 牛马主：${masterInfo} 🐂🐎\n👥 牛马数量：${user.employeeCount} 🐂🐎\n👥 牛马列表：${slaveList}\n🔒 保镖状态：${bodyguardInfo}\n💸 累计福利：${user.welfareIncome}\n📚 培训等级：${user.trainingLevel}\n💎 福利等级：${user.welfareLevel}\n\n⏰ 冷却状态：\n• 打工：${workCooldown > 0 ? `${workCooldown}分钟` : "可用"}\n• 抢劫：${robCooldown > 0 ? `${robCooldown}分钟` : "可用"}\n• 购买：${hireCooldown > 0 ? `${hireCooldown}分钟` : "可用"}\n• 转账：${transferCooldown > 0 ? `${transferCooldown}分钟` : "可用"}\n\n🌾 作物状态：${cropInfo}${prisonInfo}\n\n💡 身价提升提示：\n• 多打工、训练和完成任务\n• 购买装扮或种植高级作物提升加成\n• 提升财富等级可扩大存款收益`);
      });
  }

  return { registerInfoCommands };
}

module.exports = { createInfoModule };
