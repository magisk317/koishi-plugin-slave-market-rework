const { ensureSufficientBalance, calculateFinancialFee, creditSystemAccount } = require("../utils/economy");

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
  } = deps;

  const sanitizeAmount = (input) => {
    const value = Math.floor(Number(input));
    if (!Number.isFinite(value)) return null;
    return value;
  };

  async function deposit(ctx, config, session, rawAmount) {
    const user = await getUser3(ctx, session.userId, session);
    if (typeof user === "string") return user;
    const amount = sanitizeAmount(rawAmount);
    if (!amount || amount <= 0) return "💤 金额至少得大于0，别把银行当垃圾桶乱塞。";
    const privileged = isAdmin(ctx, config, user.userId, session);
    const fee = privileged ? 0 : calculateFinancialFee(config, amount);
    const totalCost = privileged ? amount : amount + fee;
    if (!privileged && user.balance < totalCost) {
      return `🙃 想存${totalCost}金币（含手续费${fee}），可你身上只有${user.balance}，先把钱包填满吧。`;
    }
    if (user.deposit + amount > user.depositLimit) {
      return `🧱 保险柜塞不下了，上限只有${user.depositLimit}金币。`;
    }
    await ctx.database.set("player_market_users", { userId: user.userId }, {
      balance: Math.floor(user.balance - totalCost),
      deposit: Math.floor(user.deposit + amount)
    });
    if (!privileged && fee > 0) {
      await creditSystemAccount(ctx, fee);
    }
    const feeTip = privileged || fee <= 0 ? "" : `\n💸 手续费：${fee}金币`;
    return `存款成功！当前存款${Math.floor(user.deposit + amount)}，余额${Math.floor(user.balance - totalCost)}${feeTip}`;
  }

  async function withdraw(ctx, config, session, rawAmount) {
    const user = await getUser3(ctx, session.userId, session);
    if (typeof user === "string") return user;
    const amount = sanitizeAmount(rawAmount);
    if (!amount || amount <= 0) return "💤 想取钱先填个正数，别逗柜员玩。";
    if (user.deposit < amount) return `🪙 你的存款只有${user.deposit}，想取${amount}真是想得美。`;
    const privileged = isAdmin(ctx, config, user.userId, session);
    const fee = privileged ? 0 : Math.min(amount, calculateFinancialFee(config, amount));
    const payout = amount - fee;
    await ctx.database.set("player_market_users", { userId: user.userId }, {
      balance: Math.floor(user.balance + payout),
      deposit: Math.floor(user.deposit - amount)
    });
    if (!privileged && fee > 0) {
      await creditSystemAccount(ctx, fee);
    }
    const feeTip = privileged || fee <= 0 ? "" : `\n💸 手续费：${fee}金币`;
    return `取款成功！当前存款${Math.floor(user.deposit - amount)}，余额${Math.floor(user.balance + payout)}${feeTip}`;
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
    await ctx.database.set("player_market_users", { userId: user.userId }, {
      balance: user.balance + interest,
      lastInterestTime: now
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
    await ctx.database.set("player_market_users", { userId: user.userId }, {
      balance: privileged ? user.balance : user.balance - upgradeFee,
      creditLevel: user.creditLevel + 1,
      depositLimit: newLimit
    });
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
    if (!amount || amount <= 0) return "🙄 贷款金额得是正数，别填个空气来忽悠银行";
    user = await accrueLoanInterest(ctx, config, user);
    const limit = calculateLoanLimit(user, config);
    const currentLoan = user.loanBalance ?? 0;
    const available = Math.max(0, limit - currentLoan);
    if (amount > available) {
      return `💥 额度爆表！你还能贷${available}金币，再贪心系统就报警了`;
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
    await ctx.database.set("player_market_users", { userId: user.userId }, {
      balance: user.balance + netAmount,
      loanBalance: currentLoan + amount,
      lastLoanInterestTime: Date.now()
    });
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
    await ctx.database.set("player_market_users", { userId: user.userId }, {
      balance: privileged ? user.balance : user.balance - repayValue,
      loanBalance: currentLoan - repayValue,
      lastLoanInterestTime: Date.now()
    });
    const notice = autoWithdrawNotice ? `\n${autoWithdrawNotice}` : "";
    return `✅ 还款成功！\n支付：${formatCostTip(privileged, repayValue)}\n剩余贷款：${currentLoan - repayValue}${notice}`;
  }

  async function transfer(ctx, config, session, target, rawAmount) {
    let sender = await getUser3(ctx, session.userId, session);
    if (typeof sender === "string") return sender;
    const receiver = await getUser3(ctx, target, session);
    if (typeof receiver === "string") return receiver;
    if (receiver.userId === sender.userId) return "🤦 别自导自演了，不能给自己转账";
    const now = Date.now();
    const privileged = isAdmin(ctx, config, sender.userId, session);
    if (!privileged && now - sender.lastTransferTime < config.转账冷却) {
      const remainingTime = Math.ceil((config.转账冷却 - (now - sender.lastTransferTime)) / 1e3 / 60);
      return `🕒 银行刚忙完你的上一单，再等${remainingTime}分钟别催柜员`;
    }
    const amount = sanitizeAmount(rawAmount);
    if (!amount || amount <= 0) return "💸 想转账先填个正数，别递空信封";
    let autoWithdrawNotice = "";
    if (!privileged) {
      const cover = await ensureSufficientBalance(ctx, sender, amount, { privileged });
      sender = cover.user;
      autoWithdrawNotice = cover.notice;
    }
    if (!privileged && sender.balance < amount) {
      const notice = autoWithdrawNotice ? `\n${autoWithdrawNotice}` : "";
      return `😅 想转${amount}金币，可你余额只有${sender.balance}，还是先攒点吧${notice}`;
    }
    if (privileged) {
      await ctx.database.set("player_market_users", { userId: receiver.userId }, {
        balance: receiver.balance + amount
      });
      await ctx.database.set("player_market_users", { userId: sender.userId }, {
        lastTransferTime: now
      });
      return `✅ 已向${receiver.nickname}转账${amount}金币`;
    }
    const fee = Math.floor(amount * config.转账手续费);
    const [system] = await ctx.database.get("slave_market_system", {});
    if (!system) return "系统错误";
    await ctx.database.set("player_market_users", { userId: sender.userId }, {
      balance: sender.balance - amount,
      lastTransferTime: now
    });
    await ctx.database.set("player_market_users", { userId: receiver.userId }, {
      balance: receiver.balance + (amount - fee)
    });
    await ctx.database.set("slave_market_system", {}, {
      balance: system.balance + fee
    });
    const notice = autoWithdrawNotice ? `\n${autoWithdrawNotice}` : "";
    return `转账成功！转账${amount}，手续费${fee}${notice}`;
  }

  function registerBankCommands(ctx, config) {
    const slaveCommand = ctx.command("大牛马时代");

    slaveCommand.subcommand("存款 <amount:number>", "将余额存入银行获取利息").action(async ({ session }, amount) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
      if (taxCheck) return await respond(taxCheck);
      if (!amount || amount <= 0) {
        return await respond("💬 存款金额得是正数，别敷衍柜台");
      }
      return await respond(await deposit(ctx, config, session, amount));
    });

    slaveCommand.subcommand("取款 <amount:number>", "从银行取出存款").action(async ({ session }, amount) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
      if (taxCheck) return await respond(taxCheck);
      if (!amount || amount <= 0) {
        return await respond("💬 想取多少钱请讲清楚，别打一堆零");
      }
      return await respond(await withdraw(ctx, config, session, amount));
    });

    slaveCommand.subcommand("领取利息", "领取银行存款产生的利息").action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
      if (taxCheck) return await respond(taxCheck);
      return await respond(await claimInterest(ctx, config, session));
    });

    slaveCommand.subcommand("银行信息", "查看银行账户详细信息").action(async ({ session }) => {
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

    slaveCommand.subcommand("转账 <target:string> <amount:number>", "向指定用户转账").action(async ({ session }, target, amount) => {
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
