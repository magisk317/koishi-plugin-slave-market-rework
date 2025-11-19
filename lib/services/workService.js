function createWorkService(deps) {
  const { getUser, registrationGuide, transactionService, shopEffects } = deps;
  const applyIncomeBoost = shopEffects?.applyIncomeBoost
    ? shopEffects.applyIncomeBoost
    : async (ctx, user, amount) => ({ amount, active: false, multiplier: 1, expiresAt: 0 });

  async function work(ctx, config, session) {
    const user = await getUser(ctx, session.userId, session);
    if (!user) {
      return registrationGuide();
    }
    const now = Date.now();
    if (now - user.lastWorkTime < config.打工冷却) {
      const remainingTime = Math.ceil((config.打工冷却 - (now - user.lastWorkTime)) / 1e3 / 60);
      return `打工CD中，还需要等待${remainingTime}分钟`;
    }
    const range = config?.打工收入范围 || {};
    const minIncome = Number(range.最低);
    const maxIncome = Number(range.最高);
    let baseIncome;
    if (Number.isFinite(minIncome) && Number.isFinite(maxIncome) && maxIncome >= minIncome && minIncome > 0) {
      const span = maxIncome - minIncome + 1;
      baseIncome = Math.floor(Math.random() * span) + minIncome;
    } else {
      baseIncome = Math.floor(user.price * config.打工基础收入);
    }
    baseIncome = Math.max(1, baseIncome);
    const weatherStatus = ctx.weatherService.getWeatherStatus();
    const weatherRate = ctx.weatherService.getWorkIncomeRate();
    const income = Math.floor(baseIncome * weatherRate);
    const boostInfo = await applyIncomeBoost(ctx, user, income, { source: "work" });
    const finalIncome = boostInfo?.amount ?? income;
    const employerShare = user.employer ? Math.floor(finalIncome * config.牛马主加成) : 0;
    const updatedBalance = user.balance + finalIncome;
    await ctx.database.set("player_market_users", { userId: user.userId }, {
      balance: updatedBalance,
      lastWorkTime: now
    });
    user.balance = updatedBalance;
    user.lastWorkTime = now;
    await transactionService?.logTransaction(ctx, { ...user }, {
      direction: "income",
      category: transactionService?.categories.WORK,
      amount: finalIncome,
      description: `打工收入（${weatherStatus.weatherEffect.name}）`,
      balanceAfter: updatedBalance
    });
    if (user.employer) {
      const employer = await getUser(ctx, user.employer, session);
      if (employer) {
        const employerBalance = employer.balance + employerShare;
        await ctx.database.set("player_market_users", { userId: user.employer }, {
          balance: employerBalance
        });
        employer.balance = employerBalance;
        await transactionService?.logTransaction(ctx, { ...employer }, {
          direction: "income",
          category: transactionService?.categories.EMPLOYER_SHARE,
          amount: employerShare,
          description: `${user.nickname} 打工分成`,
          balanceAfter: employerBalance,
          relatedUserId: user.userId
        });
      }
    }
    const boostTip = boostInfo?.active ? `\n🔥 收益翻倍卡生效：收益x${boostInfo.multiplier}` : "";
    return `✅ 打工成功！
💰 基础收入：${baseIncome}金币
🌤️ 天气加成：${weatherStatus.weatherEffect.name}（${(weatherRate * 100).toFixed(0)}%）
💰 最终收入：${finalIncome}金币${user.employer ? `
👑 牛马主分成：${employerShare}金币` : ""}${boostTip}`;
  }

  return { work };
}

module.exports = { createWorkService };
