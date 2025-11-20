const { extractMentionedUserId } = require("../utils/playerHelpers");

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
    renderBillCard,
    resolveTargetUser,
    transactionService,
  } = deps;
  function registerInfoCommands(ctx, config) {
    const slaveCommand = ctx.command("大牛马时代");

    slaveCommand
      .subcommand("我的信息 [target:string]", "查看玩家信息")
      .alias("个人信息")
      .alias("玩家信息")
      .action(async ({ session }, targetInput) => {
        const respond = setupMessageRecall(session, ctx, config, "general");
        let viewer = await getUser6(ctx, session.userId, session);
        if (typeof viewer === "string") {
          return await respond(registrationGuide());
        }
        viewer = await accrueLoanInterest(ctx, config, viewer);
        const mentionId = extractMentionedUserId(session);
        const trimmedTarget = typeof targetInput === "string" ? targetInput.trim() : "";
        const wantsOther = Boolean(trimmedTarget) || (mentionId && mentionId !== session.userId);
        let profileUser = viewer;
        if (wantsOther) {
          const targetUser = await resolveTargetUser(ctx, session, trimmedTarget || mentionId);
          if (!targetUser) {
            return await respond("🔍 没定位到目标，@一下或把昵称写完整");
          }
          profileUser = targetUser.userId === viewer.userId ? viewer : await accrueLoanInterest(ctx, config, targetUser);
        }
        let masterInfo = "自由人";
        if (profileUser.employer) {
          const master = await getUser2(ctx, profileUser.employer, session, true);
          if (master) masterInfo = master.nickname;
        }
        const slaves = await ctx.database.get("player_market_users", { employer: profileUser.userId });
        const now = Date.now();
        let bodyguardInfo = "无";
        if (profileUser.bodyguardEndTime > Date.now()) {
          const guard = bodyguardData.bodyguards.find((g) => g.level === profileUser.bodyguardLevel);
          if (guard) {
            const remainingTime = Math.ceil((profileUser.bodyguardEndTime - Date.now()) / (60 * 1e3));
            bodyguardInfo = `${guard.name}（剩余${remainingTime}分钟）`;
          }
        }
        let prisonInfo = "自由";
        if (profileUser.isInJail) {
          const remainingTimes = Math.max(0, config.监狱系统.监狱打工次数上限 - profileUser.jailWorkCount);
          prisonInfo = `服刑中（剩余缝纫次数 ${remainingTimes}）`;
        }
        let cropInfo = "未种植";
        if (profileUser.currentCrop) {
          const crop = crops.find((c) => c.name === profileUser.currentCrop);
          if (crop) {
            const growthHours = (now - profileUser.cropStartTime) / (60 * 60 * 1e3);
            const isMature = growthHours >= crop.growthTime;
            const remainingMinutes = Math.max(0, Math.ceil((crop.growthTime - growthHours) * 60));
            cropInfo = `${formatCropLabel(crop)}（${isMature ? "已成熟" : `还需${remainingMinutes}分钟`}）`;
          }
        }
        const cooldownValue = (remain) => (remain > 0 ? `${remain}分钟` : "可用");
        const workCooldown = Math.ceil((config.打工冷却 - (now - profileUser.lastWorkTime)) / (60 * 1e3));
        const robCooldown = Math.ceil((config.抢劫冷却 - (now - profileUser.lastRobTime)) / (60 * 1e3));
        const hireCooldown = Math.ceil((config.购买冷却 - (now - profileUser.lastHireTime)) / (60 * 1e3));
        const transferCooldown = Math.ceil((config.转账冷却 - (now - profileUser.lastTransferTime)) / (60 * 1e3));
        const loanLimit = calculateLoanLimit(profileUser, config);
        const availableLoan = Math.max(0, loanLimit - (profileUser.loanBalance ?? 0));
        const profileData = {
          nickname: profileUser.nickname,
          lastActive: new Date(profileUser.lastActiveTime || Date.now()).toLocaleString(),
          balance: profileUser.balance,
          price: profileUser.price,
          deposit: profileUser.deposit,
          depositLimit: profileUser.depositLimit,
          creditLevel: profileUser.creditLevel,
          loanCreditLevel: profileUser.loanCreditLevel ?? 1,
          loanBalance: profileUser.loanBalance ?? 0,
          loanLimit,
          availableLoan,
          masterInfo,
          employeeCount: profileUser.employeeCount || 0,
          slaveList: slaves.map((s) => s.nickname),
          bodyguardInfo,
          welfareIncome: profileUser.welfareIncome || 0,
          trainingLevel: profileUser.trainingLevel || 1,
          welfareLevel: profileUser.welfareLevel || 1,
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
            "记得定期领取福报与升级福报等级",
            "雇佣保镖与牛马能获得更多被动收入"
          ]
        };
        const card = await renderProfileCard(ctx, profileData, session);
        const todayKey = new Date(now).setHours(0, 0, 0, 0);
        if (!wantsOther && profileUser.lastAssetDecayDate === todayKey && profileUser.lastAssetDecayLoss > 0 && profileUser.lastAssetDecayNoticeDate !== todayKey) {
          await ctx.database.set("player_market_users", { userId: profileUser.userId }, { lastAssetDecayNoticeDate: todayKey });
          await respond(`📉 受通膨影响，你的资金减少了 ${profileUser.lastAssetDecayLoss} 金币，努力打工追上通膨吧！`);
        }
        return await respond(card);
      });

    slaveCommand
      .subcommand("账单 [target:string]", "查看最近账单流水")
      .option("limit", "-n <limit:number>", { fallback: 10 })
      .option("type", "-t <type:string>")
      .option("income", "--income")
      .option("expense", "--expense")
      .action(async ({ session, options }, targetInput) => {
        const respond = setupMessageRecall(session, ctx, config, "general");
        let viewer = await getUser6(ctx, session.userId, session);
        if (typeof viewer === "string") {
          return await respond(registrationGuide());
        }
        const mentionId = extractMentionedUserId(session);
        const trimmedTarget = typeof targetInput === "string" ? targetInput.trim() : "";
        const wantsOther = Boolean(trimmedTarget) || (mentionId && mentionId !== session.userId);
        let targetUser = viewer;
        if (wantsOther) {
          const resolved = await resolveTargetUser(ctx, session, trimmedTarget || mentionId);
          if (!resolved) {
            return await respond("🔍 没定位到目标，@一下或把昵称写完整");
          }
          targetUser = resolved;
        }
        const limit = Math.min(Math.max(Number(options?.limit) || 10, 1), 50);
        const direction = options?.income && options?.expense
          ? undefined
          : options?.income
            ? "income"
            : options?.expense
              ? "expense"
              : undefined;
        const category = options?.type?.trim() || undefined;
        const history = await transactionService.getStatement(ctx, targetUser, {
          limit,
          direction,
          category,
          includeFee: false
        });
        const ownerLabel = targetUser.userId === viewer.userId ? "你" : targetUser.nickname;
        const filters = [`最近 ${history.length}/${limit} 条`];
        if (direction === "income") filters.push("仅收入");
        if (direction === "expense") filters.push("仅支出");
        if (category) {
          filters.push(`类型：${transactionService.resolveCategoryLabel(category)}`);
        }
        const palette = ["#f783ac","#4dabf7","#ffd43b","#63e6be","#b197fc","#ffa94d","#ff8787","#69db7c","#a5d8ff","#ffe066"];
        let totalIncome = 0;
        let totalExpense = 0;
        const detailEntries = history.map((entry) => {
          const timeLabel = new Date(entry.createdAt || Date.now()).toLocaleString("zh-CN", { hour12: false });
          if (entry.direction === "income") {
            totalIncome += entry.amount;
          } else {
            totalExpense += entry.amount;
          }
          return {
            direction: entry.direction,
            categoryLabel: transactionService.resolveCategoryLabel(entry.category),
            amount: entry.amount,
            description: entry.description || "",
            timeLabel
          };
        });
        const summaryMap = transactionService.summarize(history);
        const summaryEntries = Object.entries(summaryMap).map(([key, bucket], index) => {
          const income = bucket.income || 0;
          const expense = bucket.expense || 0;
          const total = income + expense;
          const label = transactionService.resolveCategoryLabel(key);
          const tips = [];
          if (income) tips.push(`收入 ${income}`);
          if (expense) tips.push(`支出 ${expense}`);
          return {
            label,
            value: total || income || expense || 0.0001,
            tip: tips.join(" | ") || "暂无数据",
            color: palette[index % palette.length]
          };
        }).filter((item) => item.value > 0);
        const cardPayload = {
          title: ownerLabel === "你" ? "你的账单" : `${ownerLabel}的账单`,
          subtitle: new Date().toLocaleString("zh-CN", { hour12: false }),
          filterText: filters.join(" · "),
          entries: detailEntries,
          summary: summaryEntries,
          totalIncome,
          totalExpense
        };
        const card = await renderBillCard(ctx, cardPayload, session);
        return await respond(card);
      });
  }

  return { registerInfoCommands };
}

module.exports = { createInfoModule };
