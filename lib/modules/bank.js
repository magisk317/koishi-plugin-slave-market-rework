const { ensureSufficientBalance, calculateFinancialFee, creditSystemAccount } = require("../utils/economy");
const { isWealthProtected, invalidateWealthCache } = require("../utils/wealthProtection");

function createBankModule(deps) {
  const {
    getUser3,
    accrueLoanInterest,
    calculateLoanLimit,
    formatCostTip,
    isAdmin,
    setupMessageRecall,
    checkTaxBeforeCommand,
    registrationGuide,
    resolveTargetUser,
    transactionService,
    shopEffects
  } = deps;
  const applyTaxWaiverHelper = shopEffects?.applyTaxWaiver
    ? shopEffects.applyTaxWaiver
    : async (ctx, session, user, fee) => ({ amount: fee, waived: false, tip: "" });

  const sanitizeAmount = (input) => {
    const value = Math.floor(Number(input));
    if (!Number.isFinite(value)) return null;
    return value;
  };
  async function applyBankPenalty(ctx, session, user, penaltyAmount, options = {}) {
    const updates = options.extraUpdates || {};
    const totalBalance = Math.max(0, user.balance ?? 0);
    const totalDeposit = Math.max(0, user.deposit ?? 0);
    let remaining = Math.max(0, penaltyAmount);
    let deductedBalance = 0;
    let deductedDeposit = 0;
    if (remaining > 0 && totalBalance > 0) {
      deductedBalance = Math.min(totalBalance, remaining);
      remaining -= deductedBalance;
    }
    if (remaining > 0 && totalDeposit > 0) {
      deductedDeposit = Math.min(totalDeposit, remaining);
      remaining -= deductedDeposit;
    }
    const newBalance = totalBalance - deductedBalance;
    const newDeposit = totalDeposit - deductedDeposit;
    const shortfall = remaining;
    const payload = {
      balance: newBalance,
      deposit: newDeposit,
      ...updates
    };
    if (Number.isFinite(options.nextPenaltyLevel)) {
      payload.depositPenaltyLevel = options.nextPenaltyLevel;
      user.depositPenaltyLevel = options.nextPenaltyLevel;
    }
    if (Number.isFinite(options.nextOverdraftLevel)) {
      payload.depositOverdraftPenaltyLevel = options.nextOverdraftLevel;
      user.depositOverdraftPenaltyLevel = options.nextOverdraftLevel;
    }
    if (shortfall > 0) {
      payload.balance = newBalance - shortfall;
      payload.deposit = 0;
    }
    await ctx.database.set("player_market_users", { userId: user.userId }, payload);
    user.balance = payload.balance;
    user.deposit = payload.deposit;
    await transactionService?.logTransaction(ctx, { ...user, balance: payload.balance, deposit: payload.deposit }, {
      direction: "expense",
      category: transactionService?.categories.BANK_PENALTY,
      amount: penaltyAmount,
      description: options.description || "银行罚金",
      balanceAfter: payload.balance,
      metadata: { reason: options.reason || "deposit_violation" }
    });
    await creditSystemAccount(ctx, penaltyAmount);
    invalidateWealthCache(session);
    return { applied: penaltyAmount, shortfall };
  }
  async function handleInvalidDepositInput(ctx, session, user, options = {}) {
    const level = user.depositPenaltyLevel ?? 0;
    const streak = (user.depositInvalidStreak ?? 0) + 1;
    const penalty = 100 * Math.pow(2, level);
    const extraUpdates = { depositInvalidStreak: streak };
    let banTip = "";
    if (streak >= 3) {
      extraUpdates.commandBanned = true;
      extraUpdates.commandBanReason = "恶意存款输入";
      banTip = "\n🚫 检测到多次恶意操作，你已被拉黑，不再接受任何命令。";
    }
    const { applied, shortfall } = await applyBankPenalty(ctx, session, user, penalty, {
      extraUpdates,
      nextPenaltyLevel: level + 1,
      description: options.description || "非法存款罚金",
      reason: options.reason || "invalid_deposit"
    });
    const shortfallTip = shortfall > 0 ? "（余额不足，已扣至身无分文）" : "";
    const label = options.actionLabel || "存款";
    return `⚠️ ${label}必须填写正整数，请不要恶意尝试！本次罚款${applied}金币${shortfallTip}，下次罚款翻倍。${banTip}`;
  }
  async function handleOverdraftAttempt(ctx, session, user, targetAmount, options = {}) {
    const level = user.depositOverdraftPenaltyLevel ?? 0;
    if (!level) {
      await ctx.database.set("player_market_users", { userId: user.userId }, {
        depositOverdraftPenaltyLevel: 1
      });
      user.depositOverdraftPenaltyLevel = 1;
      return `⚠️ 存款金额不能超过当前余额（${user.balance}金币）。本次仅警告，请核实后再存，下次违规将罚款。`;
    }
    const penalty = 200 * Math.pow(2, Math.max(0, level - 1));
    const { applied, shortfall } = await applyBankPenalty(ctx, session, user, penalty, {
      nextOverdraftLevel: level + 1,
      description: options.description || "超额存款罚金",
      reason: options.reason || "overdraft_deposit"
    });
    const shortfallTip = shortfall > 0 ? "（余额不足，已扣至身无分文）" : "";
    const label = options.actionLabel || "存款";
    return `⚠️ ${label}金额【${targetAmount}】超出可用余额，属于违规操作！本次罚款${applied}金币${shortfallTip}，罚款金额将继续翻倍。`;
  }

  async function deposit(ctx, config, session, rawAmount) {
    const user = await getUser3(ctx, session.userId, session);
    if (typeof user === "string") return user;
    const amount = sanitizeAmount(rawAmount);
    if (!amount || amount <= 0) {
      return await handleInvalidDepositInput(ctx, session, user);
    }
    const privileged = isAdmin(ctx, config, user.userId, session);
    const wealthProtected = await isWealthProtected(ctx, session, user);
    let fee = privileged ? 0 : Math.min(amount, calculateFinancialFee(config, amount, user, { wealthProtected }));
    let waiverTip = "";
    if (!privileged && fee > 0) {
      const waiver = await applyTaxWaiverHelper(ctx, session, user, fee, { label: "存款手续费" });
      fee = waiver.amount;
      waiverTip = waiver.tip;
    }
    const actualDeposit = amount - fee;
    if (user.depositInvalidStreak) {
      await ctx.database.set("player_market_users", { userId: user.userId }, { depositInvalidStreak: 0 });
      user.depositInvalidStreak = 0;
    }
    if (!privileged && actualDeposit <= 0) {
      return "💸 手续费把这点零钱全吞了，存点更大的数字再来。";
    }
    if (!privileged && user.balance < amount) {
      return await handleOverdraftAttempt(ctx, session, user, amount);
    }
    if (user.deposit + actualDeposit > user.depositLimit) {
      return `🧱 保险柜塞不下了，上限只有${user.depositLimit}金币。`;
    }
    const updatedBalance = Math.floor(user.balance - amount);
    const updatedDeposit = Math.floor(user.deposit + actualDeposit);
    await ctx.database.set("player_market_users", { userId: user.userId }, {
      balance: updatedBalance,
      deposit: updatedDeposit
    });
    await transactionService?.logTransaction(ctx, { ...user, balance: updatedBalance, deposit: updatedDeposit }, {
      direction: "expense",
      category: transactionService?.categories.BANK_DEPOSIT,
      amount,
      description: `存入 ${actualDeposit} 金币`,
      balanceAfter: updatedBalance
    });
    if (!privileged && fee > 0) {
      await creditSystemAccount(ctx, fee);
      await ctx.taxService?.recordTax(session, fee);
    }
    invalidateWealthCache(session);
    const feeTip = privileged || fee <= 0 ? "" : `\n💸 手续费：${fee}金币（已内扣）`;
    return `存款成功！本次实际存入${actualDeposit}金币，当前存款${Math.floor(user.deposit + actualDeposit)}，余额${Math.floor(user.balance - amount)}${feeTip}${waiverTip}`;
  }

  async function withdraw(ctx, config, session, rawAmount) {
    const user = await getUser3(ctx, session.userId, session);
    if (typeof user === "string") return user;
    const desiredPayout = sanitizeAmount(rawAmount);
    if (!desiredPayout || desiredPayout <= 0) return "💤 想取钱先填个正数，别逗柜员玩。";
    const privileged = isAdmin(ctx, config, user.userId, session);
    const wealthProtected = await isWealthProtected(ctx, session, user);
    let fee = privileged ? 0 : Math.min(desiredPayout, calculateFinancialFee(config, desiredPayout, user, { wealthProtected }));
    let waiverTip = "";
    if (!privileged && fee > 0) {
      const waiver = await applyTaxWaiverHelper(ctx, session, user, fee, { label: "取款手续费" });
      fee = waiver.amount;
      waiverTip = waiver.tip;
    }
    const totalDeduction = desiredPayout + fee;
    if (user.deposit < totalDeduction) {
      return `🪙 你的存款只有${user.deposit}，想取${desiredPayout}还得再补${totalDeduction - user.deposit}，真是想得美。`;
    }
    const updatedBalance = Math.floor(user.balance + desiredPayout);
    const updatedDeposit = Math.floor(user.deposit - totalDeduction);
    await ctx.database.set("player_market_users", { userId: user.userId }, {
      balance: updatedBalance,
      deposit: updatedDeposit
    });
    await transactionService?.logTransaction(ctx, { ...user, balance: updatedBalance, deposit: updatedDeposit }, {
      direction: "income",
      category: transactionService?.categories.BANK_WITHDRAW,
      amount: desiredPayout,
      description: `取出 ${desiredPayout} 金币`,
      balanceAfter: updatedBalance
    });
    if (!privileged && fee > 0) {
      await creditSystemAccount(ctx, fee);
      await ctx.taxService?.recordTax(session, fee);
    }
    invalidateWealthCache(session);
    const feeTip = privileged || fee <= 0 ? "" : `\n💸 手续费：${fee}金币`;
    return `取款成功！到账 ${desiredPayout} 金币，银行扣款共 ${totalDeduction} 金币（含手续费）\n当前存款${updatedDeposit}，余额${updatedBalance}${feeTip}${waiverTip}`;
  }

  async function claimInterest(ctx, config, session) {
    const user = await getUser3(ctx, session.userId, session);
    if (typeof user === "string") return user;
    const now = Date.now();
    const hours = Math.min((now - user.lastInterestTime) / (1e3 * 60 * 60), config.利息最大时间);
    const interest = Math.floor(user.deposit * config.存款利率 * hours);
    if (interest <= 0) return "😴 利息还在睡觉，等它翻身再来吧";
    const [system] = await ctx.database.get("slave_market_system", {});
    if (!system) return "🤖 银行后台罢工了，请稍后再摸利息";
    if (system.balance < interest) return "🏛️ 国库都吃土了，利息暂时发不出来";
    const updatedBalance = user.balance + interest;
    await ctx.database.set("player_market_users", { userId: user.userId }, {
      balance: updatedBalance,
      lastInterestTime: now
    });
    await transactionService?.logTransaction(ctx, { ...user, balance: updatedBalance }, {
      direction: "income",
      category: transactionService?.categories.BANK_INTEREST,
      amount: interest,
      description: "领取存款利息",
      balanceAfter: updatedBalance
    });
    await ctx.database.set("slave_market_system", {}, {
      balance: system.balance - interest
    });
    return `领取利息成功！获得${interest}`;
  }

  async function bankInfo(ctx, config, session) {
    let user = await getUser3(ctx, session.userId, session);
    if (typeof user === "string") return user;
    user = await accrueLoanInterest(ctx, config, user);
    const now = Date.now();
    const hours = Math.min((now - user.lastInterestTime) / (1e3 * 60 * 60), config.利息最大时间);
    const currentInterest = Math.floor(user.deposit * config.存款利率 * hours);
    const upgradeFee = Math.floor(user.depositLimit * config.信用升级费用);
    const loanLimit = calculateLoanLimit(user, config);
    const loanBalance = user.loanBalance ?? 0;
    const availableLoan = Math.max(0, loanLimit - loanBalance);
    const loanRate = (config.贷款系统?.利率 ?? 0.02) * 100;
    const loanFee = config.贷款系统?.手续费 ?? 100;
    return `=== 银行账户信息 ===\n🏅 财富等级：${user.creditLevel}\n存款上限：${user.depositLimit}\n当前存款：${user.deposit}\n当前余额：${user.balance}\n当前利息：${currentInterest}\n存款利率：${config.存款利率 * 100}%/小时\n升级费用：${upgradeFee}\n📊 信用等级：${user.loanCreditLevel ?? 1}\n💳 当前贷款：${loanBalance}\n💶 可贷款额度：${loanLimit}（剩余额度：${availableLoan}）\n📈 贷款利率：${loanRate.toFixed(2)}%/小时\n💰 贷款手续费：${loanFee}金币/次\n利息说明：利息最多累计${config.利息最大时间}小时`;
  }

  async function upgradeCredit(ctx, config, session) {
    let user = await getUser3(ctx, session.userId, session);
    if (typeof user === "string") return user;
    const upgradeFee = Math.floor(user.depositLimit * config.信用升级费用);
    const privileged = isAdmin(ctx, config, user.userId, session);
    let autoWithdrawNotice = "";
    if (!privileged) {
      const cover = await ensureSufficientBalance(ctx, user, upgradeFee, { privileged });
      user = cover.user;
      autoWithdrawNotice = cover.notice;
    }
    if (!privileged && user.balance < upgradeFee) {
      const notice = autoWithdrawNotice ? `\n${autoWithdrawNotice}` : "";
      return `📉 想升财富等级至少得${upgradeFee}金币，你的钱包只有${user.balance}，先努力搬砖吧${notice}`;
    }
    const [system] = await ctx.database.get("slave_market_system", {});
    if (!system) return "🤖 银行后台罢工了，请稍后再试";
    const newLimit = Math.floor(user.depositLimit * 1.5);
    const balanceAfter = privileged ? user.balance : user.balance - upgradeFee;
    await ctx.database.set("player_market_users", { userId: user.userId }, {
      balance: balanceAfter,
      creditLevel: user.creditLevel + 1,
      depositLimit: newLimit
    });
    if (!privileged && upgradeFee > 0) {
      await transactionService?.logTransaction(ctx, { ...user, balance: balanceAfter }, {
        direction: "expense",
        category: transactionService?.categories.CREDIT_UPGRADE,
        amount: upgradeFee,
        description: "提升财富等级",
        balanceAfter
      });
    }
    if (!privileged) {
      await ctx.database.set("slave_market_system", {}, {
        balance: system.balance + upgradeFee
      });
    }
    const notice = autoWithdrawNotice ? `\n${autoWithdrawNotice}` : "";
    return `升级成功！财富等级提升至${user.creditLevel + 1}，存款上限提升至${newLimit}\n💰 花费：${formatCostTip(privileged, upgradeFee)}${notice}`;
  }

  async function applyLoan(ctx, config, session, rawAmount) {
    let user = await getUser3(ctx, session.userId, session);
    if (typeof user === "string") return user;
    const amount = sanitizeAmount(rawAmount);
    if (!amount || amount <= 0) {
      return await handleInvalidDepositInput(ctx, session, user, {
        actionLabel: "贷款",
        description: "非法贷款罚金",
        reason: "invalid_loan"
      });
    }
    user = await accrueLoanInterest(ctx, config, user);
    const limit = calculateLoanLimit(user, config);
    const currentLoan = user.loanBalance ?? 0;
    const available = Math.max(0, limit - currentLoan);
    if (amount > available) {
      const penaltyMessage = await handleOverdraftAttempt(ctx, session, user, amount, {
        actionLabel: "贷款",
        description: "超额贷款罚金",
        reason: "overdraft_loan"
      });
      return `${penaltyMessage}\n💥 当前可用额度：${available}金币`;
    }
    const loanConfig = config.贷款系统 ?? {};
    const privileged = isAdmin(ctx, config, user.userId, session);
    const fee = Math.max(0, loanConfig.手续费 ?? 100);
    if (!privileged && fee > 0 && amount <= fee) {
      return `🧮 贷款连手续费${fee}都不够，拿点像样的数字再来谈`;
    }
    let system;
    if (!privileged && fee > 0) {
      [system] = await ctx.database.get("slave_market_system", {});
      if (!system) return "🤖 银行后台罢工了，请稍后再试";
    }
    const netAmount = amount - (!privileged ? fee : 0);
    const balanceAfter = user.balance + netAmount;
    await ctx.database.set("player_market_users", { userId: user.userId }, {
      balance: balanceAfter,
      loanBalance: currentLoan + amount,
      lastLoanInterestTime: Date.now()
    });
    if (netAmount > 0) {
      await transactionService?.logTransaction(ctx, { ...user, balance: balanceAfter }, {
        direction: "income",
        category: transactionService?.categories.LOAN_RECEIVE,
        amount: netAmount,
        description: `贷款到账 ${amount} 金币`,
        balanceAfter
      });
    }
    if (!privileged && fee > 0) {
      await ctx.database.set("slave_market_system", {}, {
        balance: system.balance + fee
      });
    }
    const limitTip = `剩余额度：${limit - (currentLoan + amount)}`;
    const feeTip = privileged || fee <= 0 ? "" : `\n💸 手续费：${fee}金币`;
    const netTip = privileged ? "" : `\n实际到账：${netAmount}金币`;
    return `✅ 贷款成功！本次贷款${amount}金币${feeTip}${netTip}\n当前贷款余额：${currentLoan + amount}\n${limitTip}`;
  }

  async function repayLoan(ctx, config, session, rawAmount) {
    let user = await getUser3(ctx, session.userId, session);
    if (typeof user === "string") return user;
    const amount = sanitizeAmount(rawAmount);
    if (!amount || amount <= 0) return "💸 还款数额得大于0，不要用爱感化银行";
    user = await accrueLoanInterest(ctx, config, user);
    const currentLoan = user.loanBalance ?? 0;
    if (currentLoan <= 0) return "✅ 当前没有未偿还贷款";
    const repayValue = Math.min(amount, currentLoan);
    const privileged = isAdmin(ctx, config, user.userId, session);
    let autoWithdrawNotice = "";
    if (!privileged) {
      const cover = await ensureSufficientBalance(ctx, user, repayValue, { privileged });
      user = cover.user;
      autoWithdrawNotice = cover.notice;
    }
    if (!privileged && user.balance < repayValue) {
      const notice = autoWithdrawNotice ? `\n${autoWithdrawNotice}` : "";
      return `🪙 口袋里连${repayValue}金币都摸不到，先去赚钱吧${notice}`;
    }
    const balanceAfter = privileged ? user.balance : user.balance - repayValue;
    await ctx.database.set("player_market_users", { userId: user.userId }, {
      balance: balanceAfter,
      loanBalance: currentLoan - repayValue,
      lastLoanInterestTime: Date.now()
    });
    if (!privileged && repayValue > 0) {
      await transactionService?.logTransaction(ctx, { ...user, balance: balanceAfter }, {
        direction: "expense",
        category: transactionService?.categories.LOAN_REPAY,
        amount: repayValue,
        description: "偿还贷款",
        balanceAfter
      });
    }
    const notice = autoWithdrawNotice ? `\n${autoWithdrawNotice}` : "";
    return `✅ 还款成功！\n支付：${formatCostTip(privileged, repayValue)}\n剩余贷款：${currentLoan - repayValue}${notice}`;
  }

  async function transfer(ctx, config, session, target, rawAmount) {
    const privileged = isAdmin(ctx, config, session.userId, session);
    if (!privileged) return "❌ 只有管理员可以使用转账指令";

    let sender = await getUser3(ctx, session.userId, session);
    if (typeof sender === "string") return sender;
    const receiver = await getUser3(ctx, target, session);
    if (typeof receiver === "string") return receiver;

    const amount = sanitizeAmount(rawAmount);
    // Removed amount check as requested. Admins can transfer 0 or negative (if sanitizeAmount allows).

    const now = Date.now();
    const receiverBalance = receiver.balance + amount;

    await ctx.database.set("player_market_users", { userId: receiver.userId }, {
      balance: receiverBalance
    });

    // Admin transfer doesn't deduct from sender, just logs it.
    // Optionally update sender's lastTransferTime if we want to track activity, but cooldowns are removed.

    await transactionService?.logTransaction(ctx, { ...receiver, balance: receiverBalance }, {
      direction: "income",
      category: transactionService?.categories.TRANSFER_IN,
      amount,
      description: `来自管理员 ${sender.nickname} 的转账`,
      balanceAfter: receiverBalance,
      relatedUserId: sender.userId
    });

    return `✅ 已向${receiver.nickname}转账${amount}金币`;
  }

  function registerBankCommands(ctx, config) {
    const slaveCommand = ctx.command("大牛马时代");

    slaveCommand.subcommand("存款 <amount:number>", "将余额存入银行获取利息")
      .alias("存钱")
      .alias("银行存款")
      .alias("银行存钱")
      .action(async ({ session }, amount) => {
        const respond = setupMessageRecall(session, ctx, config, "general");
        const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
        if (taxCheck) return await respond(taxCheck);
        return await respond(await deposit(ctx, config, session, amount));
      });

    slaveCommand.subcommand("取款 <amount:number>", "从银行取出存款")
      .alias("取钱")
      .alias("提款")
      .alias("提现")
      .action(async ({ session }, amount) => {
        const respond = setupMessageRecall(session, ctx, config, "general");
        const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
        if (taxCheck) return await respond(taxCheck);
        if (!amount || amount <= 0) {
          return await respond("💬 想取多少钱请讲清楚，别打一堆零");
        }
        return await respond(await withdraw(ctx, config, session, amount));
      });

    slaveCommand.subcommand("领取利息", "领取银行存款产生的利息")
      .alias("领利息")
      .alias("收利息")
      .action(async ({ session }) => {
        const respond = setupMessageRecall(session, ctx, config, "general");
        const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
        if (taxCheck) return await respond(taxCheck);
        return await respond(await claimInterest(ctx, config, session));
      });

    slaveCommand.subcommand("银行信息", "查看银行账户详细信息")
      .alias("银行状态")
      .alias("银行余额")
      .action(async ({ session }) => {
        const respond = setupMessageRecall(session, ctx, config, "general");
        const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
        if (taxCheck) return await respond(taxCheck);
        return await respond(await bankInfo(ctx, config, session));
      });

    slaveCommand.subcommand("提升财富等级", "提升财富等级以增加存款上限").action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
      if (taxCheck) return await respond(taxCheck);
      const result = await upgradeCredit(ctx, config, session);
      return await respond(result ?? registrationGuide());
    });

    slaveCommand.subcommand("贷款 <amount:number>", "申请贷款，额度与信用等级挂钩").action(async ({ session }, amount) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
      if (taxCheck) return await respond(taxCheck);
      if (!amount || amount <= 0) {
        return await respond("💬 贷款金额至少得大于0，别交白卷");
      }
      return await respond(await applyLoan(ctx, config, session, amount));
    });

    slaveCommand
      .subcommand("还款 <amount:number>", "偿还贷款并降低负债")
      .alias("还钱")
      .alias("还贷")
      .alias("还贷款")
      .action(async ({ session }, amount) => {
        const respond = setupMessageRecall(session, ctx, config, "general");
        const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
        if (taxCheck) return await respond(taxCheck);
        if (!amount || amount <= 0) {
          return await respond("💬 还款金额要写正数，不要糊弄系统");
        }
        return await respond(await repayLoan(ctx, config, session, amount));
      });

    slaveCommand.subcommand("转账 <target:string> <amount:number>", "【管理员】向指定用户转账（增发）").action(async ({ session }, target, amount) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
      if (taxCheck) return await respond(taxCheck);
      if (!amount || amount <= 0) {
        return await respond("💬 转账金额得像样点，别拿空气打包");
      }
      const targetUser = await resolveTargetUser(ctx, session, target);
      if (!targetUser) {
        return await respond("🔍 没找到这个人，@一下或者把昵称打准");
      }
      if (targetUser.userId === session.userId) {
        return await respond("🤦 自己转给自己？省省吧");
      }
      return await respond(await transfer(ctx, config, session, targetUser.userId, amount));
    });
  }

  return {
    deposit,
    withdraw,
    claimInterest,
    bankInfo,
    upgradeCredit,
    applyLoan,
    repayLoan,
    transfer,
    registerBankCommands,
  };
}

module.exports = { createBankModule };
