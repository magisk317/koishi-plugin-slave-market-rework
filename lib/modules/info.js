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
    registrationGuide,
    renderProfileCard,
  } = deps;
  function registerInfoCommands(ctx, config) {
    const slaveCommand = ctx.command("大牛马时代");

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
        const now = Date.now();
        let bodyguardInfo = "无";
        if (user.bodyguardEndTime > Date.now()) {
          const guard = bodyguardData.bodyguards.find((g) => g.level === user.bodyguardLevel);
          if (guard) {
            const remainingTime = Math.ceil((user.bodyguardEndTime - Date.now()) / (60 * 1e3));
            bodyguardInfo = `${guard.name}（剩余${remainingTime}分钟）`;
          }
        }
        let prisonInfo = "自由";
        if (user.isInJail) {
          const remainingTime = Math.ceil(
            (user.jailStartTime + config.监狱系统.监狱打工间隔 * config.监狱系统.监狱打工次数上限 - Date.now()) /
              (60 * 1e3),
          );
          prisonInfo = `服刑中（剩余${remainingTime}分钟）`;
        }
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
        const cooldownValue = (remain) => (remain > 0 ? `${remain}分钟` : "可用");
        const workCooldown = Math.ceil((config.打工冷却 - (now - user.lastWorkTime)) / (60 * 1e3));
        const robCooldown = Math.ceil((config.抢劫冷却 - (now - user.lastRobTime)) / (60 * 1e3));
        const hireCooldown = Math.ceil((config.购买冷却 - (now - user.lastHireTime)) / (60 * 1e3));
        const transferCooldown = Math.ceil((config.转账冷却 - (now - user.lastTransferTime)) / (60 * 1e3));
        const loanLimit = calculateLoanLimit(user, config);
        const availableLoan = Math.max(0, loanLimit - (user.loanBalance ?? 0));
        const profileData = {
          nickname: user.nickname,
          lastActive: new Date(user.lastActiveTime || Date.now()).toLocaleString(),
          balance: user.balance,
          price: user.price,
          deposit: user.deposit,
          depositLimit: user.depositLimit,
          creditLevel: user.creditLevel,
          loanCreditLevel: user.loanCreditLevel ?? 1,
          loanBalance: user.loanBalance ?? 0,
          loanLimit,
          availableLoan,
          masterInfo,
          employeeCount: user.employeeCount || 0,
          slaveList: slaves.map((s) => s.nickname),
          bodyguardInfo,
          welfareIncome: user.welfareIncome || 0,
          trainingLevel: user.trainingLevel || 1,
          welfareLevel: user.welfareLevel || 1,
          cooldowns: {
            打工: cooldownValue(workCooldown),
            抢劫: cooldownValue(robCooldown),
            购买: cooldownValue(hireCooldown),
            转账: cooldownValue(transferCooldown)
          },
          cropInfo,
          prisonInfo,
          tips: [
            "多打工、完成任务来提升身价",
            "种植高阶作物与培训可提升收益",
            "升级财富等级可扩大存款收益",
            "记得雇佣保镖与牛马提升被动收入"
          ]
        };
        const image = await renderProfileCard(ctx, profileData);
        return await respond(image);
      });
  }

  return { registerInfoCommands };
}

module.exports = { createInfoModule };
